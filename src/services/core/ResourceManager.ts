
interface ResourceTask {
  name: string;
  execute: () => Promise<any>;
}

interface ResourceLimits {
  timeoutMs: number;
  maxConcurrent: number;
}

interface TaskResult {
  name: string;
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
}

export class ResourceManager {
  private activeTasks = new Map<string, AbortController>();

  async executeWithResourceLimits(
    tasks: ResourceTask[], 
    limits: ResourceLimits
  ): Promise<TaskResult[]> {
    console.log(`🎯 Executing ${tasks.length} tasks with limits:`, limits);

    const results: TaskResult[] = [];
    const semaphore = new Semaphore(limits.maxConcurrent);

    // Execute tasks with concurrency control
    const taskPromises = tasks.map(async (task) => {
      await semaphore.acquire();
      
      try {
        const result = await this.executeTaskWithTimeout(task, limits.timeoutMs);
        results.push(result);
      } finally {
        semaphore.release();
      }
    });

    await Promise.allSettled(taskPromises);
    
    console.log(`📊 Resource execution completed: ${results.filter(r => r.success).length}/${results.length} successful`);
    return results;
  }

  private async executeTaskWithTimeout(
    task: ResourceTask, 
    timeoutMs: number
  ): Promise<TaskResult> {
    const startTime = Date.now();
    const controller = new AbortController();
    
    this.activeTasks.set(task.name, controller);

    try {
      // Set up timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          controller.abort();
          reject(new Error(`Task ${task.name} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      // Execute task with timeout race
      const data = await Promise.race([
        task.execute(),
        timeoutPromise
      ]);

      const duration = Date.now() - startTime;
      console.log(`✅ Task ${task.name} completed in ${duration}ms`);

      return {
        name: task.name,
        success: true,
        data,
        duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ Task ${task.name} failed after ${duration}ms:`, error.message);

      return {
        name: task.name,
        success: false,
        error: error.message,
        duration
      };
    } finally {
      this.activeTasks.delete(task.name);
    }
  }

  abortAllTasks(): void {
    for (const [name, controller] of this.activeTasks) {
      console.log(`🛑 Aborting task: ${name}`);
      controller.abort();
    }
    this.activeTasks.clear();
  }
}

class Semaphore {
  private available: number;
  private waiters: Array<() => void> = [];

  constructor(count: number) {
    this.available = count;
  }

  async acquire(): Promise<void> {
    if (this.available > 0) {
      this.available--;
      return;
    }

    return new Promise<void>((resolve) => {
      this.waiters.push(resolve);
    });
  }

  release(): void {
    if (this.waiters.length > 0) {
      const waiter = this.waiters.shift()!;
      waiter();
    } else {
      this.available++;
    }
  }
}
