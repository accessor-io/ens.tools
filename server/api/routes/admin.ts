/**
 * Admin API Routes
 * Protected by admin authentication
 */

import { Router, Request, Response } from 'express';
import { AdminRequest, adminAuthMiddleware, superAdminMiddleware } from '../middleware/admin-auth';
import { AdminService } from '../../services/admin-service';
import { DataService } from '../../services/data-service';

const router = Router();

// All routes require admin authentication
router.use(adminAuthMiddleware);

/**
 * GET /api/admin/me
 * Get current admin user info
 */
router.get('/me', async (req: AdminRequest, res: Response) => {
  try {
    const admin = await AdminService.getAdminByAddress(req.adminAddress!);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    res.json(admin);
  } catch (error) {
    console.error('Error getting admin info:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/login
 * Create admin session
 */
router.post('/login', async (req: AdminRequest, res: Response) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string;
    const userAgent = req.headers['user-agent'];

    const session = await AdminService.createSession(
      req.adminId!,
      req.adminAddress!,
      ipAddress,
      userAgent
    );

    res.json({
      sessionToken: session.sessionToken,
      expiresAt: session.expiresAt,
      admin: {
        address: req.adminAddress,
        role: req.adminRole,
      },
    });
  } catch (error) {
    console.error('Error creating admin session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/logout
 * Revoke current session
 */
router.post('/logout', async (req: AdminRequest, res: Response) => {
  try {
    const sessionToken = req.headers['x-admin-session'] as string;
    if (sessionToken) {
      await AdminService.revokeSession(sessionToken);
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Error logging out:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/users
 * Get all users (admin only)
 */
router.get('/users', async (req: AdminRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const users = await DataService.getAllUserData(limit, offset);
    res.json(users);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/audit-logs
 * Get all audit logs (admin only)
 */
router.get('/audit-logs', async (req: AdminRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const logs = await DataService.getAllAuditLogs(limit, offset);
    res.json(logs);
  } catch (error) {
    console.error('Error getting audit logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/statistics
 * Get system statistics (admin only)
 */
router.get('/statistics', async (req: AdminRequest, res: Response) => {
  try {
    const stats = await DataService.getStatistics();
    res.json(stats);
  } catch (error) {
    console.error('Error getting statistics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/admins
 * List all admins (super admin only)
 */
router.get('/admins', superAdminMiddleware, async (req: AdminRequest, res: Response) => {
  try {
    const admins = await AdminService.listAdmins();
    res.json(admins);
  } catch (error) {
    console.error('Error listing admins:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/admins
 * Add admin user (super admin only)
 */
router.post('/admins', superAdminMiddleware, async (req: AdminRequest, res: Response) => {
  try {
    const { address, role, permissions } = req.body;

    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    const admin = await AdminService.addAdmin(address, role, permissions);
    res.json(admin);
  } catch (error) {
    console.error('Error adding admin:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/admin/admins/:address
 * Remove admin user (super admin only)
 */
router.delete('/admins/:address', superAdminMiddleware, async (req: AdminRequest, res: Response) => {
  try {
    const { address } = req.params;
    await AdminService.removeAdmin(address);
    res.json({ message: 'Admin removed successfully' });
  } catch (error) {
    console.error('Error removing admin:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as adminRouter };

