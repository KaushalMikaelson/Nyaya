import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth';
import chatRoutes from './routes/chat';
import searchRoutes from './routes/search';
import documentRoutes from './routes/documents';
import paymentRoutes from './routes/payment';
import generateRoutes from './routes/generate';
import intelligenceRoutes from './routes/intelligence';

// Initialize Background Workers
import './workers/notifications';
import notificationRoutes from './routes/notifications';
import marketplaceRoutes from './routes/marketplace';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/intelligence', intelligenceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/marketplace', marketplaceRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
