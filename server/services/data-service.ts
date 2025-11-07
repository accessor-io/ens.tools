/**
 * Server-side Data Service
 * Handles all data operations with encryption
 * NOT exposed to client - only accessible via API
 */

import { db } from '../db';
import { EncryptionService } from './encryption-service';

export interface UserData {
  id: string;
  address: string;
  config?: any;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLogEntry {
  id: string;
  userId?: string;
  userAddress?: string;
  action: string;
  domain?: string;
  details: string;
  status: string;
  txHash?: string;
  metadata?: any;
  timestamp: Date;
}

export class DataService {
  /**
   * Get user data (decrypted with user key)
   */
  static async getUserData(userAddress: string): Promise<UserData | null> {
    try {
      const result = await db.query(
        'SELECT id, address, config_json, metadata, created_at, updated_at FROM users WHERE address = $1',
        [userAddress.toLowerCase()]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      let config = null;
      let metadata = null;

      // Decrypt config if encrypted
      if (row.config_json) {
        try {
          if (EncryptionService.isEncrypted(row.config_json)) {
            config = EncryptionService.decryptJSONWithUserKey(row.config_json, userAddress);
          } else {
            config = JSON.parse(row.config_json);
          }
        } catch (error) {
          console.error('Error decrypting user config:', error);
        }
      }

      // Decrypt metadata if encrypted
      if (row.metadata) {
        try {
          if (EncryptionService.isEncrypted(row.metadata)) {
            metadata = EncryptionService.decryptJSONWithUserKey(row.metadata, userAddress);
          } else {
            metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
          }
        } catch (error) {
          console.error('Error decrypting user metadata:', error);
        }
      }

      return {
        id: row.id,
        address: row.address,
        config,
        metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      console.error('Error getting user data:', error);
      throw error;
    }
  }

  /**
   * Save user data (encrypted with user key)
   */
  static async saveUserData(userAddress: string, config?: any, metadata?: any): Promise<void> {
    try {
      // Get or create user
      const userResult = await db.query(
        'SELECT id FROM users WHERE address = $1',
        [userAddress.toLowerCase()]
      );

      let userId: string;
      if (userResult.rows.length === 0) {
        const newUserResult = await db.query(
          'INSERT INTO users (address) VALUES ($1) RETURNING id',
          [userAddress.toLowerCase()]
        );
        userId = newUserResult.rows[0].id;
      } else {
        userId = userResult.rows[0].id;
      }

      // Encrypt and save config
      if (config !== undefined) {
        const encryptedConfig = EncryptionService.encryptJSONWithUserKey(config, userAddress);
        await db.query(
          'UPDATE users SET config_json = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [encryptedConfig, userId]
        );
      }

      // Encrypt and save metadata
      if (metadata !== undefined) {
        const encryptedMetadata = EncryptionService.encryptJSONWithUserKey(metadata, userAddress);
        await db.query(
          'UPDATE users SET metadata = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [encryptedMetadata, userId]
        );
      }
    } catch (error) {
      console.error('Error saving user data:', error);
      throw error;
    }
  }

  /**
   * Get all audit log entries (admin only - uses master key)
   */
  static async getAllAuditLogs(limit: number = 100, offset: number = 0): Promise<AuditLogEntry[]> {
    try {
      const result = await db.query(
        `SELECT 
          al.id,
          al.user_id,
          u.address as user_address,
          al.action,
          al.target as domain,
          al.details,
          al.risk_level as status,
          al.tx_hash as tx_hash,
          al.metadata,
          al.timestamp
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ORDER BY al.timestamp DESC
        LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      return result.rows.map(row => {
        let metadata = null;
        if (row.metadata) {
          try {
            // Try to decrypt with master key first, then user key
            if (EncryptionService.isEncrypted(row.metadata)) {
              try {
                metadata = EncryptionService.decryptJSONWithMasterKey(row.metadata);
              } catch {
                // If master key fails, try user key
                if (row.user_address) {
                  metadata = EncryptionService.decryptJSONWithUserKey(row.metadata, row.user_address);
                } else {
                  metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
                }
              }
            } else {
              metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
            }
          } catch (error) {
            console.error('Error decrypting audit log metadata:', error);
          }
        }

        return {
          id: row.id,
          userId: row.user_id,
          userAddress: row.user_address,
          action: row.action,
          domain: row.domain,
          details: row.details,
          status: row.risk_level,
          txHash: row.tx_hash,
          metadata,
          timestamp: row.timestamp,
        };
      });
    } catch (error) {
      console.error('Error getting audit logs:', error);
      throw error;
    }
  }

  /**
   * Get user audit log entries (decrypted with user key)
   */
  static async getUserAuditLogs(userAddress: string, limit: number = 100, offset: number = 0): Promise<AuditLogEntry[]> {
    try {
      const result = await db.query(
        `SELECT 
          al.id,
          al.user_id,
          u.address as user_address,
          al.action,
          al.target as domain,
          al.details,
          al.risk_level as status,
          al.tx_hash as tx_hash,
          al.metadata,
          al.timestamp
        FROM audit_logs al
        JOIN users u ON al.user_id = u.id
        WHERE u.address = $1
        ORDER BY al.timestamp DESC
        LIMIT $2 OFFSET $3`,
        [userAddress.toLowerCase(), limit, offset]
      );

      return result.rows.map(row => {
        let metadata = null;
        if (row.metadata) {
          try {
            if (EncryptionService.isEncrypted(row.metadata)) {
              metadata = EncryptionService.decryptJSONWithUserKey(row.metadata, userAddress);
            } else {
              metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
            }
          } catch (error) {
            console.error('Error decrypting audit log metadata:', error);
          }
        }

        return {
          id: row.id,
          userId: row.user_id,
          userAddress: row.user_address,
          action: row.action,
          domain: row.domain,
          details: row.details,
          status: row.risk_level,
          txHash: row.tx_hash,
          metadata,
          timestamp: row.timestamp,
        };
      });
    } catch (error) {
      console.error('Error getting user audit logs:', error);
      throw error;
    }
  }

  /**
   * Get all user data (admin only - uses master key for decryption)
   */
  static async getAllUserData(limit: number = 100, offset: number = 0): Promise<UserData[]> {
    try {
      const result = await db.query(
        `SELECT id, address, config_json, metadata, created_at, updated_at 
         FROM users 
         ORDER BY created_at DESC 
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      return result.rows.map(row => {
        let config = null;
        let metadata = null;

        // Decrypt with master key (admin access)
        if (row.config_json) {
          try {
            if (EncryptionService.isEncrypted(row.config_json)) {
              config = EncryptionService.decryptJSONWithMasterKey(row.config_json);
            } else {
              config = JSON.parse(row.config_json);
            }
          } catch (error) {
            console.error('Error decrypting user config with master key:', error);
          }
        }

        if (row.metadata) {
          try {
            if (EncryptionService.isEncrypted(row.metadata)) {
              metadata = EncryptionService.decryptJSONWithMasterKey(row.metadata);
            } else {
              metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
            }
          } catch (error) {
            console.error('Error decrypting user metadata with master key:', error);
          }
        }

        return {
          id: row.id,
          address: row.address,
          config,
          metadata,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      });
    } catch (error) {
      console.error('Error getting all user data:', error);
      throw error;
    }
  }

  /**
   * Get statistics (admin only)
   */
  static async getStatistics(): Promise<{
    totalUsers: number;
    totalAuditLogs: number;
    recentActivity: number;
    byAction: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    try {
      const [userCount, auditCount, recentAudits, actionStats, statusStats] = await Promise.all([
        db.query('SELECT COUNT(*) as count FROM users'),
        db.query('SELECT COUNT(*) as count FROM audit_logs'),
        db.query(
          'SELECT COUNT(*) as count FROM audit_logs WHERE timestamp > NOW() - INTERVAL \'24 hours\''
        ),
        db.query(
          'SELECT action, COUNT(*) as count FROM audit_logs GROUP BY action ORDER BY count DESC LIMIT 10'
        ),
        db.query(
          'SELECT risk_level as status, COUNT(*) as count FROM audit_logs GROUP BY risk_level'
        ),
      ]);

      const byAction: Record<string, number> = {};
      actionStats.rows.forEach((row: any) => {
        byAction[row.action] = parseInt(row.count);
      });

      const byStatus: Record<string, number> = {};
      statusStats.rows.forEach((row: any) => {
        byStatus[row.status] = parseInt(row.count);
      });

      return {
        totalUsers: parseInt(userCount.rows[0].count),
        totalAuditLogs: parseInt(auditCount.rows[0].count),
        recentActivity: parseInt(recentAudits.rows[0].count),
        byAction,
        byStatus,
      };
    } catch (error) {
      console.error('Error getting statistics:', error);
      throw error;
    }
  }
}

