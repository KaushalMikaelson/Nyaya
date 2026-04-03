// @ts-nocheck
import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../prisma';
import Razorpay from 'razorpay';
import crypto from 'crypto';

const router = Router();

router.use(authenticate);

// Initialize Razorpay (mock or real based on env key)
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_mockedapi",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "mocked_secret",
});

// Endpoint to generate an order
router.post('/orders', async (req: AuthRequest, res): Promise<void> => {
  try {
    const options = {
      amount: 99900, // Phase requirement for paid tiers e.g., ₹999 PRO
      currency: "INR",
      receipt: `receipt_${req.user!.userId.substring(0,8)}`,
    };
    
    // In actual deployment, if keys are valid, use razorpay. Otherwise, simulate response.
    if (process.env.RAZORPAY_KEY_ID) {
      const order = await razorpay.orders.create(options);
      res.json(order);
    } else {
      console.warn("⚠️ Mocking Razorpay Order since keys are missing");
      res.json({
        id: `order_mock_${Date.now()}`,
        currency: "INR",
        amount: options.amount
      });
    }
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res.status(500).json({ error: "Failed to create payment order" });
  }
});

// Endpoint to verify payment and unlock features
router.post('/verify', async (req: AuthRequest, res): Promise<void> => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  try {
    let isValid = false;

    if (process.env.RAZORPAY_KEY_SECRET) {
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");

      isValid = expectedSignature === razorpay_signature;
    } else {
      // Mock logic accepts the payment
      isValid = true;
    }

    if (isValid) {
      await prisma.user.update({
        where: { id: req.user!.userId },
        data: { isPro: true }
      });
      res.json({ success: true, message: "Upgraded to PRO successfully" });
    } else {
      res.status(400).json({ success: false, error: "Invalid payment signature" });
    }
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ error: "Failed to verify payment" });
  }
});

export default router;
