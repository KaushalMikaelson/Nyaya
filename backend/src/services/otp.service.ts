import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { prisma } from '../prisma';
import { OtpType } from '@prisma/client';

// ─────────────────────────────────────────
// EMAIL TRANSPORTER
// ─────────────────────────────────────────

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ─────────────────────────────────────────
// OTP HELPERS
// ─────────────────────────────────────────

const OTP_EXPIRY_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;

/**
 * Generate a cryptographically secure 6-digit OTP
 */
export function generateOtpCode(): string {
  const bytes = crypto.randomBytes(4);
  const num = bytes.readUInt32BE(0) % 1000000;
  return num.toString().padStart(6, '0');
}

/**
 * Create and store an OTP. Invalidates any existing OTPs for the same target+type.
 */
export async function createOtp(
  target: string,
  type: OtpType,
  userId?: string
): Promise<string> {
  // Invalidate existing OTPs for this target/type
  await prisma.otp.updateMany({
    where: { target, type, used: false },
    data: { used: true },
  });

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.otp.create({
    data: {
      target,
      type,
      code,
      userId,
      expiresAt,
    },
  });

  return code;
}

/**
 * Verify an OTP code. Returns true on success, throws on failure.
 */
export async function verifyOtp(
  target: string,
  type: OtpType,
  code: string
): Promise<boolean> {
  const otp = await prisma.otp.findFirst({
    where: {
      target,
      type,
      used: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  // ── DEBUG: log OTP lookup result ──
  console.log(`[OTP Debug] target="${target}" type="${type}" submitted="${code}"`);
  console.log(`[OTP Debug] DB record:`, otp ? { code: otp.code, used: otp.used, expiresAt: otp.expiresAt, attempts: otp.attempts } : 'NOT FOUND');

  if (!otp) {
    // Check if there's an expired or used one to give a better error
    const anyOtp = await prisma.otp.findFirst({
      where: { target, type },
      orderBy: { createdAt: 'desc' },
    });
    console.log(`[OTP Debug] Most recent (any state):`, anyOtp ? { code: anyOtp.code, used: anyOtp.used, expiresAt: anyOtp.expiresAt } : 'NONE IN DB');
    throw new Error('OTP not found or expired. Please request a new one.');
  }

  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    await prisma.otp.update({ where: { id: otp.id }, data: { used: true } });
    throw new Error('Too many attempts. Please request a new OTP.');
  }

  if (otp.code !== code) {
    await prisma.otp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    const remaining = OTP_MAX_ATTEMPTS - (otp.attempts + 1);
    console.log(`[OTP Debug] MISMATCH: expected="${otp.code}" got="${code}"`);
    throw new Error(`Invalid OTP. ${remaining} attempt(s) remaining.`);
  }

  // Mark as used
  await prisma.otp.update({ where: { id: otp.id }, data: { used: true } });
  return true;
}

// ─────────────────────────────────────────
// EMAIL TEMPLATES
// ─────────────────────────────────────────

function buildEmailHtml(subject: string, body: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #0f0f1a; color: #e2e8f0; margin: 0; padding: 0; }
        .container { max-width: 520px; margin: 40px auto; background: #1a1a2e; border-radius: 16px; overflow: hidden; border: 1px solid #2d2d4e; }
        .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 800; color: #fff; letter-spacing: -0.5px; }
        .header p { margin: 4px 0 0; font-size: 13px; color: rgba(255,255,255,0.75); }
        .body { padding: 36px 40px; }
        .otp-box { background: #0f0f1a; border: 2px dashed #6366f1; border-radius: 12px; text-align: center; padding: 24px; margin: 28px 0; }
        .otp-code { font-size: 42px; font-weight: 800; letter-spacing: 12px; color: #818cf8; font-family: monospace; }
        .expiry { font-size: 12px; color: #64748b; margin-top: 8px; }
        .footer { padding: 20px 40px; border-top: 1px solid #2d2d4e; text-align: center; font-size: 12px; color: #4a5568; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚖️ Nyaya</h1>
          <p>India's AI Legal Platform</p>
        </div>
        <div class="body">
          <p>${body}</p>
          <div class="otp-box">
            <div class="otp-code">${subject}</div>
            <div class="expiry">This code expires in ${OTP_EXPIRY_MINUTES} minutes</div>
          </div>
          <p style="font-size:13px; color:#64748b;">
            If you didn't request this, please ignore this email. 
            Never share this code with anyone — Nyaya will never ask for it.
          </p>
        </div>
        <div class="footer">© ${new Date().getFullYear()} Nyaya Legal Technologies Pvt. Ltd.</div>
      </div>
    </body>
    </html>
  `;
}

// ─────────────────────────────────────────
// SEND OTP EMAIL
// ─────────────────────────────────────────

export async function sendOtpEmail(
  email: string,
  code: string,
  type: OtpType
): Promise<void> {
  const subjects: Record<OtpType, string> = {
    EMAIL_VERIFY: 'Verify your email',
    LOGIN: 'Your login OTP',
    PASSWORD_RESET: 'Reset your password',
    AADHAAR_LINK: 'Aadhaar linking OTP',
  };

  const bodies: Record<OtpType, string> = {
    EMAIL_VERIFY: 'Please use the following OTP to verify your email address:',
    LOGIN: 'Use this OTP to complete your login to Nyaya:',
    PASSWORD_RESET: 'Use this OTP to reset your Nyaya account password:',
    AADHAAR_LINK: 'Use this OTP to link your Aadhaar to Nyaya:',
  };

  // In dev mode, log instead of sending
  if (process.env.NODE_ENV !== 'production' && !process.env.SMTP_USER) {
    console.log(`\n📧 [DEV] OTP Email to ${email}`);
    console.log(`   Subject: ${subjects[type]}`);
    console.log(`   Code: ${code}\n`);
    return;
  }

  await transporter.sendMail({
    from: `"Nyaya Legal" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Nyaya: ${subjects[type]}`,
    html: buildEmailHtml(code, bodies[type]),
  });
}

// ─────────────────────────────────────────
// SEND OTP SMS (via Twilio — mock in dev)
// ─────────────────────────────────────────

export async function sendOtpSms(phone: string, code: string): Promise<void> {
  if (process.env.NODE_ENV !== 'production' || !process.env.TWILIO_ACCOUNT_SID) {
    console.log(`\n📱 [DEV] OTP SMS to ${phone}: ${code}\n`);
    return;
  }

  const twilio = await import('twilio');
  const client = twilio.default(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  await client.messages.create({
    body: `Your Nyaya OTP is: ${code}. Valid for ${OTP_EXPIRY_MINUTES} minutes. Do not share.`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phone,
  });
}
