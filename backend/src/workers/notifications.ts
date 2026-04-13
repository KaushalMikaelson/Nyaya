// @ts-nocheck
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import { prisma } from '../prisma';

// Mock Transports
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: 587,
  auth: {
    user: process.env.SMTP_USER || 'mocked_user',
    pass: process.env.SMTP_PASS || 'mocked_pass'
  }
});

const twilioClient = process.env.TWILIO_SID && process.env.TWILIO_AUTH_TOKEN 
  ? twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN)
  : { messages: { create: async (data: any) => console.log('Mocked Twilio WhatsApp Out:', data) } };

let realQueue = null;
let notificationWorker = null;

// Export a proxy queue that gracefully drops tasks if Redis is down
export const notificationQueue = {
  add: async (name: string, data: any, opts?: any) => {
    if (!realQueue) {
      console.warn(`[BullMQ Mock] Redis down. Dropped job '${name}'. Data:`, data);
      return null;
    }
    return realQueue.add(name, data, opts);
  }
};

(async () => {
  const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
  const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
  
  const connection = new IORedis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    maxRetriesPerRequest: null,
    retryStrategy: () => null // don't retry the initial connection check
  });

  try {
    // Silence unhandled connection errors to prevent node crashes
    connection.on('error', () => {}); 

    // Check if Redis is actually running
    await connection.ping();

    
    realQueue = new Queue('notifications', { connection });

    notificationWorker = new Worker('notifications', async (job) => {
      const { type, payload } = job.data;
      
      if (type === 'email') {
        const { to, subject, body } = payload;
        console.log(`[Notification Engine] Email Job to ${to}...`);
        try {
          if (process.env.SMTP_HOST) {
            await transporter.sendMail({ from: '"Nyaay AI" <alerts@nyaay.in>', to, subject, text: body });
          } else {
            console.log(`[Mock Email] Sent to ${to}: ${subject}`);
          }
        } catch (e) {
          console.error("[Notification Engine] Email Failed:", e);
        }
      }
      
      if (type === 'whatsapp') {
        const { to, message } = payload;
        console.log(`[Notification Engine] WhatsApp Job to ${to}...`);
        try {
          await twilioClient.messages.create({
            body: message,
            from: 'whatsapp:+14155238886', // Twilio Sandbox default
            to: `whatsapp:${to}`
          });
        } catch (e) {
          console.error("[Notification Engine] WhatsApp Failed:", e);
        }
      }

      if (type === 'whatsapp-template') {
        const { to, templateId, variables } = payload;
        console.log(`[Notification Engine] WhatsApp Template Job to ${to} (Template: ${templateId})...`);
        try {
          await twilioClient.messages.create({
            contentSid: templateId,
            contentVariables: JSON.stringify(variables),
            from: 'whatsapp:+14155238886', // Twilio verified sender
            to: `whatsapp:${to}`
          });
        } catch (e) {
          console.error("[Notification Engine] WhatsApp Template mock output:", { to, templateId, variables });
        }
      }

      if (type === 'sms') {
        const { to, message } = payload;
        console.log(`[Notification Engine] SMS Job to ${to}...`);
        try {
          await twilioClient.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER || '+1234567890',
            to: to
          });
        } catch (e) {
          console.error("[Notification Engine] SMS mock output:", { to, message });
        }
      }

      if (type === 'push') {
        const { to, title, message } = payload;
        console.log(`[Notification Engine] Push Notification Job to Device ${to}...`);
        // In real execution, this would use Firebase Admin SDK (FCM) or APNS
        console.log(`[Mock Push] Sending Push titled "${title}" to token: ${to}`);
      }
    }, { connection });

    notificationWorker.on('completed', job => {
      console.log(`[BullMQ] Job ${job.id} completed successfully`);
    });

    notificationWorker.on('failed', (job, err) => {
      console.error(`[BullMQ] Job ${job?.id} failed with ${err.message}`);
    });

  } catch (err) {
    console.warn("⚠️ Redis not detected running on localhost. BullMQ Notifications will be mocked/disabled.");
    connection.disconnect();
  }
})();

export const scheduleFollowUp = async (userId: string, email: string, caseSnippet: string) => {
  try {
    await dispatchNotification(
      userId,
      "Follow up on your Legal Path",
      `Hi! Don't forget to take action on your case involving: "${caseSnippet}". Head back to Nyaay.in to draft your legal documents!`,
      ['email', 'push'],
      { email, deviceToken: 'device_mock_token' }
    );
  } catch (err) {
    console.warn("⚠️ Failed to schedule follow-up jobs.");
  }
};

/**
 * Universal Notification Dispatcher
 * Saves notification to Prisma and queues requested external channels.
 */
export const dispatchNotification = async (
  userId: string,
  title: string,
  message: string,
  channels: ('in-app' | 'email' | 'sms' | 'whatsapp' | 'whatsapp-template' | 'push')[],
  payload: {
    email?: string;
    phone?: string;
    deviceToken?: string;
    templateId?: string;
    variables?: Record<string, string>;
    type?: string;
  }
) => {
  try {
    // 1. Save in-app notification reliably FIRST
    await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type: payload.type || 'info',
        read: false
      }
    });

    // 2. Dispatch to external queues
    if (channels.includes('email') && payload.email) {
      await notificationQueue.add('email-job', { type: 'email', payload: { to: payload.email, subject: title, body: message } });
    }
    if (channels.includes('whatsapp') && payload.phone) {
      await notificationQueue.add('whatsapp-job', { type: 'whatsapp', payload: { to: payload.phone, message } });
    }
    if (channels.includes('whatsapp-template') && payload.phone && payload.templateId) {
      await notificationQueue.add('whatsapp-template-job', {
        type: 'whatsapp-template',
        payload: { to: payload.phone, templateId: payload.templateId, variables: payload.variables }
      });
    }
    if (channels.includes('sms') && payload.phone) {
      await notificationQueue.add('sms-job', { type: 'sms', payload: { to: payload.phone, message } });
    }
    if (channels.includes('push') && payload.deviceToken) {
      await notificationQueue.add('push-job', { type: 'push', payload: { to: payload.deviceToken, title, message } });
    }
  } catch (err) {
    console.error('Failed to dispatch notification:', err);
  }
};
