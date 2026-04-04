// @ts-nocheck
/**
 * Document Upload Routes for Lawyer & Judge Verification
 *
 * POST /api/uploads/lawyer-docs   — Upload bar certificate, degree, govt ID, photo
 * POST /api/uploads/judge-docs    — Upload government ID document
 * GET  /api/uploads/:filename     — Serve a stored file (dev only)
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';
import { prisma } from '../prisma';

const router = Router();

// ─────────────────────────────────────────
// MULTER CONFIGURATION
// ─────────────────────────────────────────

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (req: AuthRequest, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${req.user?.userId}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (_req: Request, file: any, cb: any) => {
  const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, JPG, PNG, or WEBP files are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

function buildFileUrl(filename: string): string {
  const base = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;
  return `${base}/api/uploads/${filename}`;
}

// ─────────────────────────────────────────
// LAWYER DOCUMENT UPLOAD
// Form fields: barCertificate, degreeCertificate, governmentId, profilePhoto
// ─────────────────────────────────────────

const lawyerUploadMiddleware = upload.fields([
  { name: 'barCertificate', maxCount: 1 },
  { name: 'degreeCertificate', maxCount: 1 },
  { name: 'governmentId', maxCount: 1 },
  { name: 'profilePhoto', maxCount: 1 },
]);

router.post(
  '/lawyer-docs',
  authenticate,
  requireRole(UserRole.LAWYER),
  (req: AuthRequest, res: Response, next: any) => {
    lawyerUploadMiddleware(req as any, res, next);
  },
  async (req: AuthRequest, res: Response): Promise<void> => {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    try {
      const updateData: any = {};

      if (files?.barCertificate?.[0]) {
        updateData.barCertificateUrl = buildFileUrl(files.barCertificate[0].filename);
      }
      if (files?.degreeCertificate?.[0]) {
        updateData.degreeCertificateUrl = buildFileUrl(files.degreeCertificate[0].filename);
      }
      if (files?.governmentId?.[0]) {
        updateData.governmentIdUrl = buildFileUrl(files.governmentId[0].filename);
      }
      if (files?.profilePhoto?.[0]) {
        updateData.profilePhotoUrl = buildFileUrl(files.profilePhoto[0].filename);
      }

      if (Object.keys(updateData).length === 0) {
        res.status(400).json({ error: 'No valid files uploaded' });
        return;
      }

      // Set status back to PENDING so admin re-reviews
      updateData.verificationStatus = 'PENDING';

      const profile = await prisma.lawyerProfile.update({
        where: { userId: req.user!.userId },
        data: updateData,
      });

      res.json({
        message: 'Documents uploaded successfully. Admin will review within 2-3 business days.',
        uploadedFiles: Object.keys(updateData).filter(k => k !== 'verificationStatus'),
        profile,
      });
    } catch (err: any) {
      console.error('[Lawyer doc upload]', err);
      res.status(500).json({ error: 'Upload failed' });
    }
  }
);

// ─────────────────────────────────────────
// JUDGE DOCUMENT UPLOAD
// Form fields: governmentIdDoc
// ─────────────────────────────────────────

const judgeUploadMiddleware = upload.fields([
  { name: 'governmentIdDoc', maxCount: 1 },
]);

router.post(
  '/judge-docs',
  authenticate,
  requireRole(UserRole.JUDGE),
  (req: AuthRequest, res: Response, next: any) => {
    judgeUploadMiddleware(req as any, res, next);
  },
  async (req: AuthRequest, res: Response): Promise<void> => {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    try {
      if (!files?.governmentIdDoc?.[0]) {
        res.status(400).json({ error: 'governmentIdDoc file is required' });
        return;
      }

      const profile = await prisma.judgeProfile.update({
        where: { userId: req.user!.userId },
        data: {
          governmentIdDocUrl: buildFileUrl(files.governmentIdDoc[0].filename),
          verificationStatus: 'PENDING',
        },
      });

      res.json({
        message: 'Document uploaded. Admin will verify your Government ID.',
        profile,
      });
    } catch (err: any) {
      console.error('[Judge doc upload]', err);
      res.status(500).json({ error: 'Upload failed' });
    }
  }
);

// ─────────────────────────────────────────
// SERVE UPLOADED FILES (dev only)
// In production, serve from CDN/S3 instead
// ─────────────────────────────────────────

router.get('/:filename', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ error: 'Files are served via CDN in production' });
    return;
  }

  const filePath = path.join(UPLOAD_DIR, req.params.filename as string);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'File not found' });
    return;
  }
  res.sendFile(filePath);
});

export default router;
