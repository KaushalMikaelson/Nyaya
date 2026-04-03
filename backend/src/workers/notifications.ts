// @ts-nocheck
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import nodemailer from 'nodemailer';
import twilio from 'twilio';

// Initialize Redis connection
// If redis is not available locally, this might throw errors. We handle it gracefully for dev.
const connection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    // Stop retrying if there is no redis server to prevent console spam
    if (times > 3) return null;
    return Math.min(times * 50, 2000);
  }
});

connection.on('error', (err) => {
  console.warn("⚠️ Redis connection failed. BullMQ Notifications will be mocked/disabled. Please ensure Redis is running.");
});

// Setup Queue
export const notificationQueue = new Queue('notifications', { connection });

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

// Setup Worker
const notificationWorker = new Worker('notifications', async (job) => {
  const { type, payload } = job.data;
  
  if (type === 'email') {
    const { to, subject, body } = payload;
    console.log(`[BullMQ] Executing Email Job to ${to}...`);
    try {
      if (process.env.SMTP_HOST) {
        await transporter.sendMail({ from: '"Nyaay AI" <alerts@nyaay.in>', to, subject, text: body });
      } else {
        console.log(`[Mock Email] Sent to ${to}: ${subject}`);
      }
    } catch (e) {
      console.error("[BullMQ] Email Failed:", e);
    }
  }
  
  if (type === 'whatsapp') {
    const { to, message } = payload;
    console.log(`[BullMQ] Executing WhatsApp Job to ${to}...`);
    try {
      await twilioClient.messages.create({
        body: message,
        from: 'whatsapp:+14155238886', // Twilio Sandbox default
        to: `whatsapp:${to}`
      });
    } catch (e) {
      console.error("[BullMQ] WhatsApp Failed:", e);
    }
  }
}, { connection });

notificationWorker.on('completed', job => {
  console.log(`[BullMQ] Job ${job.id} completed successfully`);
});

notificationWorker.on('failed', (job, err) => {
  console.error(`[BullMQ] Job ${job?.id} failed with ${err.message}`);
});

export const scheduleFollowUp = async (userId: string, email: string, caseSnippet: string) => {
  try {
    // Add Email Task: Delayed by 3 days (mocked as 5 seconds for testing)
    await notificationQueue.add('case-reminder', {
      type: 'email',
      payload: {
        to: email,
        subject: "Follow up on your Legal Path",
        body: `Hi! Don't forget to take action on your case involving: "${caseSnippet}". Head back to Nyaay.in to draft your legal documents!`
      }
    }, { delay: 5000 }); // In Prod: 3 * 24 * 60 * 60 * 1000

    // Add WhatsApp Task
    await notificationQueue.add('case-reminder-wa', {
      type: 'whatsapp',
      payload: {
        to: "+919999999999", // Normally pulled from User DB Profile
        message: `Nyaay AI: Reminder to execute your legal action plan regarding your case: ${caseSnippet.substring(0,20)}...`
      }
    }, { delay: 6000 });
    
  } catch (err) {
    console.warn("⚠️ Failed to queue notifications (Redis missing?)");
  }
};
