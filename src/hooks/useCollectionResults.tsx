
import { useState } from 'react';
import type { DataCollectionResponse } from '@/services/dataCollectionService';

export const useCollectionResults = () => {
  const [result, setResult] = useState<DataCollectionResponse | null>(null);

  const updateResult = (newResult: DataCollectionResponse) => {
    setResult(newResult);
  };

  const clearResult = () => {
    setResult(null);
  };

  const getMetrics = () => {
    if (!result) return null;

    const successfulSources = Object.values(result.results).filter((res: any) => !res.error).length;
    const processingTime = result.performance_metrics?.total_time_ms || 0;
    const timeEfficiency = result.quality_metrics?.time_efficiency || 'N/A';
    const successRate = result.performance_metrics?.success_rate || 0;

    return {
      successfulSources,
      processingTime,
      timeEfficiency,
      successRate,
      totalSources: Object.keys(result.results).length
    };
  };

  return {
    result,
    updateResult,
    clearResult,
    getMetrics
  };
};
