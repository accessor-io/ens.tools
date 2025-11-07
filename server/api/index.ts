import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { authRouter } from './routes/auth';
import { contractsRouter } from './routes/contracts';
import { daosRouter } from './routes/daos';
import { integrationsRouter } from './routes/integrations';
import { auditLogRouter } from './routes/audit-log';
import { configRouter } from './routes/config';
import { analyticsRouter } from './routes/analytics';
import { domainsRouter } from './routes/domains';
import { adminRouter } from './routes/admin';
import { marketplaceRouter } from './routes/marketplace';
import { errorHandler } from './middleware/error-handler';
import { logger } from './utils/logger';

const app = express();

// Security headers with proper configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.FRONTEND_URL || 'http://localhost:5173'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Cookie parser for CSRF tokens
app.use(cookieParser());

// IP-based rate limiting (general)
const ipLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// User-based rate limiting (for authenticated routes)
const userLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200, // Higher limit for authenticated users
  message: 'Too many requests, please try again later.',
  keyGenerator: (req: any) => {
    // Use user ID if authenticated, otherwise fall back to IP
    return req.userId || req.ip || 'unknown';
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply IP-based limiting to all API routes
app.use('/api/', ipLimiter);

// Body parsing with route-specific limits
// Default limit for most routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Route-specific body size limits
const configBodyParser = express.json({ limit: '1mb' }); // Smaller limit for config
const auditLogBodyParser = express.json({ limit: '5mb' }); // Medium limit for audit logs

// Logging
app.use(logger);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
// Apply user-based rate limiting to authenticated routes
app.use('/api/auth', authRouter);
app.use('/api/contracts', userLimiter, contractsRouter);
app.use('/api/daos', userLimiter, daosRouter);
app.use('/api/integrations', userLimiter, integrationsRouter);
app.use('/api/audit-log', auditLogBodyParser, userLimiter, auditLogRouter);
app.use('/api/user/config', configBodyParser, userLimiter, configRouter);
app.use('/api/analytics', userLimiter, analyticsRouter);
app.use('/api/domains', userLimiter, domainsRouter);
app.use('/api/admin', userLimiter, adminRouter);
app.use('/api/marketplace', userLimiter, marketplaceRouter);

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;

