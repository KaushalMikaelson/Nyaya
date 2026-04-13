import express from 'express';
import { authenticate } from '../middleware/auth';
import { dispatchNotification } from '../workers/notifications';
import { prisma } from '../prisma';

const router = express.Router();

router.post('/trigger', authenticate, async (req, res) => {
  try {
    const { type, to, message, subject, templateId, variables } = req.body;

    if (!type || !to || (!message && type !== 'whatsapp-template')) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const payload: any = { type: 'alert' };
    if (type === 'email') payload.email = to;
    else if (type === 'push') payload.deviceToken = to;
    else payload.phone = to;

    if (templateId) payload.templateId = templateId;
    if (variables) payload.variables = variables;

    await dispatchNotification(
      req.user!.userId,
      subject || 'Test Alert from Platform',
      message || 'Template message body',
      ['in-app', type as any],
      payload
    );

    res.json({ message: `Notification queued for channel: ${type}` });
  } catch (error) {
    console.error('Error triggering notification:', error);
    res.status(500).json({ error: 'Failed to trigger notification' });
  }
});

// Schedule a demo follow-up job
router.post('/schedule', authenticate, async (req, res) => {
  try {
    const { toEmail, toPhone, caseSnippet, delay } = req.body;
    if (!toEmail || !toPhone) return res.status(400).json({ error: 'Missing email or phone number' });

    const { scheduleFollowUp } = require('../workers/notifications');
    await scheduleFollowUp(req.user!.userId, toEmail, caseSnippet);

    res.json({ message: 'Follow-up notifications scheduled successfully' });
  } catch (error) {
    console.error('Error scheduling notification:', error);
    res.status(500).json({ error: 'Failed to schedule notification' });
  }
});

// Get user notifications
router.get('/', authenticate, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user!.userId },
      data: { read: true }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// Mark all as read
router.put('/read/all', authenticate, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.userId, read: false },
      data: { read: true }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating notifications:', error);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

export default router;
