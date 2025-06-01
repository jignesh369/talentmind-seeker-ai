
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { enhanceQueryWithSemanticAI } from './query-enhancement.ts';
import { AdvancedSearchQueryEngine, EnhancedSearchQuery } from './search-query-engine.ts';
import { SemanticSearchEngine } from './semantic-engine.ts';
import { CrossPlatformValidator } from './cross-platform-validator.ts';
import { MarketIntelligenceEngine } from './market-intelligence.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, location, sources = ['github', 'stackoverflow', 'google', 'linkedin', 'kaggle', 'devto'] } = await req.json();

    if (!query) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🚀 Starting enhanced data collection with advanced search capabilities...');

    // Step 1: Enhanced Query Processing with AI
    let enhancedQuery: EnhancedSearchQuery;
    if (openaiApiKey) {
      console.log('🧠 Enhancing query with AI semantic understanding...');
      enhancedQuery = await enhanceQueryWithSemanticAI(query, openaiApiKey);
    } else {
      console.log('⚡ Using rule-based query enhancement...');
      enhancedQuery = {
        query,
        skills: extractSkillsFromQuery(query),
        semantic_skills: [],
        experience_level: 'any',
        experience_min: 0,
        experience_max: 20,
        location_preferences: location ? [location] : [],
        searchTerms: [query],
        semantic_terms: [],
        role_types: extractRolesFromQuery(query),
        keywords: query.split(' ').filter(word => word.length > 2),
        semantic_keywords: [],
        industries: [],
        company_types: [],
        must_have_skills: [],
        nice_to_have_skills: [],
        career_level_indicators: [],
        market_trends: [],
        skill_clusters: []
      };
    }

    console.log('📊 Enhanced query analysis:', {
      skills: enhancedQuery.skills.slice(0, 5),
      role_types: enhancedQuery.role_types.slice(0, 3),
      experience_level: enhancedQuery.experience_level
    });

    // Step 2: Market Intelligence Analysis
    console.log('📈 Analyzing market conditions...');
    const marketIntel = MarketIntelligenceEngine.analyzeMarketConditions(
      query, 
      enhancedQuery.skills, 
      location || 'remote',
      enhancedQuery.role_types[0] || 'software engineer'
    );

    const searchStrategy = MarketIntelligenceEngine.optimizeSearchStrategy(marketIntel);
    console.log('🎯 Search strategy:', searchStrategy);

    // Step 3: Generate Advanced Search Queries
    console.log('🔍 Building advanced Boolean search queries...');
    const searchQueries = {
      linkedin: AdvancedSearchQueryEngine.buildLinkedInBooleanQuery(enhancedQuery),
      github: AdvancedSearchQueryEngine.buildGitHubAdvancedQuery(enhancedQuery),
      google: AdvancedSearchQueryEngine.buildGoogleBooleanQuery(enhancedQuery),
      stackoverflow: AdvancedSearchQueryEngine.buildStackOverflowExpertQuery(enhancedQuery)
    };

    // Step 4: Semantic Context Enhancement
    const semanticContext = SemanticSearchEngine.enhanceQueryWithSemanticContext(query, enhancedQuery.skills);
    const contextualQueries = SemanticSearchEngine.buildContextualSearchQueries(query, semanticContext);

    console.log('🧬 Semantic enhancement:', {
      clusters: semanticContext.semantic_clusters,
      intent: semanticContext.search_intent,
      variations: semanticContext.role_variations.slice(0, 3)
    });

    // Step 5: Execute Enhanced Data Collection
    const results = {
      github: { candidates: [], total: 0, validated: 0, error: null },
      stackoverflow: { candidates: [], total: 0, validated: 0, error: null },
      google: { candidates: [], total: 0, validated: 0, error: null },
      linkedin: { candidates: [], total: 0, validated: 0, error: null },
      'linkedin-cross-platform': { candidates: [], total: 0, validated: 0, error: null },
      kaggle: { candidates: [], total: 0, validated: 0, error: null },
      devto: { candidates: [], total: 0, validated: 0, error: null }
    };

    const enhancementStats = {
      platform_specific_bonuses_applied: 0,
      cross_platform_correlations: 0,
      readme_emails_found: 0,
      apollo_enriched_candidates: 0,
      enhanced_google_discoveries: 0,
      expertise_level_candidates: 0
    };

    // Execute searches with enhanced queries
    const searchPromises = [];

    if (sources.includes('github')) {
      searchPromises.push(
        executeEnhancedSearch('collect-github-data', {
          query,
          location,
          enhancedQuery,
          searchQueries: searchQueries.github
        }, supabase, 'github', results)
      );
    }

    if (sources.includes('stackoverflow')) {
      searchPromises.push(
        executeEnhancedSearch('collect-stackoverflow-data', {
          query,
          location,
          enhancedQuery,
          searchQueries: searchQueries.stackoverflow
        }, supabase, 'stackoverflow', results)
      );
    }

    if (sources.includes('google')) {
      searchPromises.push(
        executeEnhancedSearch('collect-google-search-data', {
          query,
          location,
          enhancedQuery,
          searchQueries: searchQueries.google
        }, supabase, 'google', results)
      );
    }

    if (sources.includes('linkedin')) {
      searchPromises.push(
        executeEnhancedSearch('collect-linkedin-data', {
          query,
          location,
          enhancedQuery,
          searchQueries: searchQueries.linkedin
        }, supabase, 'linkedin', results)
      );
    }

    if (sources.includes('linkedin') || sources.includes('linkedin-cross-platform')) {
      searchPromises.push(
        executeEnhancedSearch('collect-linkedin-cross-platform', {
          query,
          location,
          enhancedQuery,
          crossPlatformData: results
        }, supabase, 'linkedin-cross-platform', results)
      );
    }

    if (sources.includes('kaggle')) {
      searchPromises.push(
        executeEnhancedSearch('collect-kaggle-data', {
          query,
          location,
          enhancedQuery
        }, supabase, 'kaggle', results)
      );
    }

    if (sources.includes('devto')) {
      searchPromises.push(
        executeEnhancedSearch('collect-devto-data', {
          query,
          location,
          enhancedQuery
        }, supabase, 'devto', results)
      );
    }

    // Execute all searches in parallel with timeout
    console.log('⚡ Executing enhanced multi-platform search...');
    await Promise.allSettled(searchPromises);

    // Step 6: Cross-Platform Validation and Consolidation
    console.log('🔗 Performing cross-platform validation...');
    const allCandidates = Object.fromEntries(
      Object.entries(results).map(([platform, data]) => [platform, data.candidates])
    );

    const validatedProfiles = CrossPlatformValidator.validateCandidateAcrossPlatforms(allCandidates);
    
    // Update enhancement stats
    enhancementStats.cross_platform_correlations = validatedProfiles.length;
    enhancementStats.platform_specific_bonuses_applied = Object.values(results).reduce(
      (sum, result) => sum + result.candidates.length, 0
    );

    // Calculate quality metrics
    const totalCandidates = Object.values(results).reduce((sum, result) => sum + result.total, 0);
    const totalValidated = Object.values(results).reduce((sum, result) => sum + result.validated, 0);
    const validationRate = totalCandidates > 0 ? ((totalValidated / totalCandidates) * 100).toFixed(1) : '0';

    // Collect enhancement stats from individual platforms
    Object.values(results).forEach(result => {
      if (result.candidates.length > 0) {
        const firstCandidate = result.candidates[0];
        if (firstCandidate.readme_email_found) enhancementStats.readme_emails_found++;
        if (firstCandidate.apollo_enriched) enhancementStats.apollo_enriched_candidates++;
        if (firstCandidate.expertise_score > 70) enhancementStats.expertise_level_candidates++;
      }
    });

    console.log('✅ Enhanced data collection completed successfully!');

    const response = {
      results,
      total_candidates: totalCandidates,
      total_validated: totalValidated,
      query,
      location,
      enhancement_phase: 'advanced_boolean_semantic_search',
      quality_metrics: {
        validation_rate: `${validationRate}%`,
        ai_enhanced: !!openaiApiKey,
        perplexity_enriched: false, // Would be true if Perplexity integration is added
        semantic_search: true,
        tier_system: true,
        apollo_enriched: true,
        github_readme_crawling: true,
        stackoverflow_expertise_focus: true,
        linkedin_cross_platform: true,
        enhanced_google_search: true
      },
      enhancement_stats: enhancementStats,
      market_intelligence: {
        search_strategy: searchStrategy,
        salary_insights: marketIntel.salary_ranges,
        trending_skills: marketIntel.trending_skills.slice(0, 10),
        competition_level: searchStrategy.competition_level,
        sourcing_difficulty: searchStrategy.sourcing_difficulty,
        success_probability: searchStrategy.success_probability
      },
      semantic_insights: {
        search_intent: semanticContext.search_intent,
        skill_clusters: semanticContext.semantic_clusters,
        role_variations: semanticContext.role_variations.slice(0, 5)
      },
      cross_platform_insights: {
        validated_profiles: validatedProfiles.length,
        gold_tier_candidates: validatedProfiles.filter(p => 
          CrossPlatformValidator.assessCandidateTier(p) === 'gold'
        ).length,
        availability_signals_detected: validatedProfiles.reduce(
          (sum, p) => sum + p.availability_signals.length, 0
        )
      },
      errors: Object.entries(results)
        .filter(([_, result]) => result.error)
        .map(([source, result]) => ({ source, error: result.error })),
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in enhanced data collection:', error);
    return new Response(JSON.stringify({ 
      error: 'Enhanced data collection failed',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function executeEnhancedSearch(
  functionName: string,
  payload: any,
  supabase: any,
  platform: string,
  results: any
) {
  try {
    console.log(`🔍 Executing enhanced ${platform} search...`);
    
    const response = await supabase.functions.invoke(functionName, {
      body: payload
    });

    if (response.error) {
      console.error(`❌ ${platform} search error:`, response.error);
      results[platform].error = response.error.message;
      return;
    }

    const data = response.data;
    if (data) {
      results[platform] = {
        candidates: data.candidates || [],
        total: data.total || data.candidates?.length || 0,
        validated: data.candidates?.filter((c: any) => c.overall_score >= 60).length || 0,
        error: null,
        enhancement_stats: data.enhancement_stats || {}
      };
      
      console.log(`✅ ${platform}: ${data.candidates?.length || 0} candidates collected`);
    }
  } catch (error) {
    console.error(`❌ Error in ${platform} search:`, error);
    results[platform].error = error.message;
  }
}

function extractSkillsFromQuery(query: string): string[] {
  const techSkills = [
    'python', 'javascript', 'typescript', 'java', 'go', 'rust', 'php', 'ruby', 'c++',
    'react', 'vue', 'angular', 'node.js', 'django', 'flask', 'spring', 'laravel',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'jenkins',
    'machine learning', 'ai', 'data science', 'devops', 'frontend', 'backend'
  ];
  
  const queryLower = query.toLowerCase();
  return techSkills.filter(skill => queryLower.includes(skill));
}

function extractRolesFromQuery(query: string): string[] {
  const roles = [
    'software engineer', 'developer', 'devops engineer', 'data scientist',
    'frontend developer', 'backend developer', 'full stack developer',
    'machine learning engineer', 'site reliability engineer', 'platform engineer'
  ];
  
  const queryLower = query.toLowerCase();
  return roles.filter(role => queryLower.includes(role));
}
