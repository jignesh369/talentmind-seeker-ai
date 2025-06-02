
import { supabase } from '@/integrations/supabase/client';
import { QueryParsingService, ParsedQuery } from './queryParsingService';

export interface EnhancedSearchOptions {
  query: string;
  limit?: number;
  includeQueryParsing?: boolean;
}

export interface EnhancedSearchResult {
  candidates: any[];
  total: number;
  searchMetadata: {
    query: string;
    parsedQuery?: ParsedQuery;
    searchType: 'enhanced_database';
    processingTime: number;
    resultsFromDatabase: number;
    relevanceScoring: boolean;
    queryInterpretation: string;
  };
}

export class EnhancedDatabaseSearchService {
  static async searchCandidates(options: EnhancedSearchOptions): Promise<EnhancedSearchResult> {
    const startTime = Date.now();
    const { query, limit = 50, includeQueryParsing = true } = options;
    
    console.log('🔍 Starting enhanced database search:', { query });

    try {
      // Parse the query for better understanding
      const parsedQuery = includeQueryParsing ? QueryParsingService.parseQuery(query) : null;
      const filters = parsedQuery ? QueryParsingService.buildDatabaseSearchFilters(parsedQuery) : null;
      
      console.log('📊 Parsed query:', parsedQuery);

      // Build the enhanced database query
      let dbQuery = supabase.from('candidates').select('*');

      if (filters && filters.skills.length > 0) {
        // Search for skill overlaps with enhanced skills
        dbQuery = dbQuery.overlaps('skills', filters.skills);
      } else if (query.trim()) {
        // Fallback to text search
        const searchTerms = query.trim().toLowerCase();
        dbQuery = dbQuery.or(`
          name.ilike.%${searchTerms}%,
          title.ilike.%${searchTerms}%,
          summary.ilike.%${searchTerms}%
        `);
      }

      // Apply location filter if available
      if (filters?.location) {
        dbQuery = dbQuery.ilike('location', `%${filters.location}%`);
      }

      // Execute query with enhanced sorting
      const { data: candidates, error } = await dbQuery
        .order('overall_score', { ascending: false })
        .order('skill_match', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Enhanced database search error:', error);
        throw error;
      }

      // Apply relevance scoring based on parsed query
      const rankedCandidates = this.calculateRelevanceScores(
        candidates || [], 
        parsedQuery || null,
        query
      );

      const processingTime = Date.now() - startTime;
      
      // Generate query interpretation for user feedback
      const queryInterpretation = this.generateQueryInterpretation(parsedQuery, query);
      
      console.log(`✅ Enhanced database search completed in ${processingTime}ms: ${rankedCandidates.length} candidates`);

      return {
        candidates: rankedCandidates,
        total: rankedCandidates.length,
        searchMetadata: {
          query,
          parsedQuery: parsedQuery || undefined,
          searchType: 'enhanced_database',
          processingTime,
          resultsFromDatabase: rankedCandidates.length,
          relevanceScoring: true,
          queryInterpretation
        }
      };

    } catch (error: any) {
      console.error('❌ Enhanced database search failed:', error);
      throw new Error(`Enhanced database search failed: ${error.message}`);
    }
  }

  private static calculateRelevanceScores(candidates: any[], parsedQuery: ParsedQuery | null, originalQuery: string): any[] {
    if (!candidates.length) return candidates;

    return candidates.map(candidate => {
      let relevanceScore = candidate.overall_score || 0;

      if (parsedQuery) {
        // Skill match scoring
        const candidateSkills = candidate.skills || [];
        const skillMatches = parsedQuery.enhancedSkills.filter(skill => 
          candidateSkills.some((cs: string) => cs.toLowerCase().includes(skill.toLowerCase()))
        );
        relevanceScore += skillMatches.length * 15;

        // Location match scoring
        if (parsedQuery.normalizedLocation.length > 0 && candidate.location) {
          const locationMatch = parsedQuery.normalizedLocation.some(loc =>
            candidate.location.toLowerCase().includes(loc.toLowerCase())
          );
          if (locationMatch) relevanceScore += 25;
        }

        // Role type match scoring
        if (parsedQuery.roleTypes.length > 0 && candidate.title) {
          const roleMatch = parsedQuery.roleTypes.some(role =>
            candidate.title.toLowerCase().includes(role.toLowerCase())
          );
          if (roleMatch) relevanceScore += 20;
        }
      } else {
        // Fallback scoring for non-parsed queries
        const queryTerms = originalQuery.toLowerCase().split(/\s+/);
        queryTerms.forEach(term => {
          if (candidate.name?.toLowerCase().includes(term)) relevanceScore += 10;
          if (candidate.title?.toLowerCase().includes(term)) relevanceScore += 8;
          if (candidate.summary?.toLowerCase().includes(term)) relevanceScore += 5;
        });
      }

      return {
        ...candidate,
        relevanceScore,
        matchExplanation: this.generateMatchExplanation(candidate, parsedQuery, originalQuery)
      };
    }).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private static generateMatchExplanation(candidate: any, parsedQuery: ParsedQuery | null, originalQuery: string): string {
    const explanations = [];

    if (parsedQuery) {
      // Skill matches
      const candidateSkills = candidate.skills || [];
      const skillMatches = parsedQuery.enhancedSkills.filter(skill => 
        candidateSkills.some((cs: string) => cs.toLowerCase().includes(skill.toLowerCase()))
      );
      if (skillMatches.length > 0) {
        explanations.push(`Skills: ${skillMatches.join(', ')}`);
      }

      // Location match
      if (parsedQuery.normalizedLocation.length > 0 && candidate.location) {
        const locationMatch = parsedQuery.normalizedLocation.find(loc =>
          candidate.location.toLowerCase().includes(loc.toLowerCase())
        );
        if (locationMatch) {
          explanations.push(`Location: ${locationMatch}`);
        }
      }

      // Role match
      if (parsedQuery.roleTypes.length > 0 && candidate.title) {
        const roleMatch = parsedQuery.roleTypes.find(role =>
          candidate.title.toLowerCase().includes(role.toLowerCase())
        );
        if (roleMatch) {
          explanations.push(`Role: ${roleMatch}`);
        }
      }
    }

    return explanations.length > 0 ? explanations.join(' • ') : 'General match';
  }

  private static generateQueryInterpretation(parsedQuery: ParsedQuery | null, originalQuery: string): string {
    if (!parsedQuery) {
      return `Searching for: "${originalQuery}"`;
    }

    const parts = [];
    
    if (parsedQuery.roleTypes.length > 0) {
      parts.push(`${parsedQuery.roleTypes[0]}s`);
    } else {
      parts.push('Professionals');
    }

    if (parsedQuery.enhancedSkills.length > 0) {
      parts.push(`skilled in ${parsedQuery.enhancedSkills.slice(0, 3).join(', ')}`);
    }

    if (parsedQuery.normalizedLocation.length > 0) {
      parts.push(`in ${parsedQuery.normalizedLocation[0]}`);
    }

    return `Searching for: ${parts.join(' ')} (Confidence: ${parsedQuery.confidence}%)`;
  }
}
