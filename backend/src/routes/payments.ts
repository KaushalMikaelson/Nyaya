import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../prisma';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { PlanTier, SubscriptionStatus } from '@prisma/client';

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder'
});

const PLAN_PRICES = {
  BASIC: { amount: 99900, currency: 'INR' }, // Rs 999
  PRO: { amount: 249900, currency: 'INR' }, // Rs 2499
  ENTERPRISE: { amount: 999900, currency: 'INR' } // Rs 9999
};

// Create an order for a new subscription or top-up
router.post('/create-order', authenticate, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { tier } = req.body;
    if (!tier || !PLAN_PRICES[tier as keyof typeof PLAN_PRICES]) {
      return res.status(400).json({ error: 'Invalid plan tier' });
    }

    const plan = PLAN_PRICES[tier as keyof typeof PLAN_PRICES];

    // Create a Razorpay Order
    const options = {
      amount: plan.amount, // amount in smallest currency unit
      currency: plan.currency,
      receipt: `receipt_order_${req.user!.userId.substring(0, 15)}`
    };

    const order = await razorpay.orders.create(options);

    // Track payment intent in our DB
    await prisma.payment.create({
      data: {
        userId: req.user!.userId,
        amount: plan.amount / 100,
        currency: plan.currency,
        razorpayOrderId: order.id,
        status: 'created'
      }
    });

    res.json({
      orderId: order.id,
      amount: plan.amount,
      currency: plan.currency,
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder'
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

// Verify payment and upgrade subscription
router.post('/verify-payment', authenticate, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, tier } = req.body;

    const secret = process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder';
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto.createHmac('sha256', secret).update(body.toString()).digest('hex');

    if (expectedSignature === razorpay_signature) {
      // Payment is verified
      await prisma.payment.update({
        where: { razorpayOrderId: razorpay_order_id },
        data: {
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          status: 'captured'
        }
      });

      // Update User subscription
      let subscription = await prisma.subscription.findUnique({
        where: { userId: req.user!.userId }
      });

      const limits = {
        FREE: 100,
        BASIC: 1000,
        PRO: 10000,
        ENTERPRISE: 100000
      };

      const newLimit = limits[tier as keyof typeof limits] || 100;

      if (subscription) {
        subscription = await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            tier: tier as PlanTier,
            status: SubscriptionStatus.ACTIVE,
            apiTokensLimit: newLimit,
            currentPeriodEnd: new Date(new Date().setMonth(new Date().getMonth() + 1)) // 1 month validity
          }
        });
      } else {
        subscription = await prisma.subscription.create({
          data: {
            userId: req.user!.userId,
            tier: tier as PlanTier,
            status: SubscriptionStatus.ACTIVE,
            apiTokensLimit: newLimit,
            currentPeriodEnd: new Date(new Date().setMonth(new Date().getMonth() + 1))
          }
        });
      }

      await prisma.user.update({
        where: { id: req.user!.userId },
        data: { isPro: ['PRO', 'ENTERPRISE'].includes(tier) }
      });

      res.json({ success: true, message: 'Payment verified and plan upgraded', subscription });
    } else {
      await prisma.payment.update({
        where: { razorpayOrderId: razorpay_order_id },
        data: { status: 'failed' }
      });
      res.status(400).json({ error: 'Invalid payment signature' });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

// Get current subscription status
router.get('/subscription', authenticate, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: req.user!.userId }
    });
    
    if (!subscription) {
      return res.json({ tier: 'FREE', status: 'ACTIVE', apiTokensUsed: 0, apiTokensLimit: 100 });
    }

    res.json(subscription);
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

export default router;
