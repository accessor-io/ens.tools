/**
 * Watchlist Service
 * Manages user's domain watchlist with price alerts
 */

import { toast } from 'sonner';

export interface WatchlistItem {
  domainName: string;
  addedAt: Date;
  priceAlert?: {
    targetPrice: string;
    direction: 'above' | 'below';
    enabled: boolean;
  };
  notes?: string;
}

export interface PriceAlert {
  domainName: string;
  currentPrice: string;
  targetPrice: string;
  direction: 'above' | 'below';
  triggeredAt: Date;
}

class WatchlistService {
  private readonly STORAGE_KEY = 'ens_marketplace_watchlist';
  private readonly ALERTS_KEY = 'ens_price_alerts';
  private watchlist: Map<string, WatchlistItem> = new Map();
  private alertHistory: PriceAlert[] = [];

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Add domain to watchlist
   */
  async addToWatchlist(
    domainName: string,
    priceAlert?: WatchlistItem['priceAlert'],
    notes?: string
  ): Promise<void> {
    const item: WatchlistItem = {
      domainName,
      addedAt: new Date(),
      priceAlert,
      notes,
    };

    this.watchlist.set(domainName, item);
    this.saveToStorage();
    
    toast.success(`Added ${domainName} to watchlist`);
  }

  /**
   * Remove domain from watchlist
   */
  async removeFromWatchlist(domainName: string): Promise<void> {
    const existed = this.watchlist.delete(domainName);
    
    if (existed) {
      this.saveToStorage();
      toast.success(`Removed ${domainName} from watchlist`);
    }
  }

  /**
   * Update watchlist item
   */
  async updateWatchlistItem(
    domainName: string,
    updates: Partial<Omit<WatchlistItem, 'domainName' | 'addedAt'>>
  ): Promise<void> {
    const item = this.watchlist.get(domainName);
    
    if (!item) {
      throw new Error('Domain not in watchlist');
    }

    const updated: WatchlistItem = {
      ...item,
      ...updates,
    };

    this.watchlist.set(domainName, updated);
    this.saveToStorage();
  }

  /**
   * Get all watchlist items
   */
  getWatchlist(): WatchlistItem[] {
    return Array.from(this.watchlist.values());
  }

  /**
   * Get specific watchlist item
   */
  getWatchlistItem(domainName: string): WatchlistItem | undefined {
    return this.watchlist.get(domainName);
  }

  /**
   * Check if domain is in watchlist
   */
  isWatched(domainName: string): boolean {
    return this.watchlist.has(domainName);
  }

  /**
   * Set price alert for a domain
   */
  async setPriceAlert(
    domainName: string,
    targetPrice: string,
    direction: 'above' | 'below'
  ): Promise<void> {
    const item = this.watchlist.get(domainName);
    
    if (!item) {
      // Add to watchlist with alert
      await this.addToWatchlist(domainName, {
        targetPrice,
        direction,
        enabled: true,
      });
    } else {
      // Update existing item
      await this.updateWatchlistItem(domainName, {
        priceAlert: {
          targetPrice,
          direction,
          enabled: true,
        },
      });
    }

    toast.success(
      `Price alert set: Notify when ${domainName} goes ${direction} ${targetPrice} ETH`
    );
  }

  /**
   * Remove price alert
   */
  async removePriceAlert(domainName: string): Promise<void> {
    await this.updateWatchlistItem(domainName, {
      priceAlert: undefined,
    });
    
    toast.success(`Price alert removed for ${domainName}`);
  }

  /**
   * Check price alerts against current prices
   */
  async checkPriceAlerts(
    currentPrices: Map<string, string>
  ): Promise<PriceAlert[]> {
    const triggered: PriceAlert[] = [];
    const now = new Date();

    for (const [domainName, item] of this.watchlist.entries()) {
      if (!item.priceAlert || !item.priceAlert.enabled) continue;

      const currentPrice = currentPrices.get(domainName);
      if (!currentPrice) continue;

      const current = parseFloat(currentPrice);
      const target = parseFloat(item.priceAlert.targetPrice);

      const shouldTrigger = 
        (item.priceAlert.direction === 'above' && current >= target) ||
        (item.priceAlert.direction === 'below' && current <= target);

      if (shouldTrigger) {
        const alert: PriceAlert = {
          domainName,
          currentPrice,
          targetPrice: item.priceAlert.targetPrice,
          direction: item.priceAlert.direction,
          triggeredAt: now,
        };

        triggered.push(alert);
        this.alertHistory.push(alert);

        // Disable the alert after triggering
        item.priceAlert.enabled = false;
        
        // Show notification
        this.showPriceAlertNotification(alert);
      }
    }

    if (triggered.length > 0) {
      this.saveToStorage();
    }

    return triggered;
  }

  /**
   * Get alert history
   */
  getAlertHistory(): PriceAlert[] {
    return [...this.alertHistory];
  }

  /**
   * Clear alert history
   */
  clearAlertHistory(): void {
    this.alertHistory = [];
    this.saveAlertHistory();
  }

  /**
   * Export watchlist as JSON
   */
  exportWatchlist(): string {
    const data = {
      watchlist: Array.from(this.watchlist.entries()),
      alertHistory: this.alertHistory,
      exportedAt: new Date().toISOString(),
    };
    
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import watchlist from JSON
   */
  importWatchlist(jsonData: string): void {
    try {
      const data = JSON.parse(jsonData);
      
      if (!data.watchlist || !Array.isArray(data.watchlist)) {
        throw new Error('Invalid watchlist format');
      }

      // Clear current watchlist
      this.watchlist.clear();
      
      // Import items
      for (const [domainName, item] of data.watchlist) {
        // Parse dates
        if (item.addedAt) {
          item.addedAt = new Date(item.addedAt);
        }
        
        this.watchlist.set(domainName, item);
      }

      // Import alert history if present
      if (data.alertHistory && Array.isArray(data.alertHistory)) {
        this.alertHistory = data.alertHistory.map((alert: any) => ({
          ...alert,
          triggeredAt: new Date(alert.triggeredAt),
        }));
      }

      this.saveToStorage();
      toast.success('Watchlist imported successfully');
    } catch (error) {
      console.error('Failed to import watchlist:', error);
      toast.error('Failed to import watchlist');
      throw error;
    }
  }

  // Private methods

  private loadFromStorage(): void {
    // Load watchlist
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        this.watchlist = new Map(
          data.map((item: any) => [
            item.domainName,
            {
              ...item,
              addedAt: new Date(item.addedAt),
            },
          ])
        );
      }
    } catch (error) {
      console.error('Failed to load watchlist:', error);
    }

    // Load alert history
    try {
      const saved = localStorage.getItem(this.ALERTS_KEY);
      if (saved) {
        this.alertHistory = JSON.parse(saved).map((alert: any) => ({
          ...alert,
          triggeredAt: new Date(alert.triggeredAt),
        }));
      }
    } catch (error) {
      console.error('Failed to load alert history:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const data = Array.from(this.watchlist.values());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save watchlist:', error);
    }
    
    this.saveAlertHistory();
  }

  private saveAlertHistory(): void {
    try {
      localStorage.setItem(this.ALERTS_KEY, JSON.stringify(this.alertHistory));
    } catch (error) {
      console.error('Failed to save alert history:', error);
    }
  }

  private showPriceAlertNotification(alert: PriceAlert): void {
    const message = `${alert.domainName} is now ${alert.currentPrice} ETH`;
    const description = `Price went ${alert.direction} your target of ${alert.targetPrice} ETH`;
    
    toast.success(message, {
      description,
      duration: 10000, // Show for 10 seconds
      action: {
        label: 'View',
        onClick: () => {
          // Navigate to domain details
          window.location.href = `/marketplace?domain=${alert.domainName}`;
        },
      },
    });

    // Also try to show browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(message, {
        body: description,
        icon: '/favicon.ico',
        tag: `price-alert-${alert.domainName}`,
      });
    }
  }

  /**
   * Request notification permission
   */
  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }
}

// Singleton instance
export const watchlistService = new WatchlistService();

// Auto-check price alerts every 5 minutes
setInterval(() => {
  // This would be called from the marketplace component with current prices
  // watchlistService.checkPriceAlerts(currentPrices);
}, 5 * 60 * 1000);











