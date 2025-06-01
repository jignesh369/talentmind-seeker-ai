
export interface CacheConfig {
  enabled: boolean;
  maxEntries: number;
  ttlMinutes: number;
  compression: boolean;
}

export interface SmartCacheEntry {
  key: string;
  data: any;
  timestamp: number;
  hitCount: number;
  lastAccessed: number;
  queryFingerprint: string;
  size: number;
}

export class SmartQueryCache {
  private cache = new Map<string, SmartCacheEntry>();
  private config: CacheConfig;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalSize: 0
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      enabled: true,
      maxEntries: 100,
      ttlMinutes: 15,
      compression: false,
      ...config
    };
  }

  generateFingerprint(query: string, location?: string, sources: string[] = []): string {
    // Create a normalized fingerprint for smart matching
    const normalizedQuery = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    const queryWords = normalizedQuery.split(' ').filter(w => w.length > 2);
    const keyTerms = queryWords.slice(0, 5).sort(); // Top 5 terms, sorted
    
    const normalizedLocation = location?.toLowerCase().replace(/[^\w]/g, '') || '';
    const sortedSources = [...sources].sort();
    
    return `${keyTerms.join('+')}_${normalizedLocation}_${sortedSources.join(',')}`;
  }

  async get(query: string, location?: string, sources: string[] = []): Promise<any | null> {
    if (!this.config.enabled) return null;

    const fingerprint = this.generateFingerprint(query, location, sources);
    const entry = this.cache.get(fingerprint);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check TTL
    const ageMinutes = (Date.now() - entry.timestamp) / (1000 * 60);
    if (ageMinutes > this.config.ttlMinutes) {
      this.cache.delete(fingerprint);
      this.stats.evictions++;
      this.stats.misses++;
      return null;
    }

    // Update access statistics
    entry.hitCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;

    console.log(`🎯 Cache HIT for query: ${query.slice(0, 50)}...`);
    return entry.data;
  }

  async set(query: string, data: any, location?: string, sources: string[] = []): Promise<void> {
    if (!this.config.enabled) return;

    const fingerprint = this.generateFingerprint(query, location, sources);
    const dataSize = JSON.stringify(data).length;

    // Check if we need to evict entries
    if (this.cache.size >= this.config.maxEntries) {
      this.evictLeastUsed();
    }

    const entry: SmartCacheEntry = {
      key: fingerprint,
      data,
      timestamp: Date.now(),
      hitCount: 0,
      lastAccessed: Date.now(),
      queryFingerprint: fingerprint,
      size: dataSize
    };

    this.cache.set(fingerprint, entry);
    this.stats.totalSize += dataSize;

    console.log(`💾 Cached result for query: ${query.slice(0, 50)}... (${dataSize} bytes)`);
  }

  private evictLeastUsed(): void {
    if (this.cache.size === 0) return;

    // Find the least recently used entry with lowest hit count
    let lruEntry: SmartCacheEntry | null = null;
    let lruKey = '';

    for (const [key, entry] of this.cache.entries()) {
      if (!lruEntry || 
          entry.lastAccessed < lruEntry.lastAccessed ||
          (entry.lastAccessed === lruEntry.lastAccessed && entry.hitCount < lruEntry.hitCount)) {
        lruEntry = entry;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.stats.evictions++;
      this.stats.totalSize -= lruEntry!.size;
      console.log(`🗑️ Evicted cache entry: ${lruKey}`);
    }
  }

  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? Math.round((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100)
      : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      entries: this.cache.size,
      avgEntrySize: this.cache.size > 0 ? Math.round(this.stats.totalSize / this.cache.size) : 0,
      memoryUsage: this.formatBytes(this.stats.totalSize)
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
    return `${Math.round(bytes / (1024 * 1024))}MB`;
  }

  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0, totalSize: 0 };
    console.log('🧹 Cache cleared');
  }

  // Advanced cache warming for common queries
  async warmCache(commonQueries: Array<{query: string, location?: string, sources?: string[]}>) {
    console.log(`🔥 Warming cache with ${commonQueries.length} common queries...`);
    
    for (const queryConfig of commonQueries) {
      const fingerprint = this.generateFingerprint(
        queryConfig.query, 
        queryConfig.location, 
        queryConfig.sources
      );
      
      if (!this.cache.has(fingerprint)) {
        // This would trigger a background collection for cache warming
        console.log(`🔥 Would warm cache for: ${queryConfig.query}`);
      }
    }
  }
}
