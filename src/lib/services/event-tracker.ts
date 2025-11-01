import { auditLogService } from '../security/audit-log-service';
import { userConfigService } from './user-config-service';

export type EventType =
  | 'wallet_connected'
  | 'wallet_disconnected'
  | 'view_changed'
  | 'domain_searched'
  | 'domain_viewed'
  | 'domain_grouped'
  | 'domain_project_assigned'
  | 'domain_filtered'
  | 'display_settings_changed'
  | 'notification_settings_changed'
  | 'group_created'
  | 'group_updated'
  | 'group_deleted'
  | 'project_assigned'
  | 'project_unassigned'
  | 'subdomain_created'
  | 'subdomain_deleted'
  | 'text_record_set'
  | 'text_record_deleted'
  | 'address_record_set'
  | 'resolver_changed'
  | 'ttl_set'
  | 'name_transferred'
  | 'name_wrapped'
  | 'name_unwrapped'
  | 'fuses_set'
  | 'fuses_burned'
  | 'contract_registered'
  | 'contract_metadata_updated'
  | 'registry_added'
  | 'registry_removed'
  | 'registry_updated'
  | 'transaction_signed'
  | 'transaction_confirmed'
  | 'transaction_failed'
  | 'metadata_validated'
  | 'metadata_schema_applied'
  | 'search_performed'
  | 'filter_applied'
  | 'export_performed'
  | 'import_performed'
  | 'settings_saved'
  | 'config_changed';

export interface EventData {
  type: EventType;
  address?: string;
  domain?: string;
  data?: Record<string, any>;
  timestamp?: Date;
}

class EventTracker {
  private listeners: Map<EventType, Set<(data: EventData) => void>> = new Map();
  private eventQueue: EventData[] = [];
  private processingQueue = false;

  constructor() {
    this.setupEventProcessing();
  }

  private setupEventProcessing() {
    const processQueue = () => {
      if (this.eventQueue.length > 0 && !this.processingQueue) {
        this.processingQueue = true;
        const event = this.eventQueue.shift();
        if (event) {
          this.processEvent(event);
        }
        this.processingQueue = false;
        setTimeout(processQueue, 0);
      } else {
        setTimeout(processQueue, 100);
      }
    };
    processQueue();
  }

  private processEvent(event: EventData) {
    event.timestamp = new Date();
    
    this.notifyListeners(event);
    
    const currentAddress = event.address;
    if (currentAddress) {
      const config = userConfigService.getUserConfig(currentAddress);
      if (config.auditLogEnabled) {
        auditLogService.trackAction(
          event.type as any,
          this.formatEventMessage(event),
          {
            domain: event.domain,
            actor: event.address,
            status: this.getEventStatus(event),
            metadata: event.data,
          }
        );
      }
    }
  }

  private formatEventMessage(event: EventData): string {
    const { type, domain, data } = event;
    
    switch (type) {
      case 'wallet_connected':
        return `Wallet connected`;
      case 'wallet_disconnected':
        return `Wallet disconnected`;
      case 'view_changed':
        return `Switched to ${data?.view || 'unknown'} view`;
      case 'domain_searched':
        return `Searched for: ${data?.query || 'unknown'}`;
      case 'domain_viewed':
        return `Viewed domain: ${domain}`;
      case 'domain_grouped':
        if (data?.groupId === null || data?.groupName === null) {
          return `Unassigned ${domain}${data?.previousGroupName ? ` from group: ${data.previousGroupName}` : ''}`;
        }
        if (data?.previousGroupId && data?.previousGroupName && data.previousGroupId !== data.groupId) {
          return `Changed ${domain} from group "${data.previousGroupName}" to "${data.groupName}"`;
        }
        return `Grouped ${domain} as ${data?.groupName || 'unknown'}`;
      case 'domain_project_assigned':
        return `Assigned ${domain} to project: ${data?.project || 'unknown'}`;
      case 'display_settings_changed':
        return `Updated display settings`;
      case 'notification_settings_changed':
        return `Updated notification settings`;
      case 'group_created':
        return `Created group: ${data?.groupName || 'unknown'}`;
      case 'group_updated':
        return `Updated group: ${data?.groupName || 'unknown'}`;
      case 'group_deleted':
        return `Deleted group: ${data?.groupName || 'unknown'}`;
      case 'subdomain_created':
        return `Created subdomain: ${data?.subdomain || 'unknown'}`;
      case 'text_record_set':
        return `Set text record ${data?.key || 'unknown'} for ${domain}`;
      case 'address_record_set':
        return `Set address record for ${domain}`;
      case 'name_transferred':
        return `Transferred ${domain} to ${data?.to || 'unknown'}`;
      case 'name_wrapped':
        return `Wrapped ${domain}`;
      case 'name_unwrapped':
        return `Unwrapped ${domain}`;
      case 'fuses_set':
        return `Set fuses for ${domain}`;
      case 'fuses_burned':
        return `Burned fuses for ${domain}`;
      case 'contract_registered':
        return `Registered contract ${data?.address || 'unknown'}`;
      case 'transaction_confirmed':
        return `Transaction confirmed: ${data?.txHash || 'unknown'}`;
      case 'transaction_failed':
        return `Transaction failed: ${data?.error || 'unknown'}`;
      case 'metadata_validated':
        return `Validated metadata for ${domain}`;
      case 'settings_saved':
        return `Saved user settings`;
      default:
        return `${type.replace(/_/g, ' ')}${domain ? ` for ${domain}` : ''}`;
    }
  }

  private getEventStatus(event: EventData): 'success' | 'warning' | 'failed' | 'info' {
    const failedTypes: EventType[] = ['transaction_failed'];
    const warningTypes: EventType[] = ['transaction_signed'];
    const successTypes: EventType[] = ['transaction_confirmed', 'name_transferred', 'contract_registered'];
    
    if (failedTypes.includes(event.type)) return 'failed';
    if (warningTypes.includes(event.type)) return 'warning';
    if (successTypes.includes(event.type)) return 'success';
    return 'info';
  }

  subscribe(eventType: EventType, callback: (data: EventData) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);
    
    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }

  track(event: EventData): void {
    this.eventQueue.push(event);
  }

  private notifyListeners(event: EventData): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  trackWalletConnected(address: string) {
    this.track({
      type: 'wallet_connected',
      address,
      data: { timestamp: Date.now() },
    });
  }

  trackWalletDisconnected(address: string) {
    this.track({
      type: 'wallet_disconnected',
      address,
      data: { timestamp: Date.now() },
    });
  }

  trackViewChange(view: string, address?: string) {
    this.track({
      type: 'view_changed',
      address,
      data: { view },
    });
  }

  trackDomainSearch(query: string, resultCount: number, address?: string) {
    this.track({
      type: 'domain_searched',
      address,
      data: { query, resultCount },
    });
  }

  trackDomainView(domain: string, address?: string) {
    this.track({
      type: 'domain_viewed',
      address,
      domain,
    });
  }

  trackDomainGroup(domain: string, groupId: string, groupName: string, address?: string) {
    this.track({
      type: 'domain_grouped',
      address,
      domain,
      data: { groupId, groupName },
    });
  }

  trackProjectAssignment(domain: string, project: string, address?: string) {
    this.track({
      type: 'domain_project_assigned',
      address,
      domain,
      data: { project },
    });
  }

  trackGroupCreated(groupId: string, groupName: string, address?: string) {
    this.track({
      type: 'group_created',
      address,
      data: { groupId, groupName },
    });
  }

  trackGroupUpdated(groupId: string, groupName: string, address?: string) {
    this.track({
      type: 'group_updated',
      address,
      data: { groupId, groupName },
    });
  }

  trackGroupDeleted(groupId: string, groupName: string, address?: string) {
    this.track({
      type: 'group_deleted',
      address,
      data: { groupId, groupName },
    });
  }

  trackTextRecordSet(domain: string, key: string, value: string, address?: string) {
    this.track({
      type: 'text_record_set',
      address,
      domain,
      data: { key, value },
    });
  }

  trackSubdomainCreated(domain: string, subdomain: string, address?: string) {
    this.track({
      type: 'subdomain_created',
      address,
      domain,
      data: { subdomain },
    });
  }

  trackTransactionConfirmed(txHash: string, address?: string) {
    this.track({
      type: 'transaction_confirmed',
      address,
      data: { txHash },
    });
  }

  trackTransactionFailed(error: string, address?: string) {
    this.track({
      type: 'transaction_failed',
      address,
      data: { error },
    });
  }

  trackSettingsSaved(address: string) {
    this.track({
      type: 'settings_saved',
      address,
      data: { timestamp: Date.now() },
    });
  }
}

export const eventTracker = new EventTracker();

