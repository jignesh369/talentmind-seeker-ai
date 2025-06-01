
export class MemoryManager {
  private activePromises: Set<Promise<any>> = new Set();
  private timeouts: Set<NodeJS.Timeout> = new Set();
  private intervals: Set<NodeJS.Timer> = new Set();
  private abortControllers: Set<AbortController> = new Set();

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
      callback();
    }, ms);
    
    this.timeouts.add(timeout);
    return timeout;
  }

  // Track and manage intervals
  createInterval(callback: () => void, ms: number): NodeJS.Timer {
    const interval = setInterval(callback, ms);
    this.intervals.add(interval);
    return interval;
  }

  // Track and manage abort controllers
  createAbortController(): AbortController {
    const controller = new AbortController();
    this.abortControllers.add(controller);
    return controller;
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
    // Cancel all abort controllers
    this.abortControllers.forEach(controller => {
      try {
        controller.abort();
      } catch (e) {
        // Ignore abort errors
      }
    });
    this.abortControllers.clear();

    // Clear all timeouts
    this.timeouts.forEach(timeout => {
      clearTimeout(timeout);
    });
    this.timeouts.clear();

    // Clear all intervals
    this.intervals.forEach(interval => {
      clearInterval(interval);
    });
    this.intervals.clear();

    // Note: We can't cancel promises, but we stop tracking them
    this.activePromises.clear();
  }

  // Get current resource usage stats
  getResourceStats() {
    return {
      activePromises: this.activePromises.size,
      activeTimeouts: this.timeouts.size,
      activeIntervals: this.intervals.size,
      activeControllers: this.abortControllers.size
    };
  }

  // Force cleanup with optional grace period
  async forceCleanup(gracePeriodMs: number = 1000): Promise<void> {
    // Give active operations a chance to complete
    if (this.activePromises.size > 0 && gracePeriodMs > 0) {
      try {
        await Promise.race([
          Promise.allSettled(Array.from(this.activePromises)),
          new Promise(resolve => setTimeout(resolve, gracePeriodMs))
        ]);
      } catch (e) {
        // Ignore errors during graceful shutdown
      }
    }

    // Force cleanup everything
    this.cleanup();
  }
}

// Global cleanup handler for edge function shutdown
let globalMemoryManager: MemoryManager | null = null;

export function getGlobalMemoryManager(): MemoryManager {
  if (!globalMemoryManager) {
    globalMemoryManager = new MemoryManager();
    
    // Set up cleanup on function termination
    addEventListener('beforeunload', () => {
      globalMemoryManager?.cleanup();
    });
  }
  
  return globalMemoryManager;
}
