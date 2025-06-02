import { supabase } from '@/integrations/supabase/client';
import { QueryParsingService, ParsedQuery } from './queryParsingService';

export interface EnhancedSearchOptions {
  query: string;
  location?: string;
  minScore?: number;
  maxScore?: number;
  skills?: string[];
  lastActiveDays?: number;
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
    filtersApplied?: {
      location?: string;
      scoreRange?: string;
      skills?: string[];
      lastActiveDays?: number;
    };
  };
}

export class EnhancedDatabaseSearchService {
  static async searchCandidates(options: EnhancedSearchOptions): Promise<EnhancedSearchResult> {
    return this.searchCandidatesWithFilters(options);
  }

  static async searchCandidatesWithFilters(options: EnhancedSearchOptions): Promise<EnhancedSearchResult> {
    const startTime = Date.now();
    const { 
      query, 
      location, 
      minScore = 0, 
      maxScore = 100, 
      skills = [], 
      lastActiveDays,
      limit = 50, 
      includeQueryParsing = true 
    } = options;
    
    console.log('🔍 Starting enhanced database search with filters:', { 
      query, 
      location, 
      scoreRange: `${minScore}-${maxScore}`,
      skills,
      lastActiveDays
    });

    try {
      // Parse the query for better understanding
      const parsedQuery = includeQueryParsing ? QueryParsingService.parseQuery(query) : null;
      const queryFilters = parsedQuery ? QueryParsingService.buildDatabaseSearchFilters(parsedQuery) : null;
      
      console.log('📊 Parsed query:', parsedQuery);
      console.log('🔧 Query filters:', queryFilters);

      // Build the enhanced database query
      let dbQuery = supabase.from('candidates').select('*');

      // Apply skill filters (combine parsed skills with user-provided skills)
      const allSkills = [
        ...(queryFilters?.skills || []),
        ...(skills || [])
      ].filter((skill, index, arr) => arr.indexOf(skill) === index); // Remove duplicates

      if (allSkills.length > 0) {
        console.log('🏷️ Applying skill filters:', allSkills);
        dbQuery = dbQuery.overlaps('skills', allSkills);
      } else if (query.trim()) {
        // Fallback to text search if no skills identified
        const searchTerms = query.trim().toLowerCase();
        dbQuery = dbQuery.or(`
          name.ilike.%${searchTerms}%,
          title.ilike.%${searchTerms}%,
          summary.ilike.%${searchTerms}%
        `);
      }

      // Apply location filter (prioritize user filter over parsed location)
      const locationFilter = location || queryFilters?.location;
      if (locationFilter) {
        console.log('📍 Applying location filter:', locationFilter);
        
        // Enhanced location matching - check for country-city relationships
        const locationConditions = [`location.ilike.%${locationFilter}%`];
        
        // Add country-city mappings
        const locationMappings = {
          'india': ['hyderabad', 'bangalore', 'mumbai', 'delhi', 'pune', 'chennai'],
          'usa': ['new york', 'san francisco', 'seattle', 'austin', 'boston'],
          'uk': ['london', 'manchester', 'edinburgh', 'birmingham'],
          'canada': ['toronto', 'vancouver', 'montreal', 'ottawa']
        };

        const lowerLocation = locationFilter.toLowerCase();
        for (const [country, cities] of Object.entries(locationMappings)) {
          if (lowerLocation === country) {
            cities.forEach(city => {
              locationConditions.push(`location.ilike.%${city}%`);
            });
          } else if (cities.includes(lowerLocation)) {
            locationConditions.push(`location.ilike.%${country}%`);
          }
        }

        dbQuery = dbQuery.or(locationConditions.join(','));
      }

      // Apply score range filter
      if (minScore > 0 || maxScore < 100) {
        console.log('📊 Applying score filter:', `${minScore}-${maxScore}`);
        dbQuery = dbQuery.gte('overall_score', minScore).lte('overall_score', maxScore);
      }

      // Apply last active filter
      if (lastActiveDays && lastActiveDays > 0) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - lastActiveDays);
        console.log('⏰ Applying last active filter:', `${lastActiveDays} days (since ${cutoffDate.toISOString()})`);
        dbQuery = dbQuery.gte('last_active', cutoffDate.toISOString());
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

      // Apply relevance scoring based on parsed query and filters
      const rankedCandidates = this.calculateRelevanceScores(
        candidates || [], 
        parsedQuery || null,
        query,
        { location: locationFilter, skills: allSkills }
      );

      const processingTime = Date.now() - startTime;
      
      // Generate query interpretation for user feedback
      const queryInterpretation = this.generateQueryInterpretation(parsedQuery, query, {
        location: locationFilter,
        scoreRange: minScore !== 0 || maxScore !== 100 ? `${minScore}-${maxScore}` : undefined,
        skills: allSkills,
        lastActiveDays
      });
      
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
          queryInterpretation,
          filtersApplied: {
            location: locationFilter,
            scoreRange: minScore !== 0 || maxScore !== 100 ? `${minScore}-${maxScore}` : undefined,
            skills: allSkills.length > 0 ? allSkills : undefined,
            lastActiveDays
          }
        }
      };

    } catch (error: any) {
      console.error('❌ Enhanced database search failed:', error);
      throw new Error(`Enhanced database search failed: ${error.message}`);
    }
  }

  private static calculateRelevanceScores(candidates: any[], parsedQuery: ParsedQuery | null, originalQuery: string, filters: any): any[] {
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

      // Filter-based relevance boost
      if (filters.location && candidate.location?.toLowerCase().includes(filters.location.toLowerCase())) {
        relevanceScore += 10;
      }

      if (filters.skills?.length > 0) {
        const candidateSkills = candidate.skills || [];
        const skillMatches = filters.skills.filter(skill => 
          candidateSkills.some((cs: string) => cs.toLowerCase().includes(skill.toLowerCase()))
        );
        relevanceScore += skillMatches.length * 8;
      }

      return {
        ...candidate,
        relevanceScore,
        matchExplanation: this.generateMatchExplanation(candidate, parsedQuery, originalQuery, filters)
      };
    }).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private static generateMatchExplanation(candidate: any, parsedQuery: ParsedQuery | null, originalQuery: string, filters: any): string {
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

    // Filter-based matches
    if (filters.location && candidate.location?.toLowerCase().includes(filters.location.toLowerCase())) {
      explanations.push(`Location Filter: ${filters.location}`);
    }

    if (filters.skills?.length > 0) {
      const candidateSkills = candidate.skills || [];
      const skillMatches = filters.skills.filter(skill => 
        candidateSkills.some((cs: string) => cs.toLowerCase().includes(skill.toLowerCase()))
      );
      if (skillMatches.length > 0) {
        explanations.push(`Skill Filter: ${skillMatches.join(', ')}`);
      }
    }

    return explanations.length > 0 ? explanations.join(' • ') : 'General match';
  }

  private static generateQueryInterpretation(parsedQuery: ParsedQuery | null, originalQuery: string, appliedFilters: any): string {
    const parts = [];
    
    if (parsedQuery && parsedQuery.roleTypes.length > 0) {
      parts.push(`${parsedQuery.roleTypes[0]}s`);
    } else {
      parts.push('Professionals');
    }

    if (parsedQuery && parsedQuery.enhancedSkills.length > 0) {
      parts.push(`skilled in ${parsedQuery.enhancedSkills.slice(0, 3).join(', ')}`);
    } else if (appliedFilters.skills?.length > 0) {
      parts.push(`skilled in ${appliedFilters.skills.slice(0, 3).join(', ')}`);
    }

    if (appliedFilters.location) {
      parts.push(`in ${appliedFilters.location}`);
    } else if (parsedQuery && parsedQuery.normalizedLocation.length > 0) {
      parts.push(`in ${parsedQuery.normalizedLocation[0]}`);
    }

    if (appliedFilters.scoreRange) {
      parts.push(`with score ${appliedFilters.scoreRange}`);
    }

    if (appliedFilters.lastActiveDays) {
      parts.push(`active within ${appliedFilters.lastActiveDays} days`);
    }

    const confidence = parsedQuery?.confidence || 70;
    return `Searching for: ${parts.join(' ')} (Confidence: ${confidence}%)`;
  }
}
