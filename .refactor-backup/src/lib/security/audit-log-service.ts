export type AuditActionType = 
  | 'wallet_connected'
  | 'wallet_disconnected'
  | 'address_record_set'
  | 'text_record_set'
  | 'subdomain_created'
  | 'domain_transferred'
  | 'fuses_set'
  | 'name_wrapped'
  | 'resolver_changed'
  | 'view_changed'
  | 'domain_searched'
  | 'filter_applied'
  | 'contract_registered'
  | 'metadata_updated'
  | 'transaction_attempted'
  | 'transaction_pending'
  | 'transaction_confirmed'
  | 'transaction_failed'
  | 'transaction_reverted'
  | 'transaction_signed'
  | 'metadata_validated'
  | 'settings_saved'
  | 'settings_changed'
  | 'name_edited'
  | 'batch_action_tx';

export interface TransactionData {
  txHash?: string;
  txStatus?: 'attempted' | 'pending' | 'confirmed' | 'failed' | 'reverted';
  callData?: string; // Hex encoded call data
  contractAddress?: string;
  functionName?: string;
  functionArgs?: any[];
  gasLimit?: bigint;
  gasPrice?: bigint;
  gasUsed?: bigint;
  blockNumber?: bigint;
  blockHash?: string;
}

export interface StateChange {
  contract: string;
  event: string;
  from?: any;
  to?: any;
  decoded?: any;
}

export interface BatchAction {
  actionName: string;
  description: string;
  contract: string;
  functionName: string;
  callData: string;
  callDataStart: number;
  callDataEnd: number;
  args?: any[];
}

export interface BatchTransactionData extends TransactionData {
  batchActions?: BatchAction[];
  totalActions?: number;
}

export interface AuditEntry {
  id: string;
  timestamp: Date;
  action: AuditActionType;
  domain?: string;
  actor?: string;
  details: string;
  status: 'success' | 'warning' | 'failed' | 'info';
  txHash?: string;
  metadata?: Record<string, any>;
  // Transaction tracking
  transaction?: TransactionData | BatchTransactionData;
  stateChanges?: StateChange[];
  decodedLogs?: any[];
}

class AuditLogService {
  private entries: AuditEntry[] = [];
  private listeners: Set<(entries: AuditEntry[]) => void> = new Set();
  private maxEntries = 1000;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem('ens_audit_log');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.entries = parsed.map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp),
        }));
      }
    } catch (error) {
      console.error('Failed to load audit log from storage:', error);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('ens_audit_log', JSON.stringify(this.entries));
    } catch (error) {
      console.error('Failed to save audit log to storage:', error);
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.entries]));
  }

  subscribe(listener: (entries: AuditEntry[]) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  addEntry(entry: Omit<AuditEntry, 'id' | 'timestamp'>) {
    const newEntry: AuditEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    this.entries.unshift(newEntry);
    
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(0, this.maxEntries);
    }

    this.saveToStorage();
    this.notifyListeners();

    // Sync to master database
    this.syncToMasterDatabase(newEntry);
  }

  /**
   * Sync entry to master database
   */
  private async syncToMasterDatabase(entry: AuditEntry) {
    try {
      const { masterDatabase } = await import('../database/master-database');
      await masterDatabase.init();
      
      // Get current chain ID and account from global state if available
      // This will be set by the web3 provider
      const chainId = (window as any).__ENS_CHAIN_ID__;
      const accountAddress = (window as any).__ENS_ACCOUNT_ADDRESS__;
      
      await masterDatabase.addEntry({
        ...entry,
        accountAddress,
        chainId,
        sessionId: (window as any).__ENS_SESSION_ID__ || `session-${Date.now()}`,
      });
    } catch (error) {
      // Silently fail - master database is optional
      console.debug('Failed to sync to master database:', error);
    }
  }

  trackAction(
    action: AuditActionType,
    details: string,
    options?: {
      domain?: string;
      actor?: string;
      status?: 'success' | 'warning' | 'failed' | 'info';
      txHash?: string;
      metadata?: Record<string, any>;
      transaction?: TransactionData;
      stateChanges?: StateChange[];
      decodedLogs?: any[];
    }
  ) {
    this.addEntry({
      action,
      details,
      domain: options?.domain,
      actor: options?.actor,
      status: options?.status || 'info',
      txHash: options?.txHash || options?.transaction?.txHash,
      metadata: options?.metadata,
      transaction: options?.transaction,
      stateChanges: options?.stateChanges,
      decodedLogs: options?.decodedLogs,
    });
  }

  trackTransactionAttempt(
    action: AuditActionType,
    details: string,
    transaction: TransactionData,
    options?: {
      domain?: string;
      actor?: string;
      metadata?: Record<string, any>;
    }
  ) {
    this.trackAction(action, details, {
      ...options,
      status: 'info',
      transaction: {
        ...transaction,
        txStatus: 'attempted',
      },
    });
  }

  trackTransactionConfirmed(
    txHash: string,
    transaction: Partial<TransactionData>,
    stateChanges?: StateChange[],
    decodedLogs?: any[]
  ) {
    const entry = this.entries.find(e => e.transaction?.txHash === txHash || e.txHash === txHash);
    if (entry) {
      entry.status = 'success';
      entry.transaction = {
        ...entry.transaction,
        ...transaction,
        txHash,
        txStatus: 'confirmed',
      };
      if (stateChanges) entry.stateChanges = stateChanges;
      if (decodedLogs) entry.decodedLogs = decodedLogs;
      this.saveToStorage();
      this.notifyListeners();
    } else {
      this.trackAction('transaction_confirmed', `Transaction confirmed: ${txHash}`, {
        status: 'success',
        txHash,
        transaction: {
          ...transaction,
          txHash,
          txStatus: 'confirmed',
        },
        stateChanges,
        decodedLogs,
      });
    }
  }

  trackTransactionFailed(
    txHash: string | undefined,
    error: Error | string,
    transaction?: Partial<TransactionData>
  ) {
    const entry = txHash ? this.entries.find(e => e.transaction?.txHash === txHash || e.txHash === txHash) : null;
    if (entry) {
      entry.status = 'failed';
      if (entry.transaction) {
        entry.transaction.txStatus = 'failed';
        Object.assign(entry.transaction, transaction);
      }
      entry.details = `Transaction failed: ${error instanceof Error ? error.message : error}`;
      this.saveToStorage();
      this.notifyListeners();
    } else {
      this.trackAction('transaction_failed', `Transaction failed: ${error instanceof Error ? error.message : error}`, {
        status: 'failed',
        txHash,
        transaction: transaction ? {
          ...transaction,
          txHash,
          txStatus: 'failed',
        } : undefined,
      });
    }
  }

  getEntries(): AuditEntry[] {
    return [...this.entries];
  }

  getRecentEntries(limit: number = 50): AuditEntry[] {
    return this.entries.slice(0, limit);
  }

  clear() {
    this.entries = [];
    this.saveToStorage();
    this.notifyListeners();
  }

  export(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.entries, null, 2);
    }

    const headers = [
      'Timestamp', 'Action', 'Domain', 'Actor', 'Status', 'Details', 
      'Tx Hash', 'Tx Status', 'Contract', 'Function', 'Gas Used', 'Call Data'
    ];
    const rows = this.entries.map(entry => [
      entry.timestamp.toISOString(),
      entry.action,
      entry.domain || '',
      entry.actor || '',
      entry.status,
      entry.details,
      entry.txHash || '',
      entry.transaction?.txStatus || '',
      entry.transaction?.contractAddress || '',
      entry.transaction?.functionName || '',
      entry.transaction?.gasUsed?.toString() || '',
      entry.transaction?.callData || '',
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}

export const auditLogService = new AuditLogService();

