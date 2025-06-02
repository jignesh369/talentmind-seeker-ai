
export class ErrorHandler {
  private circuitBreakers = new Map<string, CircuitBreaker>();

  handleSearchError(error: any, request: any): void {
    console.error('🚨 Search error:', error);
    
    // Track error patterns
    this.trackErrorPattern(error);
    
    // Update circuit breakers
    if (error.source) {
      const breaker = this.getCircuitBreaker(error.source);
      breaker.recordFailure();
    }
  }

  getCircuitBreaker(source: string): CircuitBreaker {
    if (!this.circuitBreakers.has(source)) {
      this.circuitBreakers.set(source, new CircuitBreaker(source));
    }
    return this.circuitBreakers.get(source)!;
  }

  private trackErrorPattern(error: any): void {
    // Implementation for error pattern tracking
    const errorType = this.categorizeError(error);
    console.log(`📊 Error categorized as: ${errorType}`);
  }

  private categorizeError(error: any): string {
    if (error.message?.includes('timeout')) return 'timeout';
    if (error.message?.includes('network')) return 'network';
    if (error.message?.includes('auth')) return 'authentication';
    if (error.message?.includes('rate limit')) return 'rate_limit';
    return 'unknown';
  }
}

class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private source: string,
    private failureThreshold = 5,
    private timeoutMs = 60000
  ) {}

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'open';
      console.warn(`🔌 Circuit breaker OPEN for ${this.source}`);
    }
  }

  recordSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  canExecute(): boolean {
    if (this.state === 'closed') return true;
    
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeoutMs) {
        this.state = 'half-open';
        return true;
      }
      return false;
    }
    
    return true; // half-open
  }
}
