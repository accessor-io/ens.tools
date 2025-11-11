import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { db } from '../../db';
import { validate, schemas } from '../middleware/validation';
import { validate as uuidValidate } from 'uuid';

export const auditLogRouter = Router();

auditLogRouter.use(authMiddleware);

auditLogRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    // Validate query parameters
    const querySchema = schemas.queryParams;
    const validated = querySchema.safeParse(req.query);

    if (!validated.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: validated.error.errors,
      });
    }

    const { limit = 100, offset = 0, risk_level } = validated.data;

    let query = 'SELECT * FROM audit_logs WHERE user_id = $1';
    const params: any[] = [req.userId];

    if (risk_level) {
      query += ' AND risk_level = $2';
      params.push(risk_level);
    }

    query += ' ORDER BY timestamp DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await db.query(query, params);

    res.json(result.rows);
  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

auditLogRouter.post('/', validate(schemas.auditLog), async (req: any, res: Response) => {
  try {
    const { action, target, category, risk_level, details, metadata } = req.validatedData;

    const result = await db.query(
      `INSERT INTO audit_logs (
        user_id, action, target, category, risk_level, details, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        req.userId,
        action,
        target,
        category,
        risk_level,
        details,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create audit log error:', error);
    res.status(500).json({ error: 'Failed to create audit log entry' });
  }
});

auditLogRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate UUID format
    if (!uuidValidate(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const result = await db.query(
      'DELETE FROM audit_logs WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Audit log entry not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete audit log error:', error);
    res.status(500).json({ error: 'Failed to delete audit log entry' });
  }
});

