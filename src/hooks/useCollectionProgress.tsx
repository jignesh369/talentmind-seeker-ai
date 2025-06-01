
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
    totalPhases: 5
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
      '⚡ Initializing AI-enhanced collection...',
      '🎯 Processing query with smart optimization...',
      '🌐 Parallel source collection (80s budget)...',
      '🤖 Applying AI processing and validation...',
      '🔄 Smart deduplication and scoring...',
      '✨ Finalizing enhanced results...',
    ];
    
    let phaseCount = 0;
    updateProgress(phases[0], 0);
    
    const interval = setInterval(() => {
      if (phaseCount < phases.length - 1) {
        phaseCount++;
        updateProgress(phases[phaseCount], phaseCount);
      }
    }, 10000); // Slower progression for longer timeout
    
    return () => clearInterval(interval);
  }, [updateProgress]);

  const resetProgress = useCallback(() => {
    setProgress({
      message: '',
      phase: 0,
      totalPhases: 5
    });
  }, []);

  return {
    progress,
    updateProgress,
    startProgress,
    resetProgress
  };
};
