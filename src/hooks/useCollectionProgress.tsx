
import { useState, useCallback } from 'react';

export interface ProgressState {
  message: string;
  phase: number;
  totalPhases: number;
}

export const useCollectionProgress = () => {
  const [progress, setProgress] = useState<ProgressState>({
    message: '',
    phase: 0,
    totalPhases: 4
  });

  const updateProgress = useCallback((message: string, phase?: number) => {
    setProgress(prev => ({
      ...prev,
      message,
      phase: phase ?? prev.phase
    }));
  }, []);

  const startProgress = useCallback(() => {
    const phases = [
      '⚡ Initializing optimized collection...',
      '🎯 Processing query (fast mode)...',
      '🌐 Parallel source collection (60s budget)...',
      '🔄 Fast deduplication...',
      '✨ Finalizing results...',
    ];
    
    let phaseCount = 0;
    updateProgress(phases[0], 0);
    
    const interval = setInterval(() => {
      if (phaseCount < phases.length - 1) {
        phaseCount++;
        updateProgress(phases[phaseCount], phaseCount);
      }
    }, 8000);
    
    return () => clearInterval(interval);
  }, [updateProgress]);

  const resetProgress = useCallback(() => {
    setProgress({
      message: '',
      phase: 0,
      totalPhases: 4
    });
  }, []);

  return {
    progress,
    updateProgress,
    startProgress,
    resetProgress
  };
};
