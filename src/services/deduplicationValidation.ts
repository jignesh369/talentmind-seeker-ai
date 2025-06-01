
export interface DeduplicationMetrics {
  originalCount: number;
  deduplicatedCount: number;
  duplicatesRemoved: number;
  mergeDecisions: number;
  deduplicationRate: number;
  processingTimeMs: number;
}

export class DeduplicationValidator {
  static validateMetrics(metrics: DeduplicationMetrics): boolean {
    // Basic validation checks
    if (metrics.originalCount < 0 || metrics.deduplicatedCount < 0) {
      console.error('❌ Invalid candidate counts in deduplication metrics');
      return false;
    }

    if (metrics.deduplicatedCount > metrics.originalCount) {
      console.error('❌ Deduplicated count cannot exceed original count');
      return false;
    }

    if (metrics.duplicatesRemoved !== (metrics.originalCount - metrics.deduplicatedCount)) {
      console.warn('⚠️ Duplicates removed calculation mismatch');
    }

    if (metrics.deduplicationRate < 0 || metrics.deduplicationRate > 100) {
      console.error('❌ Invalid deduplication rate');
      return false;
    }

    return true;
  }

  static calculateEfficiency(metrics: DeduplicationMetrics): {
    efficiency: number;
    quality: 'excellent' | 'good' | 'fair' | 'poor';
  } {
    const efficiency = metrics.originalCount > 0 ? 
      (metrics.duplicatesRemoved / metrics.originalCount) * 100 : 0;

    let quality: 'excellent' | 'good' | 'fair' | 'poor';
    if (efficiency >= 15) quality = 'excellent';
    else if (efficiency >= 10) quality = 'good';
    else if (efficiency >= 5) quality = 'fair';
    else quality = 'poor';

    return { efficiency, quality };
  }

  static logDeduplicationSummary(metrics: DeduplicationMetrics): void {
    const { efficiency, quality } = this.calculateEfficiency(metrics);
    
    console.log('🔄 Deduplication Summary:', {
      original: metrics.originalCount,
      final: metrics.deduplicatedCount,
      removed: metrics.duplicatesRemoved,
      efficiency: `${efficiency.toFixed(1)}%`,
      quality,
      processingTime: `${metrics.processingTimeMs}ms`,
      mergeDecisions: metrics.mergeDecisions
    });
  }
}
