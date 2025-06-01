
export class MemoryManager {
  private activePromises: Set<Promise<any>> = new Set();
  private timeouts: Set<NodeJS.Timeout> = new Set();
  private intervals: Set<NodeJS.Timer> = new Set();
  private abortControllers: Set<AbortController> = new Set();
  private cleanupCallbacks: Set<() => void> = new Set();

  // Track and manage promises
  trackPromise<T>(promise: Promise<T>): Promise<T> {
    this.activePromises.add(promise);
    
    promise.finally(() => {
      this.activePromises.delete(promise);
    });

    return promise;
  }

  // Track and manage timeouts
  createTimeout(callback: () => void, ms: number): NodeJS.Timeout {
    const timeout = setTimeout(() => {
      this.timeouts.delete(timeout);
      try {
        callback();
      } catch (error) {
        console.warn('Timeout callback error:', error);
      }
    }, ms);
    
    this.timeouts.add(timeout);
    return timeout;
  }

  // Track and manage intervals
  createInterval(callback: () => void, ms: number): NodeJS.Timer {
    const interval = setInterval(() => {
      try {
        callback();
      } catch (error) {
        console.warn('Interval callback error:', error);
      }
    }, ms);
    
    this.intervals.add(interval);
    return interval;
  }

  // Track and manage abort controllers
  createAbortController(): AbortController {
    const controller = new AbortController();
    this.abortControllers.add(controller);
    
    // Auto-remove when aborted
    controller.signal.addEventListener('abort', () => {
      this.abortControllers.delete(controller);
    });
    
    return controller;
  }

  // Register cleanup callbacks
  onCleanup(callback: () => void): void {
    this.cleanupCallbacks.add(callback);
  }

  // Create a managed fetch with timeout and abort
  async managedFetch(url: string, options: RequestInit = {}, timeoutMs: number = 30000): Promise<Response> {
    const controller = this.createAbortController();
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      this.createTimeout(() => {
        controller.abort();
        reject(new Error(`Request timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    const fetchPromise = this.trackPromise(
      fetch(url, {
        ...options,
        signal: controller.signal
      })
    );

    try {
      return await Promise.race([fetchPromise, timeoutPromise]);
    } catch (error) {
      controller.abort();
      throw error;
    }
  }

  // Clean up all tracked resources
  cleanup(): void {
    // Run cleanup callbacks first
    this.cleanupCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.warn('Cleanup callback error:', error);
      }
    });
    this.cleanupCallbacks.clear();

    // Cancel all abort controllers
    this.abortControllers.forEach(controller => {
      try {
        if (!controller.signal.aborted) {
          controller.abort();
        }
      } catch (e) {
        // Ignore abort errors
      }
    });
    this.abortControllers.clear();

    // Clear all timeouts
    this.timeouts.forEach(timeout => {
      try {
        clearTimeout(timeout);
      } catch (e) {
        // Ignore clear errors
      }
    });
    this.timeouts.clear();

    // Clear all intervals
    this.intervals.forEach(interval => {
      try {
        clearInterval(interval);
      } catch (e) {
        // Ignore clear errors
      }
    });
    this.intervals.clear();

    // Clear promise tracking
    this.activePromises.clear();
  }

  // Get current resource usage stats
  getResourceStats() {
    return {
      activePromises: this.activePromises.size,
      activeTimeouts: this.timeouts.size,
      activeIntervals: this.intervals.size,
      activeControllers: this.abortControllers.size,
      cleanupCallbacks: this.cleanupCallbacks.size,
      memoryUsage: this.getMemoryUsage()
    };
  }

  private getMemoryUsage() {
    try {
      // Basic memory estimation
      return {
        promiseCount: this.activePromises.size,
        controllerCount: this.abortControllers.size,
        timerCount: this.timeouts.size + this.intervals.size
      };
    } catch (error) {
      return { error: 'Memory usage unavailable' };
    }
  }

  // Force cleanup with optional grace period
  async forceCleanup(gracePeriodMs: number = 1000): Promise<void> {
    console.log(`🧹 Starting cleanup (${this.activePromises.size} active promises)`);
    
    // Give active operations a chance to complete
    if (this.activePromises.size > 0 && gracePeriodMs > 0) {
      try {
        const timeoutPromise = new Promise(resolve => setTimeout(resolve, gracePeriodMs));
        const settlePromise = Promise.allSettled(Array.from(this.activePromises));
        
        await Promise.race([settlePromise, timeoutPromise]);
        console.log(`✅ Graceful cleanup completed`);
      } catch (e) {
        console.warn('Graceful cleanup failed:', e);
      }
    }

    // Force cleanup everything
    this.cleanup();
    console.log(`🧹 Force cleanup completed`);
  }
}

// Global cleanup handler for edge function shutdown
let globalMemoryManager: MemoryManager | null = null;

export function getGlobalMemoryManager(): MemoryManager {
  if (!globalMemoryManager) {
    globalMemoryManager = new MemoryManager();
    
    // Set up cleanup on function termination
    addEventListener('beforeunload', () => {
      console.log('🔄 Function shutting down, cleaning up resources...');
      globalMemoryManager?.cleanup();
    });

    // Set up periodic cleanup (every 5 minutes)
    setInterval(() => {
      const stats = globalMemoryManager?.getResourceStats();
      if (stats && (stats.activePromises > 10 || stats.activeControllers > 10)) {
        console.log('🧹 Periodic cleanup triggered:', stats);
        globalMemoryManager?.cleanup();
      }
    }, 300000); // 5 minutes
  }
  
  return globalMemoryManager;
}
