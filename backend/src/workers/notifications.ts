// @ts-nocheck
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import nodemailer from 'nodemailer';
import twilio from 'twilio';

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
    // Check if Redis is actually running
    await connection.ping();
    
    // Silence subsequent unhandled connection errors to prevent node crashes
    connection.on('error', () => {}); 
    
    realQueue = new Queue('notifications', { connection });

    notificationWorker = new Worker('notifications', async (job) => {
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

  } catch (err) {
    console.warn("⚠️ Redis not detected running on localhost. BullMQ Notifications will be mocked/disabled.");
    connection.disconnect();
  }
})();

export const scheduleFollowUp = async (userId: string, email: string, caseSnippet: string) => {
  try {
    await notificationQueue.add('case-reminder', {
      type: 'email',
      payload: {
        to: email,
        subject: "Follow up on your Legal Path",
        body: `Hi! Don't forget to take action on your case involving: "${caseSnippet}". Head back to Nyaay.in to draft your legal documents!`
      }
    }, { delay: 5000 }); 

    await notificationQueue.add('case-reminder-wa', {
      type: 'whatsapp',
      payload: {
        to: "+919999999999", 
        message: `Nyaay AI: Reminder to execute your legal action plan regarding your case: ${caseSnippet.substring(0,20)}...`
      }
    }, { delay: 6000 });
  } catch (err) {
    console.warn("⚠️ Failed to schedule follow-up jobs.");
  }
};
