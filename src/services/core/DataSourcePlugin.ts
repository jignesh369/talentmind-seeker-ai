
export interface ParsedQuery {
  originalQuery: string;
  skills: string[];
  roles: string[];
  location?: string;
  seniority?: string;
  interpretation: string;
  confidence: number;
}

export interface PluginSearchRequest {
  query: string;
  location?: string;
  parsedQuery: ParsedQuery;
  limit: number;
}

export interface PluginSearchResult {
  candidates: any[];
  metadata?: {
    totalFound: number;
    searchStrategy: string;
    confidence: number;
  };
}

export abstract class DataSourcePlugin {
  abstract name: string;
  abstract priority: number;
  abstract isAvailable(): Promise<boolean>;
  abstract search(request: PluginSearchRequest): Promise<PluginSearchResult>;
  abstract validateResult(candidate: any): boolean;
  
  protected generateCandidateId(): string {
    return crypto.randomUUID();
  }

  protected sanitizeString(value: any, fallback: string = ''): string {
    if (typeof value === 'string') return value.trim();
    return fallback;
  }

  protected sanitizeInteger(value: any, fallback: number = 0): number {
    const num = parseInt(value);
    return isNaN(num) ? fallback : Math.max(0, Math.min(100, num));
  }

  protected calculateExperienceYears(accountAge: number, repoCount: number = 0): number {
    return Math.min(Math.max(1, Math.floor(accountAge + repoCount / 10)), 20);
  }
}
