
import type { DataCollectionResponse } from '@/services/dataCollectionService';

export interface NotificationOptions {
  title: string;
  description: string;
  variant?: 'default' | 'destructive';
}

export class NotificationService {
  static generateSuccessNotification(result: DataCollectionResponse): NotificationOptions {
    const successfulSources = Object.values(result.results).filter((res: any) => !res.error).length;
    const processingTime = result.performance_metrics?.total_time_ms || 0;
    const successRate = result.performance_metrics?.success_rate || 0;

    // Generate performance highlights
    const performanceHighlights = [];
    if (processingTime < 20000) performanceHighlights.push('⚡ Ultra-fast');
    else if (processingTime < 40000) performanceHighlights.push('🚀 Fast');
    if (result.quality_metrics?.parallel_processing) performanceHighlights.push('🔀 Parallel');
    if (successRate >= 75) performanceHighlights.push('✅ High success');

    const timeMessage = `${Math.round(processingTime / 1000)}s`;
    const sourcesMessage = `${successfulSources}/${Object.keys(result.results).length} sources`;

    const successMessage = `Found ${result.total_validated} candidates in ${timeMessage}`;
    const performanceMessage = performanceHighlights.length > 0 ? ` • ${performanceHighlights.join(' ')}` : '';
    const sourcesDisplayMessage = ` • ${sourcesMessage}`;

    return {
      title: "⚡ Optimized Collection Completed",
      description: `${successMessage}${performanceMessage}${sourcesDisplayMessage}`,
      variant: result.total_validated > 0 ? "default" : "destructive"
    };
  }

  static generateErrorNotification(error: Error): NotificationOptions {
    let errorMessage = "Failed to collect candidates";
    let debugInfo = "";

    if (error.message?.includes('Collection timeout')) {
      errorMessage = "Collection timeout";
      debugInfo = "Try fewer sources or a more specific query";
    } else if (error.message?.includes('timeout')) {
      errorMessage = "Request timeout";
      debugInfo = "Some sources took longer than expected";
    } else if (error.message?.includes('Failed to fetch')) {
      errorMessage = "Network issue";
      debugInfo = "Check connection and try again";
    }

    return {
      title: "Collection Failed",
      description: errorMessage + (debugInfo ? ` - ${debugInfo}` : ''),
      variant: "destructive"
    };
  }
}
