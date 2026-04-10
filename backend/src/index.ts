import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import chatRoutes from './routes/chat';
import searchRoutes from './routes/search';
import documentRoutes from './routes/documents';
import paymentRoutes from './routes/payment';
import generateRoutes from './routes/generate';
import intelligenceRoutes from './routes/intelligence';
import uploadRoutes from './routes/uploads';
import caseRoutes from './routes/cases'; // Case Management

// Initialize Background Workers
import './workers/notifications';
import notificationRoutes from './routes/notifications';
import marketplaceRoutes from './routes/marketplace';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Trust proxy for accurate IPs behind Nginx/load balancer ───
app.set('trust proxy', 1);

// ─── Security headers via Helmet ───
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow file serving
  contentSecurityPolicy: false, // managed by Next.js frontend
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Serve uploaded verification documents statically
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
app.use('/api/cases', caseRoutes); // Expose Case Management

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Global Error Handler ───
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[GlobalError]', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'An unexpected error occurred.';
  res.status(status).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`🚀 Nyaya server running on port ${PORT}`);
});
