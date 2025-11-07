/**
 * Master Database Service
 * Centralized IndexedDB storage for all account actions and audit log entries
 */

import { AuditEntry, AuditActionType, TransactionData, StateChange } from '../security/audit-log-service';

export interface MasterDatabaseEntry extends AuditEntry {
  accountAddress?: string; // Wallet address that performed the action
  chainId?: number; // Chain ID where action occurred
  sessionId?: string; // Session identifier
}

export interface QueryFilters {
  accountAddress?: string;
  action?: AuditActionType | AuditActionType[];
  domain?: string;
  status?: 'success' | 'warning' | 'failed' | 'info' | ('success' | 'warning' | 'failed' | 'info')[];
  dateFrom?: Date;
  dateTo?: Date;
  txHash?: string;
  chainId?: number;
  hasTransaction?: boolean;
  searchTerm?: string; // Search in details, domain, actor
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'action' | 'domain' | 'status';
  sortDirection?: 'asc' | 'desc';
}

const DB_NAME = 'ens_master_database';
const DB_VERSION = 1;
const STORE_NAME = 'audit_entries';
const INDEXES = {
  timestamp: 'timestamp',
  action: 'action',
  accountAddress: 'accountAddress',
  domain: 'domain',
  status: 'status',
  txHash: 'txHash',
  chainId: 'chainId',
  actor: 'actor',
};

class MasterDatabase {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize IndexedDB database
   */
  async init(): Promise<void> {
    if (this.db) {
      return Promise.resolve();
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: false,
          });

          // Create indexes for efficient querying
          objectStore.createIndex(INDEXES.timestamp, 'timestamp', { unique: false });
          objectStore.createIndex(INDEXES.action, 'action', { unique: false });
          objectStore.createIndex(INDEXES.accountAddress, 'accountAddress', { unique: false });
          objectStore.createIndex(INDEXES.domain, 'domain', { unique: false });
          objectStore.createIndex(INDEXES.status, 'status', { unique: false });
          objectStore.createIndex(INDEXES.txHash, 'txHash', { unique: false });
          objectStore.createIndex(INDEXES.chainId, 'chainId', { unique: false });
          objectStore.createIndex(INDEXES.actor, 'actor', { unique: false });

          // Compound index for common queries
          objectStore.createIndex('account_timestamp', ['accountAddress', 'timestamp'], { unique: false });
          objectStore.createIndex('domain_timestamp', ['domain', 'timestamp'], { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Add an entry to the master database
   */
  async addEntry(entry: MasterDatabaseEntry): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // Convert Date to timestamp for storage
      const entryToStore = {
        ...entry,
        timestamp: entry.timestamp.getTime(),
      };

      const request = store.put(entryToStore);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to add entry:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Add multiple entries in a batch
   */
  async addEntries(entries: MasterDatabaseEntry[]): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      let completed = 0;
      let hasError = false;

      entries.forEach((entry) => {
        const entryToStore = {
          ...entry,
          timestamp: entry.timestamp.getTime(),
        };

        const request = store.put(entryToStore);

        request.onsuccess = () => {
          completed++;
          if (completed === entries.length && !hasError) {
            resolve();
          }
        };

        request.onerror = () => {
          if (!hasError) {
            hasError = true;
            console.error('Failed to add entry in batch:', request.error);
            reject(request.error);
          }
        };
      });
    });
  }

  /**
   * Query entries with filters and options
   */
  async queryEntries(filters?: QueryFilters, options?: QueryOptions): Promise<MasterDatabaseEntry[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      // Determine which index to use based on filters
      let indexName = INDEXES.timestamp;
      let index: IDBIndex | null = null;

      if (filters?.accountAddress) {
        indexName = INDEXES.accountAddress;
      } else if (filters?.domain) {
        indexName = INDEXES.domain;
      } else if (filters?.action) {
        indexName = INDEXES.action;
      } else if (filters?.status) {
        indexName = INDEXES.status;
      } else if (filters?.txHash) {
        indexName = INDEXES.txHash;
      }

      index = store.index(indexName);
      const request = index.openCursor();
      const results: MasterDatabaseEntry[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

        if (cursor) {
          const entry = cursor.value;

          // Convert timestamp back to Date
          const entryWithDate: MasterDatabaseEntry = {
            ...entry,
            timestamp: new Date(entry.timestamp),
          };

          // Apply filters
          if (this.matchesFilters(entryWithDate, filters)) {
            results.push(entryWithDate);
          }

          cursor.continue();
        } else {
          // Apply sorting and pagination
          const sorted = this.sortEntries(results, options);
          const paginated = this.paginateEntries(sorted, options);
          resolve(paginated);
        }
      };

      request.onerror = () => {
        console.error('Query failed:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get entry by ID
   */
  async getEntryById(id: string): Promise<MasterDatabaseEntry | null> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        if (request.result) {
          const entry: MasterDatabaseEntry = {
            ...request.result,
            timestamp: new Date(request.result.timestamp),
          };
          resolve(entry);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        console.error('Failed to get entry:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get entries by account address
   */
  async getEntriesByAccount(accountAddress: string, limit?: number): Promise<MasterDatabaseEntry[]> {
    return this.queryEntries(
      { accountAddress },
      { limit, sortBy: 'timestamp', sortDirection: 'desc' }
    );
  }

  /**
   * Get entries by domain
   */
  async getEntriesByDomain(domain: string, limit?: number): Promise<MasterDatabaseEntry[]> {
    return this.queryEntries(
      { domain },
      { limit, sortBy: 'timestamp', sortDirection: 'desc' }
    );
  }

  /**
   * Get entries by transaction hash
   */
  async getEntriesByTxHash(txHash: string): Promise<MasterDatabaseEntry[]> {
    return this.queryEntries({ txHash });
  }

  /**
   * Get recent entries
   */
  async getRecentEntries(limit: number = 100): Promise<MasterDatabaseEntry[]> {
    return this.queryEntries(
      undefined,
      { limit, sortBy: 'timestamp', sortDirection: 'desc' }
    );
  }

  /**
   * Count entries matching filters
   */
  async countEntries(filters?: QueryFilters): Promise<number> {
    const entries = await this.queryEntries(filters);
    return entries.length;
  }

  /**
   * Get statistics
   */
  async getStatistics(accountAddress?: string): Promise<{
    total: number;
    byAction: Record<string, number>;
    byStatus: Record<string, number>;
    byDomain: Record<string, number>;
    recentActivity: number; // Actions in last 24 hours
  }> {
    const filters = accountAddress ? { accountAddress } : undefined;
    const allEntries = await this.queryEntries(filters);

    const stats = {
      total: allEntries.length,
      byAction: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      byDomain: {} as Record<string, number>,
      recentActivity: 0,
    };

    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    allEntries.forEach((entry) => {
      // Count by action
      stats.byAction[entry.action] = (stats.byAction[entry.action] || 0) + 1;

      // Count by status
      stats.byStatus[entry.status] = (stats.byStatus[entry.status] || 0) + 1;

      // Count by domain
      if (entry.domain) {
        stats.byDomain[entry.domain] = (stats.byDomain[entry.domain] || 0) + 1;
      }

      // Count recent activity
      if (entry.timestamp.getTime() > oneDayAgo) {
        stats.recentActivity++;
      }
    });

    return stats;
  }

  /**
   * Delete entries matching filters
   */
  async deleteEntries(filters?: QueryFilters): Promise<number> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.openCursor();
      let deleted = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

        if (cursor) {
          const entry = cursor.value;
          const entryWithDate: MasterDatabaseEntry = {
            ...entry,
            timestamp: new Date(entry.timestamp),
          };

          if (this.matchesFilters(entryWithDate, filters)) {
            cursor.delete();
            deleted++;
          }

          cursor.continue();
        } else {
          resolve(deleted);
        }
      };

      request.onerror = () => {
        console.error('Delete failed:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Clear all entries
   */
  async clearAll(): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error('Clear failed:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Export entries to JSON
   */
  async exportToJSON(filters?: QueryFilters): Promise<string> {
    const entries = await this.queryEntries(filters);
    return JSON.stringify(entries, null, 2);
  }

  /**
   * Export entries to CSV
   */
  async exportToCSV(filters?: QueryFilters): Promise<string> {
    const entries = await this.queryEntries(filters);

    const headers = [
      'ID',
      'Timestamp',
      'Action',
      'Domain',
      'Actor',
      'Account Address',
      'Status',
      'Details',
      'Tx Hash',
      'Tx Status',
      'Contract Address',
      'Function Name',
      'Chain ID',
    ];

    const rows = entries.map((entry) => [
      entry.id,
      entry.timestamp.toISOString(),
      entry.action,
      entry.domain || '',
      entry.actor || '',
      entry.accountAddress || '',
      entry.status,
      entry.details,
      entry.txHash || '',
      entry.transaction?.txStatus || '',
      entry.transaction?.contractAddress || '',
      entry.transaction?.functionName || '',
      entry.chainId?.toString() || '',
    ]);

    return [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  }

  /**
   * Check if entry matches filters
   */
  private matchesFilters(entry: MasterDatabaseEntry, filters?: QueryFilters): boolean {
    if (!filters) return true;

    if (filters.accountAddress && entry.accountAddress?.toLowerCase() !== filters.accountAddress.toLowerCase()) {
      return false;
    }

    if (filters.action) {
      const actions = Array.isArray(filters.action) ? filters.action : [filters.action];
      if (!actions.includes(entry.action)) {
        return false;
      }
    }

    if (filters.domain && entry.domain?.toLowerCase() !== filters.domain.toLowerCase()) {
      return false;
    }

    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      if (!statuses.includes(entry.status)) {
        return false;
      }
    }

    if (filters.dateFrom && entry.timestamp < filters.dateFrom) {
      return false;
    }

    if (filters.dateTo && entry.timestamp > filters.dateTo) {
      return false;
    }

    if (filters.txHash && entry.txHash?.toLowerCase() !== filters.txHash.toLowerCase()) {
      return false;
    }

    if (filters.chainId && entry.chainId !== filters.chainId) {
      return false;
    }

    if (filters.hasTransaction !== undefined) {
      const hasTx = !!entry.transaction;
      if (filters.hasTransaction !== hasTx) {
        return false;
      }
    }

    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      const matches =
        entry.details.toLowerCase().includes(searchLower) ||
        entry.domain?.toLowerCase().includes(searchLower) ||
        entry.actor?.toLowerCase().includes(searchLower) ||
        entry.accountAddress?.toLowerCase().includes(searchLower);
      if (!matches) {
        return false;
      }
    }

    return true;
  }

  /**
   * Sort entries
   */
  private sortEntries(entries: MasterDatabaseEntry[], options?: QueryOptions): MasterDatabaseEntry[] {
    if (!options?.sortBy) {
      return entries;
    }

    const sorted = [...entries];
    const sortBy = options.sortBy;
    const direction = options.sortDirection || 'desc';

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'timestamp':
          comparison = a.timestamp.getTime() - b.timestamp.getTime();
          break;
        case 'action':
          comparison = a.action.localeCompare(b.action);
          break;
        case 'domain':
          comparison = (a.domain || '').localeCompare(b.domain || '');
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }

      return direction === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }

  /**
   * Paginate entries
   */
  private paginateEntries(entries: MasterDatabaseEntry[], options?: QueryOptions): MasterDatabaseEntry[] {
    if (options?.offset || options?.limit) {
      const offset = options.offset || 0;
      const limit = options.limit ? offset + options.limit : undefined;
      return entries.slice(offset, limit);
    }
    return entries;
  }
}

export const masterDatabase = new MasterDatabase();


