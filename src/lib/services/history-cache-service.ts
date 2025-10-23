/**
 * History Cache Service
 * Manages caching of domain history data to reduce API calls
 */

import { DomainHistoryEvent } from '../ens/ens-utils';

interface CachedHistory {
  events: DomainHistoryEvent[];
  timestamp: number;
  domain: string;
}

const CACHE_PREFIX = 'ens_history_';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

class HistoryCacheService {
  /**
   * Get cached history for a domain
   */
  getCachedHistory(domainName: string): DomainHistoryEvent[] | null {
    try {
      const cached = localStorage.getItem(`${CACHE_PREFIX}${domainName}`);
      if (!cached) {
        return null;
      }

      const data: CachedHistory = JSON.parse(cached);
      
      // Check if cache is expired
      const now = Date.now();
      if (now - data.timestamp > CACHE_DURATION) {
        this.clearHistory(domainName);
        return null;
      }

      // Parse dates back from ISO strings
      return data.events.map(event => ({
        ...event,
        date: new Date(event.date),
      }));
    } catch (error) {
      console.error('Error reading history cache:', error);
      return null;
    }
  }

  /**
   * Cache history for a domain
   */
  cacheHistory(domainName: string, events: DomainHistoryEvent[]): void {
    try {
      const data: CachedHistory = {
        events,
        timestamp: Date.now(),
        domain: domainName,
      };
      
      localStorage.setItem(`${CACHE_PREFIX}${domainName}`, JSON.stringify(data));
    } catch (error) {
      console.error('Error caching history:', error);
    }
  }

  /**
   * Clear cached history for a domain
   */
  clearHistory(domainName: string): void {
    try {
      localStorage.removeItem(`${CACHE_PREFIX}${domainName}`);
    } catch (error) {
      console.error('Error clearing history cache:', error);
    }
  }

  /**
   * Clear all cached history
   */
  clearAllHistory(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(CACHE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Error clearing all history cache:', error);
    }
  }

  /**
   * Check if domain has cached history
   */
  hasCachedHistory(domainName: string): boolean {
    return this.getCachedHistory(domainName) !== null;
  }

  /**
   * Get cache timestamp for a domain
   */
  getCacheTimestamp(domainName: string): number | null {
    try {
      const cached = localStorage.getItem(`${CACHE_PREFIX}${domainName}`);
      if (!cached) {
        return null;
      }

      const data: CachedHistory = JSON.parse(cached);
      return data.timestamp;
    } catch (error) {
      return null;
    }
  }
}

export const historyCacheService = new HistoryCacheService();

