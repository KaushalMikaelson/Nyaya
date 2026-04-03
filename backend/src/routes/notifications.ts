import express from 'express';
import { authenticate } from '../middleware/auth';
import { notificationQueue } from '../workers/notifications';

const router = express.Router();

router.post('/trigger', authenticate, async (req, res) => {
  try {
    const { type, to, message, subject } = req.body;

    if (!type || !to || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (type === 'email') {
      await notificationQueue.add('manual-email', {
        type: 'email',
        payload: {
          to,
          subject: subject || 'New Alert from Nyaay',
          body: message
        }
      });
    } else if (type === 'whatsapp') {
      await notificationQueue.add('manual-whatsapp', {
        type: 'whatsapp',
        payload: {
          to,
          message
        }
      });
    } else {
      return res.status(400).json({ error: 'Invalid notification type' });
    }

    res.json({ message: 'Notification queued successfully' });
  } catch (error) {
    console.error('Error triggering notification:', error);
    res.status(500).json({ error: 'Failed to trigger notification' });
  }
});

// Schedule a demo follow-up job
router.post('/schedule', authenticate, async (req, res) => {
  try {
    const { toEmail, toPhone, caseSnippet, delay } = req.body;

    if (!toEmail || !toPhone) {
      return res.status(400).json({ error: 'Missing email or phone number' });
    }

    const scheduledDelay = delay || 5000;

    await notificationQueue.add('case-reminder', {
      type: 'email',
      payload: {
        to: toEmail,
        subject: "Follow up on your Legal Path",
        body: `Hi! Don't forget to take action on your case involving: "${caseSnippet || 'General Inquiry'}". Head back to Nyaay.in to draft your legal documents!`
      }
    }, { delay: scheduledDelay });

    await notificationQueue.add('case-reminder-wa', {
      type: 'whatsapp',
      payload: {
        to: toPhone,
        message: `Nyaay AI: Reminder to execute your legal action plan regarding your case: ${caseSnippet ? caseSnippet.substring(0,20) : 'General Inquiry'}...`
      }
    }, { delay: scheduledDelay + 1000 });

    res.json({ message: 'Follow-up notifications scheduled successfully' });
  } catch (error) {
    console.error('Error scheduling notification:', error);
    res.status(500).json({ error: 'Failed to schedule notification' });
  }
});

export default router;
