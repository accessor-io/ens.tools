import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export interface ValidationRequest extends Request {
  validatedData?: any;
}

/**
 * Validation middleware factory
 */
export function validate(schema: z.ZodSchema) {
  return (req: ValidationRequest, res: Response, next: NextFunction) => {
    try {
      req.validatedData = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      return res.status(400).json({ error: 'Invalid request data' });
    }
  };
}

/**
 * Validation schemas
 */
export const schemas = {
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/i, 'Invalid Ethereum address format'),
  
  contract: z.object({
    address: z.string().regex(/^0x[a-fA-F0-9]{40}$/i, 'Invalid address format'),
    name: z.string().min(1).max(255),
    ens_name: z.string().max(255).optional().nullable(),
    chain: z.string().min(1).max(50),
    type: z.string().min(1).max(50),
    status: z.enum(['active', 'inactive', 'deprecated']).optional(),
    security: z.string().max(50).optional().nullable(),
    version: z.string().max(50).optional().nullable(),
    owner: z.string().regex(/^0x[a-fA-F0-9]{40}$/i).optional().nullable(),
    multisig: z.boolean().optional(),
    upgradeable: z.boolean().optional(),
    verified: z.boolean().optional(),
    deployed: z.string().optional().nullable(),
    interactions24h: z.number().int().min(0).optional(),
    tvl: z.string().max(50).optional().nullable(),
    metadata: z.record(z.any()).optional().nullable(),
  }),

  contractUpdate: z.object({
    name: z.string().min(1).max(255).optional(),
    ens_name: z.string().max(255).optional().nullable(),
    chain: z.string().min(1).max(50).optional(),
    type: z.string().min(1).max(50).optional(),
    status: z.enum(['active', 'inactive', 'deprecated']).optional(),
    security: z.string().max(50).optional().nullable(),
    version: z.string().max(50).optional().nullable(),
    owner: z.string().regex(/^0x[a-fA-F0-9]{40}$/i).optional().nullable(),
    multisig: z.boolean().optional(),
    upgradeable: z.boolean().optional(),
    verified: z.boolean().optional(),
    deployed: z.string().optional().nullable(),
    interactions24h: z.number().int().min(0).optional(),
    tvl: z.string().max(50).optional().nullable(),
    metadata: z.record(z.any()).optional().nullable(),
  }),

  authConnect: z.object({
    address: z.string().regex(/^0x[a-fA-F0-9]{40}$/i, 'Invalid address format'),
    message: z.string().min(1),
    signature: z.string().min(1),
  }),

  auditLog: z.object({
    action: z.string().min(1).max(100),
    target: z.string().max(255).optional().nullable(),
    category: z.string().max(50).optional().nullable(),
    risk_level: z.enum(['low', 'medium', 'high', 'critical']).optional().nullable(),
    details: z.string().max(5000).optional().nullable(),
    metadata: z.record(z.any()).optional().nullable(),
  }),

  queryParams: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(1000)).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(0)).optional(),
    risk_level: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  }),
};


