
import { supabase } from '@/integrations/supabase/client';

export interface DatabaseSearchOptions {
  query: string;
  limit?: number;
  filters?: {
    location?: string;
    skills?: string[];
    experienceMin?: number;
    experienceMax?: number;
  };
}

export interface SearchResult {
  candidates: any[];
  total: number;
  searchMetadata: {
    query: string;
    searchType: 'database' | 'hybrid';
    processingTime: number;
    resultsFromDatabase: number;
    fallbackUsed: boolean;
  };
}

export class DatabaseSearchService {
  static async searchCandidates(options: DatabaseSearchOptions): Promise<SearchResult> {
    const startTime = Date.now();
    const { query, limit = 50, filters } = options;
    
    console.log('🔍 Starting database search:', { query, filters });

    try {
      // First get the total count of candidates for metadata
      const { count: totalCount } = await supabase
        .from('candidates')
        .select('*', { count: 'exact', head: true });

      // Build the main query with text search across multiple fields
      let dbQuery = supabase
        .from('candidates')
        .select('*');

      // Add text search across name, title, summary, and skills
      if (query && query.trim()) {
        const searchTerms = query.trim().toLowerCase();
        
        // Use PostgreSQL full text search with OR conditions
        dbQuery = dbQuery.or(`
          name.ilike.%${searchTerms}%,
          title.ilike.%${searchTerms}%,
          summary.ilike.%${searchTerms}%,
          location.ilike.%${searchTerms}%
        `);
      }

      // Apply filters
      if (filters?.location) {
        dbQuery = dbQuery.ilike('location', `%${filters.location}%`);
      }

      if (filters?.experienceMin !== undefined) {
        dbQuery = dbQuery.gte('experience_years', filters.experienceMin);
      }

      if (filters?.experienceMax !== undefined) {
        dbQuery = dbQuery.lte('experience_years', filters.experienceMax);
      }

      // Apply skills filter if provided
      if (filters?.skills && filters.skills.length > 0) {
        dbQuery = dbQuery.overlaps('skills', filters.skills);
      }

      // Execute query with sorting and limiting
      const { data: candidates, error, count } = await dbQuery
        .order('overall_score', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Database search error:', error);
        throw new Error(`Database search failed: ${error.message}`);
      }

      // Calculate relevance scores for better ranking
      const rankedCandidates = this.rankCandidatesByRelevance(candidates || [], query);

      const processingTime = Date.now() - startTime;
      console.log(`✅ Database search completed in ${processingTime}ms: ${rankedCandidates.length} candidates found`);

      return {
        candidates: rankedCandidates,
        total: count || rankedCandidates.length,
        searchMetadata: {
          query,
          searchType: 'database',
          processingTime,
          resultsFromDatabase: rankedCandidates.length,
          fallbackUsed: false
        }
      };

    } catch (error: any) {
      console.error('❌ Database search failed:', error);
      
      // Return empty results with error information
      const processingTime = Date.now() - startTime;
      return {
        candidates: [],
        total: 0,
        searchMetadata: {
          query,
          searchType: 'database',
          processingTime,
          resultsFromDatabase: 0,
          fallbackUsed: true
        }
      };
    }
  }

  private static rankCandidatesByRelevance(candidates: any[], query: string): any[] {
    if (!query || !candidates.length) return candidates;

    const queryTerms = query.toLowerCase().split(/\s+/);

    return candidates.map(candidate => {
      let relevanceScore = 0;

      // Score based on exact matches in name (highest weight)
      if (candidate.name?.toLowerCase().includes(query.toLowerCase())) {
        relevanceScore += 100;
      }

      // Score based on title matches
      if (candidate.title?.toLowerCase().includes(query.toLowerCase())) {
        relevanceScore += 80;
      }

      // Score based on individual term matches
      queryTerms.forEach(term => {
        if (candidate.name?.toLowerCase().includes(term)) relevanceScore += 20;
        if (candidate.title?.toLowerCase().includes(term)) relevanceScore += 15;
        if (candidate.summary?.toLowerCase().includes(term)) relevanceScore += 10;
        if (candidate.skills?.some((skill: string) => skill.toLowerCase().includes(term))) {
          relevanceScore += 25;
        }
      });

      // Add overall score factor
      relevanceScore += (candidate.overall_score || 0) * 0.5;

      return {
        ...candidate,
        relevanceScore
      };
    }).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  static async hybridSearch(options: DatabaseSearchOptions): Promise<SearchResult> {
    const startTime = Date.now();
    
    // First try database search
    const dbResult = await this.searchCandidates(options);
    
    // If we have good results, return them
    if (dbResult.candidates.length >= 10) {
      return {
        ...dbResult,
        searchMetadata: {
          ...dbResult.searchMetadata,
          searchType: 'hybrid'
        }
      };
    }

    // If insufficient results, we could trigger data collection here
    // For now, return what we have with fallback flag
    const processingTime = Date.now() - startTime;
    
    return {
      candidates: dbResult.candidates,
      total: dbResult.candidates.length,
      searchMetadata: {
        query: options.query,
        searchType: 'hybrid',
        processingTime,
        resultsFromDatabase: dbResult.candidates.length,
        fallbackUsed: dbResult.candidates.length < 10
      }
    };
  }
}
