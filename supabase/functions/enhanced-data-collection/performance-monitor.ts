
export interface PerformanceMetrics {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export interface QueryCacheEntry {
  query: string;
  location?: string;
  sources: string[];
  result: any;
  timestamp: number;
  expiresAt: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private queryCache = new Map<string, QueryCacheEntry>();
  private readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

  startOperation(operation: string, metadata?: Record<string, any>): string {
    const id = `${operation}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.metrics.push({
      operation: `${operation}:${id}`,
      startTime: Date.now(),
      success: false,
      metadata
    });

    return id;
  }

  endOperation(operation: string, id: string, success: boolean = true, error?: string, metadata?: Record<string, any>) {
    const fullOperation = `${operation}:${id}`;
    const metric = this.metrics.find(m => m.operation === fullOperation);
    
    if (metric) {
      metric.endTime = Date.now();
      metric.duration = metric.endTime - metric.startTime;
      metric.success = success;
      metric.error = error;
      if (metadata) {
        metric.metadata = { ...metric.metadata, ...metadata };
      }
    }
  }

  getMetrics(): PerformanceMetrics[] {
    return this.metrics.filter(m => m.endTime).slice(-50); // Keep last 50 metrics
  }

  getAverageTime(operation: string): number {
    const operationMetrics = this.metrics.filter(m => 
      m.operation.startsWith(operation) && m.duration && m.success
    );
    
    if (operationMetrics.length === 0) return 0;
    
    const total = operationMetrics.reduce((sum, m) => sum + (m.duration || 0), 0);
    return Math.round(total / operationMetrics.length);
  }

  getSuccessRate(operation: string): number {
    const operationMetrics = this.metrics.filter(m => m.operation.startsWith(operation));
    if (operationMetrics.length === 0) return 100;
    
    const successful = operationMetrics.filter(m => m.success).length;
    return Math.round((successful / operationMetrics.length) * 100);
  }

  // Query Caching
  generateCacheKey(query: string, location?: string, sources: string[] = []): string {
    const normalizedQuery = query.toLowerCase().trim();
    const normalizedLocation = location?.toLowerCase().trim() || '';
    const sortedSources = [...sources].sort().join(',');
    
    return `${normalizedQuery}|${normalizedLocation}|${sortedSources}`;
  }

  getCachedResult(query: string, location?: string, sources: string[] = []): any | null {
    const key = this.generateCacheKey(query, location, sources);
    const cached = this.queryCache.get(key);
    
    if (!cached) return null;
    
    // Check if cache is expired
    if (Date.now() > cached.expiresAt) {
      this.queryCache.delete(key);
      return null;
    }
    
    return cached.result;
  }

  cacheResult(query: string, result: any, location?: string, sources: string[] = []) {
    const key = this.generateCacheKey(query, location, sources);
    
    this.queryCache.set(key, {
      query,
      location,
      sources,
      result,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.CACHE_DURATION
    });
    
    // Cleanup old cache entries
    this.cleanupCache();
  }

  private cleanupCache() {
    const now = Date.now();
    for (const [key, entry] of this.queryCache.entries()) {
      if (now > entry.expiresAt) {
        this.queryCache.delete(key);
      }
    }
  }

  getCacheStats() {
    return {
      entries: this.queryCache.size,
      hitRate: this.calculateHitRate(),
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  private calculateHitRate(): number {
    const cacheHits = this.metrics.filter(m => 
      m.operation.includes('cache-hit') && m.success
    ).length;
    
    const cacheMisses = this.metrics.filter(m => 
      m.operation.includes('cache-miss')
    ).length;
    
    const total = cacheHits + cacheMisses;
    return total > 0 ? Math.round((cacheHits / total) * 100) : 0;
  }

  private estimateMemoryUsage(): string {
    let totalSize = 0;
    for (const entry of this.queryCache.values()) {
      totalSize += JSON.stringify(entry).length;
    }
    
    if (totalSize < 1024) return `${totalSize}B`;
    if (totalSize < 1024 * 1024) return `${Math.round(totalSize / 1024)}KB`;
    return `${Math.round(totalSize / (1024 * 1024))}MB`;
  }

  logPerformanceSummary() {
    const summary = {
      totalOperations: this.metrics.length,
      avgSourceTime: this.getAverageTime('source-collection'),
      avgAITime: this.getAverageTime('ai-enhancement'),
      successRate: this.getSuccessRate('collection'),
      cacheStats: this.getCacheStats()
    };
    
    console.log('📊 Performance Summary:', summary);
    return summary;
  }
}
