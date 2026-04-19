// @ts-nocheck
import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../prisma';
import { createOtp, verifyOtp, sendOtpEmail, sendOtpSms } from '../services/otp.service';
import { issueTokenPair, rotateRefreshToken, revokeSingleToken, revokeAllTokens } from '../services/token.service';
import { initiateAadhaarOtp, verifyAadhaarOtp } from '../services/aadhaar.service';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import {
  loginLimiter, registerLimiter, otpSendLimiter, otpVerifyLimiter,
  passwordResetLimiter, refreshLimiter
} from '../middleware/rateLimiter';
import { UserRole } from '@prisma/client';

const router = Router();

// ─────────────────────────────────────────
// FILE UPLOAD CONFIG (for lawyer/judge docs)
// ─────────────────────────────────────────

const uploadDir = path.join(process.cwd(), 'uploads', 'verification');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only PDF, JPG, and PNG files are allowed.'));
  },
});

// ─────────────────────────────────────────
// HELPER: set refresh cookie
// ─────────────────────────────────────────

function setRefreshCookie(res: Response, token: string): void {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: true, // Secure must be true for SameSite=None to work. Localhost allows Secure cookies over HTTP.
    sameSite: 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

// ─────────────────────────────────────────
// HELPER: extract request meta
// ─────────────────────────────────────────

function getMeta(req: Request) {
  return {
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  CITIZEN AUTH FLOW
//  Step 1: POST /auth/citizen/register  → create account, send OTP
//  Step 2: POST /auth/citizen/verify-email → verify OTP, get tokens
//  Later:  POST /auth/citizen/aadhaar/initiate → start eKYC
//          POST /auth/citizen/aadhaar/verify   → complete eKYC
// ═══════════════════════════════════════════════════════════════════

/**
 * CITIZEN REGISTER
 * Creates account and sends email OTP for verification.
 */
router.post('/citizen/register', registerLimiter, async (req: Request, res: Response): Promise<void> => {
  let { email, password, fullName, phone } = req.body;
  if (email) email = email.toLowerCase().trim();

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters.' });
    return;
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        phone: phone || null,
        passwordHash,
        role: UserRole.CITIZEN,
        citizenProfile: {
          create: { fullName: fullName || null },
        },
      },
    });

    // Send email OTP
    const code = await createOtp(email, 'EMAIL_VERIFY', user.id);
    await sendOtpEmail(email, code, 'EMAIL_VERIFY');

    res.status(201).json({
      message: 'Account created. Please verify your email with the OTP sent.',
      userId: user.id,
      nextStep: 'verify-email',
    });
  } catch (err) {
    console.error('[citizen/register]', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

/**
 * CITIZEN VERIFY EMAIL
 * Verifies OTP and issues JWT tokens.
 */
router.post('/citizen/verify-email', otpVerifyLimiter, async (req: Request, res: Response): Promise<void> => {
  let { email, code } = req.body;
  if (email) email = email.toLowerCase().trim();
  if (!email || !code) {
    res.status(400).json({ error: 'Email and OTP code are required.' });
    return;
  }

  try {
    await verifyOtp(email, 'EMAIL_VERIFY', code);

    const user = await prisma.user.update({
      where: { email },
      data: { isEmailVerified: true },
    });

    const { accessToken, refreshToken } = await issueTokenPair(user.id, getMeta(req));
    setRefreshCookie(res, refreshToken);

    res.json({
      message: 'Email verified successfully.',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isEmailVerified: true,
      },
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'OTP verification failed.' });
  }
});

/**
 * CITIZEN AADHAAR eKYC — Step 1: Initiate
 */
router.post(
  '/citizen/aadhaar/initiate',
  authenticate,
  requireRole(UserRole.CITIZEN),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { aadhaarNumber } = req.body;
    if (!aadhaarNumber) {
      res.status(400).json({ error: 'Aadhaar number is required.' });
      return;
    }

    try {
      const result = await initiateAadhaarOtp(aadhaarNumber);
      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }
      res.json({
        message: `OTP sent to your Aadhaar-registered mobile (${result.maskedPhone}).`,
        txnId: result.txnId,
      });
    } catch (err) {
      console.error('[aadhaar/initiate]', err);
      res.status(500).json({ error: 'Failed to initiate Aadhaar verification.' });
    }
  }
);

/**
 * CITIZEN AADHAAR eKYC — Step 2: Verify OTP
 */
router.post(
  '/citizen/aadhaar/verify',
  authenticate,
  requireRole(UserRole.CITIZEN),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { txnId, otp } = req.body;
    if (!txnId || !otp) {
      res.status(400).json({ error: 'Transaction ID and OTP are required.' });
      return;
    }

    try {
      const kyc = await verifyAadhaarOtp(txnId, otp);
      if (!kyc.success) {
        res.status(400).json({ error: kyc.error });
        return;
      }

      // Update citizen profile with eKYC data
      await prisma.citizenProfile.update({
        where: { userId: req.user!.userId },
        data: {
          fullName: kyc.name,
          aadhaarNumber: kyc.maskedAadhaar,
          aadhaarVerified: true,
          dateOfBirth: kyc.dateOfBirth ? new Date(kyc.dateOfBirth) : undefined,
          address: kyc.address,
          state: kyc.state,
          pincode: kyc.pincode,
          verificationStatus: 'VERIFIED',
        },
      });

      res.json({
        message: 'Aadhaar eKYC completed successfully.',
        maskedAadhaar: kyc.maskedAadhaar,
        name: kyc.name,
      });
    } catch (err) {
      console.error('[aadhaar/verify]', err);
      res.status(500).json({ error: 'Aadhaar verification failed.' });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
//  LAWYER AUTH FLOW
//  Step 1: POST /auth/lawyer/register       → create account + send OTP
//  Step 2: POST /auth/lawyer/verify-email   → verify OTP, get tokens
//  Step 3: POST /auth/lawyer/submit-profile → bar council + doc upload
//           (Admin then reviews and approves/rejects in /api/admin)
// ═══════════════════════════════════════════════════════════════════

/**
 * LAWYER REGISTER
 */
router.post('/lawyer/register', registerLimiter, async (req: Request, res: Response): Promise<void> => {
  let { email, password, fullName, barCouncilNumber, barCouncilState } = req.body;
  if (email) email = email.toLowerCase().trim();

  if (!email || !password || !fullName || !barCouncilNumber) {
    res.status(400).json({ error: 'Email, password, full name, and Bar Council number are required.' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters.' });
    return;
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    // Check Bar Council number uniqueness
    const existingBar = await prisma.lawyerProfile.findUnique({
      where: { barCouncilNumber },
    });
    if (existingBar) {
      res.status(409).json({ error: 'This Bar Council number is already registered.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: UserRole.LAWYER,
        lawyerProfile: {
          create: {
            fullName,
            barCouncilNumber,
            barCouncilState: barCouncilState || null,
            verificationStatus: 'PENDING',
          },
        },
      },
    });

    const code = await createOtp(email, 'EMAIL_VERIFY', user.id);
    await sendOtpEmail(email, code, 'EMAIL_VERIFY');

    res.status(201).json({
      message: 'Lawyer account created. Please verify your email.',
      userId: user.id,
      nextStep: 'verify-email',
    });
  } catch (err) {
    console.error('[lawyer/register]', err);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

/**
 * LAWYER VERIFY EMAIL
 */
router.post('/lawyer/verify-email', otpVerifyLimiter, async (req: Request, res: Response): Promise<void> => {
  let { email, code } = req.body;
  if (email) email = email.toLowerCase().trim();
  if (!email || !code) {
    res.status(400).json({ error: 'Email and OTP code are required.' });
    return;
  }

  try {
    await verifyOtp(email, 'EMAIL_VERIFY', code);

    const user = await prisma.user.update({
      where: { email },
      data: { isEmailVerified: true },
    });

    const { accessToken, refreshToken } = await issueTokenPair(user.id, getMeta(req));
    setRefreshCookie(res, refreshToken);

    res.json({
      message: 'Email verified. Please complete your lawyer profile and upload documents.',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isEmailVerified: true,
        verificationStatus: 'PENDING',
      },
      nextStep: 'submit-profile',
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Verification failed.' });
  }
});

/**
 * LAWYER SUBMIT PROFILE + DOCUMENTS
 * Accepts multipart/form-data with document uploads.
 */
router.post(
  '/lawyer/submit-profile',
  authenticate,
  requireRole(UserRole.LAWYER),
  upload.fields([
    { name: 'barCertificate', maxCount: 1 },
    { name: 'degreeCertificate', maxCount: 1 },
    { name: 'governmentId', maxCount: 1 },
    { name: 'profilePhoto', maxCount: 1 },
  ]),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const files = req.files as Record<string, Express.Multer.File[]>;
    const {
      specializations,
      practiceAreas,
      yearsOfExperience,
      enrollmentYear,
      firmName,
      officeAddress,
      bio,
    } = req.body;

    try {
      const updateData: any = {
        verificationStatus: 'PENDING',
      };

      if (specializations) updateData.specializations = JSON.parse(specializations);
      if (practiceAreas) updateData.practiceAreas = JSON.parse(practiceAreas);
      if (yearsOfExperience) updateData.yearsOfExperience = parseInt(yearsOfExperience);
      if (enrollmentYear) updateData.enrollmentYear = parseInt(enrollmentYear);
      if (firmName) updateData.firmName = firmName;
      if (officeAddress) updateData.officeAddress = officeAddress;
      if (bio) updateData.bio = bio;

      // Store file paths (in production: upload to S3/GCS and store URLs)
      if (files.barCertificate) updateData.barCertificateUrl = `/uploads/verification/${files.barCertificate[0].filename}`;
      if (files.degreeCertificate) updateData.degreeCertificateUrl = `/uploads/verification/${files.degreeCertificate[0].filename}`;
      if (files.governmentId) updateData.governmentIdUrl = `/uploads/verification/${files.governmentId[0].filename}`;
      if (files.profilePhoto) updateData.profilePhotoUrl = `/uploads/verification/${files.profilePhoto[0].filename}`;

      await prisma.lawyerProfile.update({
        where: { userId: req.user!.userId },
        data: updateData,
      });

      res.json({
        message: 'Profile submitted for admin review. You will be notified within 2-3 business days.',
        verificationStatus: 'PENDING',
      });
    } catch (err) {
      console.error('[lawyer/submit-profile]', err);
      res.status(500).json({ error: 'Profile submission failed.' });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
//  JUDGE AUTH FLOW
//  Step 1: POST /auth/judge/register     → create account (Gov ID)
//  Step 2: POST /auth/judge/verify-email → verify OTP
//           (Admin then approves the Judge account)
// ═══════════════════════════════════════════════════════════════════

/**
 * JUDGE REGISTER
 */
router.post('/judge/register', registerLimiter, async (req: Request, res: Response): Promise<void> => {
  let { email, password, fullName, governmentId, court, courtLevel, jurisdiction, departmentCode } = req.body;
  if (email) email = email.toLowerCase().trim();

  if (!email || !password || !fullName || !governmentId) {
    res.status(400).json({ error: 'Email, password, full name, and Government ID are required.' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters.' });
    return;
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const existingGovId = await prisma.judgeProfile.findUnique({ where: { governmentId } });
    if (existingGovId) {
      res.status(409).json({ error: 'This Government ID is already registered.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: UserRole.JUDGE,
        judgeProfile: {
          create: {
            fullName,
            governmentId,
            court: court || null,
            courtLevel: courtLevel || null,
            jurisdiction: jurisdiction || null,
            departmentCode: departmentCode || null,
            verificationStatus: 'PENDING',
          },
        },
      },
    });

    const code = await createOtp(email, 'EMAIL_VERIFY', user.id);
    await sendOtpEmail(email, code, 'EMAIL_VERIFY');

    res.status(201).json({
      message: 'Judge account created. Please verify your email and await admin approval.',
      userId: user.id,
      nextStep: 'verify-email',
    });
  } catch (err) {
    console.error('[judge/register]', err);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

/**
 * JUDGE VERIFY EMAIL
 */
router.post('/judge/verify-email', otpVerifyLimiter, async (req: Request, res: Response): Promise<void> => {
  let { email, code } = req.body;
  if (email) email = email.toLowerCase().trim();
  if (!email || !code) {
    res.status(400).json({ error: 'Email and OTP are required.' });
    return;
  }

  try {
    await verifyOtp(email, 'EMAIL_VERIFY', code);
    const user = await prisma.user.update({
      where: { email },
      data: { isEmailVerified: true },
    });

    const { accessToken, refreshToken } = await issueTokenPair(user.id, getMeta(req));
    setRefreshCookie(res, refreshToken);

    res.json({
      message: 'Email verified. Your account is pending admin approval. We will notify you by email.',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isEmailVerified: true,
        verificationStatus: 'PENDING',
      },
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Verification failed.' });
  }
});

/**
 * JUDGE UPLOAD GOVERNMENT ID DOC
 */
router.post(
  '/judge/upload-doc',
  authenticate,
  requireRole(UserRole.JUDGE),
  upload.single('governmentIdDoc'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: 'Government ID document is required.' });
      return;
    }

    try {
      await prisma.judgeProfile.update({
        where: { userId: req.user!.userId },
        data: { governmentIdDocUrl: `/uploads/verification/${req.file.filename}` },
      });
      res.json({ message: 'Document uploaded successfully. Awaiting admin review.' });
    } catch (err) {
      console.error('[judge/upload-doc]', err);
      res.status(500).json({ error: 'Upload failed.' });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
//  ADMIN AUTH FLOW (Invite-only)
//  Step 1: An existing ADMIN calls POST /api/admin/invite
//  Step 2: Invitee calls POST /auth/admin/register?token=<token>
//  Step 3: POST /auth/admin/verify-email
// ═══════════════════════════════════════════════════════════════════

/**
 * ADMIN REGISTER via invite token
 */
router.post('/admin/register', registerLimiter, async (req: Request, res: Response): Promise<void> => {
  let { token, email, password, fullName, department } = req.body;
  if (email) email = email.toLowerCase().trim();

  if (!token || !email || !password || !fullName) {
    res.status(400).json({ error: 'Invite token, email, password, and full name are required.' });
    return;
  }
  if (password.length < 12) {
    res.status(400).json({ error: 'Admin passwords must be at least 12 characters.' });
    return;
  }

  try {
    // Validate invite token
    const invite = await prisma.adminInvite.findUnique({ where: { token } });
    if (!invite) {
      res.status(400).json({ error: 'Invalid invite token.' });
      return;
    }
    if (invite.used) {
      res.status(400).json({ error: 'This invite has already been used.' });
      return;
    }
    if (invite.expiresAt < new Date()) {
      res.status(400).json({ error: 'Invite token has expired.' });
      return;
    }
    if (invite.email !== email) {
      res.status(403).json({ error: 'Invite was issued for a different email address.' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 14); // Stronger hash for admins
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: UserRole.ADMIN,
        adminProfile: {
          create: {
            fullName,
            department: department || null,
            invitedBy: invite.invitedBy,
            permissions: ['verify_lawyers', 'verify_judges', 'manage_content'],
          },
        },
      },
    });

    // Mark invite as used
    await prisma.adminInvite.update({
      where: { id: invite.id },
      data: { used: true, usedAt: new Date() },
    });

    const code = await createOtp(email, 'EMAIL_VERIFY', user.id);
    await sendOtpEmail(email, code, 'EMAIL_VERIFY');

    res.status(201).json({
      message: 'Admin account created. Please verify your email.',
      userId: user.id,
      nextStep: 'verify-email',
    });
  } catch (err) {
    console.error('[admin/register]', err);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

/**
 * ADMIN VERIFY EMAIL
 */
router.post('/admin/verify-email', otpVerifyLimiter, async (req: Request, res: Response): Promise<void> => {
  let { email, code } = req.body;
  if (email) email = email.toLowerCase().trim();
  if (!email || !code) {
    res.status(400).json({ error: 'Email and OTP are required.' });
    return;
  }

  try {
    await verifyOtp(email, 'EMAIL_VERIFY', code);
    const user = await prisma.user.update({
      where: { email },
      data: { isEmailVerified: true },
    });

    const { accessToken, refreshToken } = await issueTokenPair(user.id, getMeta(req));
    setRefreshCookie(res, refreshToken);

    res.json({
      message: 'Admin account verified and active.',
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Verification failed.' });
  }
});

// ═══════════════════════════════════════════════════════════════════
//  UNIVERSAL FLOWS (all roles)
// ═══════════════════════════════════════════════════════════════════

/**
 * UNIVERSAL LOGIN (email + password)
 * Works for all roles. Returns tokens.
 */
router.post('/login', loginLimiter, async (req: Request, res: Response): Promise<void> => {
  let { email, password } = req.body;
  if (email) email = email.toLowerCase().trim();
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'User not found.' });
      return;
    }
    if (!user.passwordHash) {
      res.status(401).json({ error: 'Password not set for this account. Please use OTP login.' });
      return;
    }
    if (!user.isActive) {
      res.status(403).json({ error: 'Account suspended. Please contact support.' });
      return;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      res.status(401).json({ error: 'Incorrect password.' });
      return;
    }

    const { accessToken, refreshToken } = await issueTokenPair(user.id, getMeta(req));
    setRefreshCookie(res, refreshToken);

    // Fetch verification status based on role
    let verificationStatus = null;
    if (user.role === UserRole.LAWYER) {
      const lp = await prisma.lawyerProfile.findUnique({ where: { userId: user.id } });
      verificationStatus = lp?.verificationStatus;
    } else if (user.role === UserRole.JUDGE) {
      const jp = await prisma.judgeProfile.findUnique({ where: { userId: user.id } });
      verificationStatus = jp?.verificationStatus;
    }

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isPro: user.isPro,
        isEmailVerified: user.isEmailVerified,
        verificationStatus,
      },
    });
  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

/**
 * OTP LOGIN (passwordless) — request OTP
 */
router.post('/login/otp/request', otpSendLimiter, async (req: Request, res: Response): Promise<void> => {
  let { email, phone } = req.body;
  if (email) email = email.toLowerCase().trim();
  if (!email && !phone) {
    res.status(400).json({ error: 'Email or phone is required.' });
    return;
  }

  try {
    const target = email || phone;
    const user = email
      ? await prisma.user.findUnique({ where: { email } })
      : await prisma.user.findUnique({ where: { phone } });

    if (!user) {
      // Don't reveal whether user exists — silently succeed for security
      res.json({ message: 'If an account exists, an OTP has been sent.' });
      return;
    }
    if (!user.isActive) {
      res.status(403).json({ error: 'Account suspended.' });
      return;
    }

    const code = await createOtp(target, 'LOGIN', user.id);
    if (email) {
      await sendOtpEmail(email, code, 'LOGIN');
    } else {
      await sendOtpSms(phone, code);
    }

    res.json({ message: 'If an account exists, an OTP has been sent.' });
  } catch (err) {
    console.error('[login/otp/request]', err);
    res.status(500).json({ error: 'Failed to send OTP.' });
  }
});

/**
 * OTP LOGIN — verify OTP and get tokens
 */
router.post('/login/otp/verify', otpVerifyLimiter, loginLimiter, async (req: Request, res: Response): Promise<void> => {
  let { email, phone, code } = req.body;
  if (email) email = email.toLowerCase().trim();
  if ((!email && !phone) || !code) {
    res.status(400).json({ error: 'Email/phone and OTP are required.' });
    return;
  }

  try {
    const target = email || phone;
    await verifyOtp(target, 'LOGIN', code);

    const user = email
      ? await prisma.user.findUnique({ where: { email } })
      : await prisma.user.findUnique({ where: { phone } });

    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const { accessToken, refreshToken } = await issueTokenPair(user.id, getMeta(req));
    setRefreshCookie(res, refreshToken);

    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, role: user.role, isPro: user.isPro },
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'OTP verification failed.' });
  }
});

/**
 * RESEND OTP
 */
router.post('/resend-otp', otpSendLimiter, async (req: Request, res: Response): Promise<void> => {
  let { email, type } = req.body;
  if (email) email = email.toLowerCase().trim();
  if (!email || !type) {
    res.status(400).json({ error: 'Email and OTP type are required.' });
    return;
  }

  const allowedTypes = ['EMAIL_VERIFY', 'LOGIN', 'PASSWORD_RESET'];
  if (!allowedTypes.includes(type)) {
    res.status(400).json({ error: 'Invalid OTP type.' });
    return;
  }

  try {
    const code = await createOtp(email, type, undefined);
    await sendOtpEmail(email, code, type);
    res.json({ message: 'OTP resent successfully.' });
  } catch (err) {
    console.error('[resend-otp]', err);
    res.status(500).json({ error: 'Failed to resend OTP.' });
  }
});

/**
 * REFRESH TOKENS (rotation)
 */
router.post('/refresh', refreshLimiter, async (req: Request, res: Response): Promise<void> => {
  const oldToken = req.cookies?.refreshToken;
  if (!oldToken) {
    res.status(401).json({ error: 'No refresh token.' });
    return;
  }

  try {
    const { accessToken, refreshToken } = await rotateRefreshToken(oldToken, getMeta(req));
    setRefreshCookie(res, refreshToken);
    res.json({ accessToken, refreshToken });
  } catch (err: any) {
    res.clearCookie('refreshToken');
    res.status(401).json({ error: err.message || 'Session expired. Please log in again.' });
  }
});

/**
 * LOGOUT (this device)
 */
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  const token = req.cookies?.refreshToken;
  if (token) await revokeSingleToken(token).catch(() => {});
  res.clearCookie('refreshToken');
  res.json({ success: true, message: 'Logged out successfully.' });
});

/**
 * LOGOUT ALL DEVICES
 */
router.post('/logout-all', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  await revokeAllTokens(req.user!.userId).catch(() => {});
  res.clearCookie('refreshToken');
  res.json({ success: true, message: 'Logged out from all devices.' });
});

/**
 * GET CURRENT USER (me)
 */
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        isPro: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        isBiometricEnabled: true,
        createdAt: true,
        citizenProfile: { select: { fullName: true, aadhaarVerified: true, verificationStatus: true } },
        lawyerProfile: {
          select: {
            fullName: true, barCouncilNumber: true, barCouncilState: true,
            specializations: true, verificationStatus: true, verifiedAt: true,
          },
        },
        judgeProfile: {
          select: {
            fullName: true, governmentId: true, court: true,
            courtLevel: true, verificationStatus: true, verifiedAt: true,
          },
        },
        adminProfile: { select: { fullName: true, department: true, permissions: true } },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    res.json({ user });
  } catch (err) {
    console.error('[me]', err);
    res.status(500).json({ error: 'Failed to fetch user.' });
  }
});

// ═══════════════════════════════════════════════════════════════════
//  PASSWORD RESET FLOW
//  Step 1: POST /auth/forgot-password → send OTP to email
//  Step 2: POST /auth/reset-password  → verify OTP + set new password
// ═══════════════════════════════════════════════════════════════════

/**
 * FORGOT PASSWORD — Request reset OTP
 * Silently succeeds even if email not found (security)
 */
router.post('/forgot-password', passwordResetLimiter, async (req: Request, res: Response): Promise<void> => {
  let { email } = req.body;
  if (email) email = email.toLowerCase().trim();
  if (!email) {
    res.status(400).json({ error: 'Email is required.' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    // Always respond the same way — don't reveal if email exists
    if (user && user.isActive) {
      const code = await createOtp(email, 'PASSWORD_RESET', user.id);
      await sendOtpEmail(email, code, 'PASSWORD_RESET');
    }

    res.json({
      message: 'If an account with that email exists, a password reset OTP has been sent.',
    });
  } catch (err) {
    console.error('[forgot-password]', err);
    res.status(500).json({ error: 'Failed to send reset OTP.' });
  }
});

/**
 * RESET PASSWORD — Verify OTP + set new password
 */
router.post('/reset-password', passwordResetLimiter, otpVerifyLimiter, async (req: Request, res: Response): Promise<void> => {
  let { email, code, newPassword } = req.body;
  if (email) email = email.toLowerCase().trim();

  if (!email || !code || !newPassword) {
    res.status(400).json({ error: 'Email, OTP code, and new password are required.' });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: 'New password must be at least 8 characters.' });
    return;
  }

  try {
    await verifyOtp(email, 'PASSWORD_RESET', code);

    const passwordHash = await bcrypt.hash(newPassword, 12);
    const user = await prisma.user.update({
      where: { email },
      data: { passwordHash },
    });

    // Revoke all active refresh tokens for security
    await prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    res.json({
      message: 'Password reset successfully. Please log in with your new password.',
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Password reset failed.' });
  }
});

// ═══════════════════════════════════════════════════════════════════
//  BIOMETRIC AUTH PLACEHOLDERS (mobile-ready)
//  These endpoints are stubs; the actual biometric challenge/verify
//  is handled client-side using WebAuthn or device biometrics (FIDO2).
//  The server only stores the biometric credential ID and validates
//  the signed assertion.
// ═══════════════════════════════════════════════════════════════════

/**
 * BIOMETRIC REGISTER — Save device credential ID after first biometric setup
 * In production: verify WebAuthn attestation response here.
 */
router.post(
  '/biometric/register',
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { credentialId, deviceInfo } = req.body;
    if (!credentialId) {
      res.status(400).json({ error: 'Credential ID is required.' });
      return;
    }

    try {
      await prisma.user.update({
        where: { id: req.user!.userId },
        data: { isBiometricEnabled: true },
      });

      // In production: store credentialId in a separate BiometricCredential table
      // linked to userId with publicKey, counter, deviceInfo, etc.
      console.log(`[Biometric] Registered credential for user ${req.user!.userId}: ${credentialId}`);

      res.json({
        message: 'Biometric authentication registered successfully.',
        isBiometricEnabled: true,
        note: 'In production, the WebAuthn credential is stored in BiometricCredential table.',
      });
    } catch (err) {
      console.error('[biometric/register]', err);
      res.status(500).json({ error: 'Failed to register biometric.' });
    }
  }
);

/**
 * BIOMETRIC AUTHENTICATE — Validate biometric assertion and issue tokens
 * In production: verify WebAuthn assertion signature + increment authenticator counter.
 */
router.post('/biometric/authenticate', loginLimiter, async (req: Request, res: Response): Promise<void> => {
  const { credentialId, userId, assertion } = req.body;

  if (!credentialId || !userId) {
    res.status(400).json({ error: 'Credential ID and user ID are required.' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isBiometricEnabled || !user.isActive) {
      res.status(401).json({ error: 'Biometric authentication not available for this account.' });
      return;
    }

    // ⚠️  PRODUCTION: verify assertion signature here using WebAuthn library
    // e.g. @simplewebauthn/server verifyAuthenticationResponse()
    // For now, we simulate a successful verification in dev/mock mode
    console.log(`[Biometric] Mock-verify assertion for user ${userId} credential: ${credentialId}`);

    const { accessToken, refreshToken } = await issueTokenPair(user.id, getMeta(req));
    setRefreshCookie(res, refreshToken);

    res.json({
      message: 'Biometric authentication successful.',
      accessToken,
      user: { id: user.id, email: user.email, role: user.role, isPro: user.isPro },
    });
  } catch (err) {
    console.error('[biometric/authenticate]', err);
    res.status(500).json({ error: 'Biometric authentication failed.' });
  }
});

/**
 * BIOMETRIC DISABLE — Remove biometric registration
 */
router.post(
  '/biometric/disable',
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await prisma.user.update({
        where: { id: req.user!.userId },
        data: { isBiometricEnabled: false },
      });
      res.json({ message: 'Biometric authentication has been disabled.' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to disable biometric.' });
    }
  }
);


// ═══════════════════════════════════════════════════════════════════
//  PROFILE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

/**
 * PATCH /profile — Update profile fields based on role
 * Citizen: fullName, phone, address, state, pincode
 * Lawyer: bio, specializations, practiceAreas, yearsOfExperience, officeAddress
 * Judge: court, courtLevel, jurisdiction
 */
router.patch('/profile', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const role = req.user!.role;

  try {
    const updateData: any = {};

    if (role === 'CITIZEN') {
      const { fullName, phone, address, state, pincode } = req.body;
      const profileUpdate: any = {};
      if (fullName !== undefined) profileUpdate.fullName = fullName;
      if (address !== undefined) profileUpdate.address = address;
      if (state !== undefined) profileUpdate.state = state;
      if (pincode !== undefined) profileUpdate.pincode = pincode;

      if (Object.keys(profileUpdate).length > 0) {
        await prisma.citizenProfile.upsert({
          where: { userId },
          create: { userId, ...profileUpdate },
          update: profileUpdate,
        });
      }

      if (phone !== undefined) {
        updateData.phone = phone || null;
      }
    } else if (role === 'LAWYER') {
      const { bio, specializations, practiceAreas, yearsOfExperience, firmName, officeAddress, enrollmentYear } = req.body;
      const profileUpdate: any = {};
      if (bio !== undefined) profileUpdate.bio = bio;
      if (firmName !== undefined) profileUpdate.firmName = firmName;
      if (officeAddress !== undefined) profileUpdate.officeAddress = officeAddress;
      if (yearsOfExperience !== undefined) profileUpdate.yearsOfExperience = parseInt(yearsOfExperience);
      if (enrollmentYear !== undefined) profileUpdate.enrollmentYear = parseInt(enrollmentYear);
      if (specializations !== undefined) profileUpdate.specializations = Array.isArray(specializations) ? specializations : JSON.parse(specializations);
      if (practiceAreas !== undefined) profileUpdate.practiceAreas = Array.isArray(practiceAreas) ? practiceAreas : JSON.parse(practiceAreas);

      if (Object.keys(profileUpdate).length > 0) {
        await prisma.lawyerProfile.update({ where: { userId }, data: profileUpdate });
      }
    } else if (role === 'JUDGE') {
      const { court, courtLevel, jurisdiction } = req.body;
      const profileUpdate: any = {};
      if (court !== undefined) profileUpdate.court = court;
      if (courtLevel !== undefined) profileUpdate.courtLevel = courtLevel;
      if (jurisdiction !== undefined) profileUpdate.jurisdiction = jurisdiction;

      if (Object.keys(profileUpdate).length > 0) {
        await prisma.judgeProfile.update({ where: { userId }, data: profileUpdate });
      }
    } else if (role === 'ADMIN') {
      const { fullName, department } = req.body;
      const profileUpdate: any = {};
      if (fullName !== undefined) profileUpdate.fullName = fullName;
      if (department !== undefined) profileUpdate.department = department;
      if (Object.keys(profileUpdate).length > 0) {
        await prisma.adminProfile.update({ where: { userId }, data: profileUpdate });
      }
    }

    // Apply top-level user updates
    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({ where: { id: userId }, data: updateData });
    }

    res.json({ success: true, message: 'Profile updated successfully.' });
  } catch (err: any) {
    console.error('[PATCH /profile]', err);
    res.status(500).json({ error: 'Profile update failed.' });
  }
});

/**
 * DELETE /me — DPDP Act 2023: Right to Erasure
 * Soft-deletes user, clears PII, revokes all sessions.
 * Hard delete scheduled after 30 days by a cleanup job.
 */
router.delete('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { confirmDelete } = req.body;

  if (!confirmDelete) {
    res.status(400).json({ error: 'confirmDelete is required to proceed with account deletion.' });
    return;
  }

  try {
    // 1. Revoke all tokens
    await revokeAllTokens(userId).catch(() => {});

    // 2. Deactivate account and clear PII
    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        passwordHash: null,
        phone: null,
      },
    });

    // 3. Soft-delete all documents
    await prisma.userDocument.updateMany({
      where: { userId, deletedAt: null },
      data: {
        deletedAt: new Date(),
        summary: null,
        analysisReport: null,
        partiesInvolved: [],
      },
    });

    // 4. Clear profile PII
    const profileUpdate = { fullName: null, address: null, state: null, pincode: null };
    await prisma.citizenProfile.updateMany({ where: { userId }, data: profileUpdate }).catch(() => {});

    // 5. Clear cookie
    res.clearCookie('refreshToken');

    res.json({
      success: true,
      message: 'Your account has been deactivated and personal data cleared per DPDP Act 2023. Permanent deletion will occur within 30 days.',
    });
  } catch (err) {
    console.error('[DELETE /me]', err);
    res.status(500).json({ error: 'Account deletion failed. Please contact support.' });
  }
});

export default router;
