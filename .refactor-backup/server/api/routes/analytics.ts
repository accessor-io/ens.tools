import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { db } from '../../db';

export const analyticsRouter = Router();

analyticsRouter.use(authMiddleware);

analyticsRouter.get('/metrics', async (req: AuthRequest, res: Response) => {
  try {
    const [contracts, daos, integrations, auditLogs] = await Promise.all([
      db.query('SELECT COUNT(*) as count, chain FROM contracts WHERE user_id = $1 GROUP BY chain', [req.userId]),
      db.query('SELECT COUNT(*) as count, category FROM daos WHERE user_id = $1 GROUP BY category', [req.userId]),
      db.query('SELECT COUNT(*) as count, type FROM integrations WHERE user_id = $1 GROUP BY type', [req.userId]),
      db.query('SELECT COUNT(*) as count, risk_level FROM audit_logs WHERE user_id = $1 GROUP BY risk_level', [req.userId]),
    ]);

    res.json({
      contracts: contracts.rows,
      daos: daos.rows,
      integrations: integrations.rows,
      auditLogs: auditLogs.rows,
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

