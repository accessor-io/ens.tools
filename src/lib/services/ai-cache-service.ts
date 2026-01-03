/**
 * AI Cache Service
 * Caches AI queries, embeddings, and responses to reduce API costs and latency
 */

export interface CachedQuery {
  query: string;
  response: string;
  timestamp: number;
  expiresAt: number;
  metadata?: Record<string, any>;
}

export interface CachedEmbedding {
  text: string;
  embedding: number[];
  timestamp: number;
}

export class AICacheService {
  private readonly CACHE_PREFIX = 'ai_cache_';
  private readonly EMBEDDING_PREFIX = 'ai_embedding_';
  private readonly DEFAULT_TTL = 3600000; // 1 hour in milliseconds
  private readonly EMBEDDING_TTL = 86400000; // 24 hours for embeddings

  /**
   * Get cached query result
   */
  getCachedQuery(query: string): string | null {
    try {
      const cacheKey = this.CACHE_PREFIX + this.hashQuery(query);
      const cached = localStorage.getItem(cacheKey);
      
      if (!cached) {
        return null;
      }

      const cachedData: CachedQuery = JSON.parse(cached);
      
      // Check if expired
      if (Date.now() > cachedData.expiresAt) {
        localStorage.removeItem(cacheKey);
        return null;
      }

      return cachedData.response;
    } catch (error) {
      console.error('Error reading cache:', error);
      return null;
    }
  }

  /**
   * Cache query result
   */
  cacheQuery(
    query: string,
    response: string,
    ttl: number = this.DEFAULT_TTL,
    metadata?: Record<string, any>
  ): void {
    try {
      const cacheKey = this.CACHE_PREFIX + this.hashQuery(query);
      const cachedData: CachedQuery = {
        query,
        response,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl,
        metadata,
      };

      localStorage.setItem(cacheKey, JSON.stringify(cachedData));
    } catch (error) {
      console.error('Error caching query:', error);
      // If storage is full, try to clear old entries
      this.clearExpiredEntries();
    }
  }

  /**
   * Get cached embedding
   */
  getCachedEmbedding(text: string): number[] | null {
    try {
      const cacheKey = this.EMBEDDING_PREFIX + this.hashQuery(text);
      const cached = localStorage.getItem(cacheKey);
      
      if (!cached) {
        return null;
      }

      const cachedData: CachedEmbedding = JSON.parse(cached);
      
      // Check if expired
      if (Date.now() > cachedData.timestamp + this.EMBEDDING_TTL) {
        localStorage.removeItem(cacheKey);
        return null;
      }

      return cachedData.embedding;
    } catch (error) {
      console.error('Error reading embedding cache:', error);
      return null;
    }
  }

  /**
   * Cache embedding
   */
  cacheEmbedding(text: string, embedding: number[]): void {
    try {
      const cacheKey = this.EMBEDDING_PREFIX + this.hashQuery(text);
      const cachedData: CachedEmbedding = {
        text,
        embedding,
        timestamp: Date.now(),
      };

      localStorage.setItem(cacheKey, JSON.stringify(cachedData));
    } catch (error) {
      console.error('Error caching embedding:', error);
      this.clearExpiredEntries();
    }
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredEntries(): void {
    try {
      const keys = Object.keys(localStorage);
      const now = Date.now();
      let cleared = 0;

      keys.forEach(key => {
        if (key.startsWith(this.CACHE_PREFIX) || key.startsWith(this.EMBEDDING_PREFIX)) {
          try {
            const cached = localStorage.getItem(key);
            if (cached) {
              const data = JSON.parse(cached);
              const expiresAt = data.expiresAt || (data.timestamp + this.EMBEDDING_TTL);
              
              if (now > expiresAt) {
                localStorage.removeItem(key);
                cleared++;
              }
            }
          } catch {
            // Invalid cache entry, remove it
            localStorage.removeItem(key);
            cleared++;
          }
        }
      });

      if (cleared > 0) {
        console.log(`Cleared ${cleared} expired cache entries`);
      }
    } catch (error) {
      console.error('Error clearing expired entries:', error);
    }
  }

  /**
   * Clear all AI cache
   */
  clearAllCache(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.CACHE_PREFIX) || key.startsWith(this.EMBEDDING_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Error clearing all cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalQueries: number;
    totalEmbeddings: number;
    totalSize: number;
  } {
    try {
      const keys = Object.keys(localStorage);
      let totalQueries = 0;
      let totalEmbeddings = 0;
      let totalSize = 0;

      keys.forEach(key => {
        if (key.startsWith(this.CACHE_PREFIX)) {
          totalQueries++;
          const cached = localStorage.getItem(key);
          if (cached) {
            totalSize += cached.length;
          }
        } else if (key.startsWith(this.EMBEDDING_PREFIX)) {
          totalEmbeddings++;
          const cached = localStorage.getItem(key);
          if (cached) {
            totalSize += cached.length;
          }
        }
      });

      return {
        totalQueries,
        totalEmbeddings,
        totalSize,
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { totalQueries: 0, totalEmbeddings: 0, totalSize: 0 };
    }
  }

  /**
   * Hash query for cache key
   */
  private hashQuery(query: string): string {
    // Simple hash function - in production, use crypto.subtle.digest
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

export const aiCacheService = new AICacheService();
