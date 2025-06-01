
import { useState, useCallback } from 'react';
import { DeduplicationValidator, DeduplicationMetrics } from '@/services/deduplicationValidation';

export const useDeduplicationMonitor = () => {
  const [metrics, setMetrics] = useState<DeduplicationMetrics | null>(null);
  const [isValid, setIsValid] = useState<boolean>(true);

  const validateAndTrack = useCallback((newMetrics: DeduplicationMetrics) => {
    const valid = DeduplicationValidator.validateMetrics(newMetrics);
    setIsValid(valid);
    setMetrics(newMetrics);
    
    if (valid) {
      DeduplicationValidator.logDeduplicationSummary(newMetrics);
    }
    
    return valid;
  }, []);

  const getEfficiency = useCallback(() => {
    if (!metrics) return null;
    return DeduplicationValidator.calculateEfficiency(metrics);
  }, [metrics]);

  return {
    metrics,
    isValid,
    validateAndTrack,
    getEfficiency
  };
};
