import dotenv from 'dotenv';
dotenv.config(); // ← must be first before any other imports read process.env

import express from 'express';
import cors from 'cors';
import path from 'path';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import chatRoutes from './routes/chat';
import searchRoutes from './routes/search';
import documentRoutes from './routes/documents';
import paymentRoutes from './routes/payments';
import generateRoutes from './routes/generate';
import intelligenceRoutes from './routes/intelligence';
import uploadRoutes from './routes/uploads';
import caseRoutes from './routes/cases';
import notificationRoutes from './routes/notifications';
import marketplaceRoutes from './routes/marketplace';

// ─── Safety net for Node.js 25+ (unhandled rejections = fatal by default) ───
process.on('unhandledRejection', (reason: any) => {
  console.warn('[UnhandledRejection] (non-fatal):', reason?.message || reason);
});
process.on('uncaughtException', (err: any) => {
  console.warn('[UncaughtException] (non-fatal):', err?.message || err);
});

// ─── Conditionally start background workers (only if Redis is reachable) ────
const REDIS_URL = process.env.REDIS_URL || '';
const hasExternalRedis = REDIS_URL && !REDIS_URL.includes('localhost') && !REDIS_URL.includes('127.0.0.1');

if (hasExternalRedis) {
  // Only import workers when Redis is actually configured (production)
  Promise.all([
    import('./workers/notifications'),
    import('./workers/documentProcessor').then(({ startDocumentWorker }) =>
      startDocumentWorker().catch((e: any) =>
        console.warn('[DocProcessor] Worker init failed:', e?.message)
      )
    ),
  ]).catch((e: any) => console.warn('[Workers] Failed to load:', e?.message));
} else {
  console.log('[Workers] Redis not configured — workers disabled. Document processing will be synchronous.');
}

const app = express();
const PORT = process.env.PORT || 3001;

app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/intelligence', intelligenceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/cases', caseRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[GlobalError]', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: err.message || 'An unexpected error occurred.' });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Nyaya server running on port ${PORT}`);
});

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    // Exit code 0 = clean exit, so nodemon does NOT enter crash-restart loop.
    // This happens when nodemon restarts before the old process releases the port.
    console.warn(`⚠️  Port ${PORT} is already in use — another instance may still be shutting down. Exiting cleanly.`);
    process.exit(0);
  } else {
    console.error('[Server Error]', err.message);
    process.exit(1);
  }
});