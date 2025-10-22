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
  | 'transaction_signed'
  | 'transaction_failed'
  | 'metadata_validated'
  | 'settings_changed';

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
    }
  ) {
    this.addEntry({
      action,
      details,
      domain: options?.domain,
      actor: options?.actor,
      status: options?.status || 'info',
      txHash: options?.txHash,
      metadata: options?.metadata,
    });
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

    const headers = ['Timestamp', 'Action', 'Domain', 'Actor', 'Status', 'Details', 'Tx Hash'];
    const rows = this.entries.map(entry => [
      entry.timestamp.toISOString(),
      entry.action,
      entry.domain || '',
      entry.actor || '',
      entry.status,
      entry.details,
      entry.txHash || '',
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}

export const auditLogService = new AuditLogService();

