import { Request, Response, NextFunction } from 'express';
import { db } from '../../db';

interface SecurityEvent {
  type: 'auth_failure' | 'auth_success' | 'auth_attempt' | 'authorization_failure' | 'rate_limit' | 'suspicious_activity';
  userId?: string;
  userAddress?: string;
  ip: string;
  userAgent?: string;
  details?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class SecurityLogger {
  static async logEvent(event: SecurityEvent) {
    try {
      // Log to database if user is authenticated
      if (event.userId) {
        await db.query(
          `INSERT INTO audit_logs (user_id, action, target, category, risk_level, details, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            event.userId,
            event.type,
            event.ip,
            'security',
            event.severity,
            JSON.stringify(event.details || {}),
            JSON.stringify({
              userAgent: event.userAgent,
              timestamp: new Date().toISOString(),
            }),
          ]
        );
      }
      
      // Always log to console for monitoring
      console.log('[SECURITY]', {
        type: event.type,
        severity: event.severity,
        userId: event.userId,
        ip: event.ip,
        details: event.details,
      });
    } catch (error) {
      // Don't fail the request if logging fails
      console.error('Failed to log security event:', error);
    }
  }

  static logAuthFailure(req: Request, reason: string) {
    return this.logEvent({
      type: 'auth_failure',
      ip: req.ip || 'unknown',
      userAgent: req.get('user-agent'),
      details: { reason },
      severity: 'medium',
    });
  }

  static logAuthSuccess(req: Request, userId: string, userAddress: string) {
    return this.logEvent({
      type: 'auth_success',
      userId,
      userAddress,
      ip: req.ip || 'unknown',
      userAgent: req.get('user-agent'),
      severity: 'low',
    });
  }

  static logAuthorizationFailure(req: any, resource: string) {
    return this.logEvent({
      type: 'authorization_failure',
      userId: req.userId,
      userAddress: req.userAddress,
      ip: req.ip || 'unknown',
      userAgent: req.get('user-agent'),
      details: { resource },
      severity: 'high',
    });
  }

  static logRateLimit(req: Request, userId?: string) {
    return this.logEvent({
      type: 'rate_limit',
      userId,
      ip: req.ip || 'unknown',
      userAgent: req.get('user-agent'),
      severity: 'medium',
    });
  }

  static logSuspiciousActivity(req: Request, details: Record<string, any>, severity: 'medium' | 'high' | 'critical' = 'medium') {
    return this.logEvent({
      type: 'suspicious_activity',
      userId: (req as any).userId,
      userAddress: (req as any).userAddress,
      ip: req.ip || 'unknown',
      userAgent: req.get('user-agent'),
      details,
      severity,
    });
  }
}



