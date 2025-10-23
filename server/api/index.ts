import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { authRouter } from './routes/auth';
import { contractsRouter } from './routes/contracts';
import { daosRouter } from './routes/daos';
import { integrationsRouter } from './routes/integrations';
import { auditLogRouter } from './routes/audit-log';
import { configRouter } from './routes/config';
import { analyticsRouter } from './routes/analytics';
import { domainsRouter } from './routes/domains';
import { errorHandler } from './middleware/error-handler';
import { logger } from './utils/logger';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(logger);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/contracts', contractsRouter);
app.use('/api/daos', daosRouter);
app.use('/api/integrations', integrationsRouter);
app.use('/api/audit-log', auditLogRouter);
app.use('/api/user/config', configRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/domains', domainsRouter);

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;

