
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
    totalPhases: 6
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
      '⚡ Initializing enhanced collection...',
      '🎯 Processing query and optimizing sources...',
      '🌐 Parallel data collection in progress...',
      '🤖 Applying AI processing with fallbacks...',
      '🔄 Smart deduplication and validation...',
      '✨ Finalizing results (this may take longer)...',
      '🎉 Collection completed successfully!'
    ];
    
    let phaseCount = 0;
    updateProgress(phases[0], 0);
    
    const interval = setInterval(() => {
      if (phaseCount < phases.length - 1) {
        phaseCount++;
        updateProgress(phases[phaseCount], phaseCount);
      }
    }, 12000); // Slower progression for extended timeout
    
    return () => clearInterval(interval);
  }, [updateProgress]);

  const resetProgress = useCallback(() => {
    setProgress({
      message: '',
      phase: 0,
      totalPhases: 6
    });
  }, []);

  return {
    progress,
    updateProgress,
    startProgress,
    resetProgress
  };
};
