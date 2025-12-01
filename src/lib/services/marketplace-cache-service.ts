/**
 * Marketplace Cache Service
 * Caches API responses to improve performance and reduce API calls
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  forceRefresh?: boolean;
}

export class MarketplaceCacheService {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes default
  private maxCacheSize = 100; // Maximum number of entries
  private accessOrder: string[] = []; // LRU tracking

  /**
   * Get cached data
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.memoryCache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.memoryCache.delete(key);
      this.removeFromAccessOrder(key);
      return null;
    }
    
    // Update access order for LRU
    this.updateAccessOrder(key);
    
    return entry.data;
  }

  /**
   * Set cached data
   */
  set<T>(key: string, data: T, options?: CacheOptions): void {
    const ttl = options?.ttl || this.defaultTTL;
    
    // Implement LRU eviction if cache is full
    if (this.memoryCache.size >= this.maxCacheSize && !this.memoryCache.has(key)) {
      this.evictLRU();
    }
    
    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
    
    this.updateAccessOrder(key);
    
    // Also persist to localStorage for longer-term caching
    this.persistToLocalStorage(key, data, ttl);
  }

  /**
   * Get or fetch data with caching
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    // Check if force refresh is requested
    if (options?.forceRefresh) {
      const data = await fetcher();
      this.set(key, data, options);
      return data;
    }
    
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    
    // Fetch fresh data
    const data = await fetcher();
    this.set(key, data, options);
    return data;
  }

  /**
   * Clear specific cache entry
   */
  clear(key: string): void {
    this.memoryCache.delete(key);
    this.removeFromAccessOrder(key);
    this.removeFromLocalStorage(key);
  }

  /**
   * Clear all cache entries
   */
  clearAll(): void {
    this.memoryCache.clear();
    this.accessOrder = [];
    this.clearLocalStorageCache();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    entries: string[];
    memoryUsage: number;
  } {
    const entries = Array.from(this.memoryCache.keys());
    const memoryUsage = this.estimateMemoryUsage();
    
    return {
      size: this.memoryCache.size,
      entries,
      memoryUsage,
    };
  }

  /**
   * Prefetch multiple keys
   */
  async prefetch(
    requests: Array<{
      key: string;
      fetcher: () => Promise<any>;
      options?: CacheOptions;
    }>
  ): Promise<void> {
    const promises = requests.map(({ key, fetcher, options }) =>
      this.getOrFetch(key, fetcher, options).catch(error => {
        console.error(`Failed to prefetch ${key}:`, error);
        return null;
      })
    );
    
    await Promise.all(promises);
  }

  /**
   * Create cache key from parameters
   */
  static createKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        if (params[key] !== undefined && params[key] !== null) {
          acc[key] = params[key];
        }
        return acc;
      }, {} as Record<string, any>);
    
    return `${prefix}:${JSON.stringify(sortedParams)}`;
  }

  // Private methods

  private updateAccessOrder(key: string): void {
    // Remove from current position
    this.removeFromAccessOrder(key);
    // Add to end (most recently used)
    this.accessOrder.push(key);
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  private evictLRU(): void {
    if (this.accessOrder.length > 0) {
      const lruKey = this.accessOrder[0];
      this.clear(lruKey);
    }
  }

  private estimateMemoryUsage(): number {
    let totalSize = 0;
    
    this.memoryCache.forEach((entry) => {
      const dataStr = JSON.stringify(entry.data);
      totalSize += dataStr.length * 2; // Rough estimate (2 bytes per char)
    });
    
    return totalSize;
  }

  private persistToLocalStorage(key: string, data: any, ttl: number): void {
    try {
      const storageKey = `marketplace_cache_${key}`;
      const entry = {
        data,
        timestamp: Date.now(),
        ttl,
      };
      
      localStorage.setItem(storageKey, JSON.stringify(entry));
    } catch (error) {
      // localStorage might be full or unavailable
      console.warn('Failed to persist to localStorage:', error);
    }
  }

  private removeFromLocalStorage(key: string): void {
    try {
      const storageKey = `marketplace_cache_${key}`;
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }
  }

  private clearLocalStorageCache(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('marketplace_cache_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear localStorage cache:', error);
    }
  }

  /**
   * Load from localStorage on initialization
   */
  async loadFromLocalStorage(): Promise<void> {
    try {
      const keys = Object.keys(localStorage);
      const now = Date.now();
      
      keys.forEach(key => {
        if (key.startsWith('marketplace_cache_')) {
          const cacheKey = key.replace('marketplace_cache_', '');
          const entryStr = localStorage.getItem(key);
          
          if (entryStr) {
            try {
              const entry = JSON.parse(entryStr) as CacheEntry<any>;
              
              // Check if still valid
              if (now - entry.timestamp <= entry.ttl) {
                this.memoryCache.set(cacheKey, entry);
                this.updateAccessOrder(cacheKey);
              } else {
                // Remove expired entry
                localStorage.removeItem(key);
              }
            } catch (error) {
              // Invalid entry, remove it
              localStorage.removeItem(key);
            }
          }
        }
      });
    } catch (error) {
      console.warn('Failed to load from localStorage:', error);
    }
  }
}

// Singleton instance
export const marketplaceCacheService = new MarketplaceCacheService();

// Initialize by loading from localStorage
marketplaceCacheService.loadFromLocalStorage();

// Cache key helpers
export const CacheKeys = {
  ensListings: (chainId: number) => 
    MarketplaceCacheService.createKey('ens_listings', { chainId }),
    
  ensOffers: (chainId: number) => 
    MarketplaceCacheService.createKey('ens_offers', { chainId }),
    
  ensStats: (chainId: number) => 
    MarketplaceCacheService.createKey('ens_stats', { chainId }),
    
  domainSearch: (query: string, chainId: number) => 
    MarketplaceCacheService.createKey('domain_search', { query, chainId }),
    
  domainDetails: (domain: string) => 
    MarketplaceCacheService.createKey('domain_details', { domain }),
    
  priceHistory: (domain: string) => 
    MarketplaceCacheService.createKey('price_history', { domain }),
};

// Cache TTL configurations
export const CacheTTL = {
  listings: 2 * 60 * 1000,        // 2 minutes for active listings
  offers: 2 * 60 * 1000,          // 2 minutes for offers
  stats: 5 * 60 * 1000,           // 5 minutes for stats
  search: 5 * 60 * 1000,          // 5 minutes for search results
  domainDetails: 10 * 60 * 1000,  // 10 minutes for domain details
  priceHistory: 30 * 60 * 1000,   // 30 minutes for price history
};






