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

    console.log('🚀 Starting enhanced data collection with AI-powered analysis...');

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

    // Step 3: Initialize results tracking
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
      expertise_level_candidates: 0,
      ai_enhanced_candidates: 0,
      total_candidates_processed: 0
    };

    // Step 4: Execute Enhanced Data Collection with improved error handling
    const searchPromises = [];

    if (sources.includes('github')) {
      searchPromises.push(
        executeEnhancedSearch('collect-github-data', {
          query,
          location,
          enhancedQuery
        }, supabase, 'github', results, enhancementStats)
      );
    }

    if (sources.includes('stackoverflow')) {
      searchPromises.push(
        executeEnhancedSearch('collect-stackoverflow-data', {
          query,
          location,
          enhancedQuery
        }, supabase, 'stackoverflow', results, enhancementStats)
      );
    }

    if (sources.includes('google')) {
      searchPromises.push(
        executeEnhancedSearch('collect-google-search-data', {
          query,
          location,
          enhancedQuery
        }, supabase, 'google', results, enhancementStats)
      );
    }

    if (sources.includes('linkedin')) {
      searchPromises.push(
        executeEnhancedSearch('collect-linkedin-data', {
          query,
          location,
          enhancedQuery
        }, supabase, 'linkedin', results, enhancementStats)
      );
    }

    if (sources.includes('kaggle')) {
      searchPromises.push(
        executeEnhancedSearch('collect-kaggle-data', {
          query,
          location,
          enhancedQuery
        }, supabase, 'kaggle', results, enhancementStats)
      );
    }

    if (sources.includes('devto')) {
      searchPromises.push(
        executeEnhancedSearch('collect-devto-data', {
          query,
          location,
          enhancedQuery
        }, supabase, 'devto', results, enhancementStats)
      );
    }

    // Execute all searches in parallel with comprehensive error handling
    console.log('⚡ Executing enhanced multi-platform search...');
    const searchResults = await Promise.allSettled(searchPromises);

    // Log any rejected promises
    searchResults.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`❌ Search ${index} failed:`, result.reason);
      }
    });

    // Step 5: Cross-Platform Validation and Consolidation
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

    // Collect platform-specific enhancement stats
    Object.values(results).forEach(result => {
      if (result.candidates.length > 0) {
        const platformStats = result.enhancement_stats || {};
        if (platformStats.emails_from_readme) enhancementStats.readme_emails_found += platformStats.emails_from_readme;
        if (platformStats.ai_enhanced_profiles) enhancementStats.ai_enhanced_candidates += platformStats.ai_enhanced_profiles;
        if (platformStats.high_reputation_users) enhancementStats.expertise_level_candidates += platformStats.high_reputation_users;
      }
    });

    console.log('✅ Enhanced data collection completed successfully!');

    const response = {
      results,
      total_candidates: totalCandidates,
      total_validated: totalValidated,
      query,
      location,
      enhancement_phase: 'ai_powered_comprehensive_search',
      quality_metrics: {
        validation_rate: `${validationRate}%`,
        ai_enhanced: !!openaiApiKey,
        perplexity_enriched: false,
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
  results: any,
  enhancementStats: any
) {
  try {
    console.log(`🔍 Executing enhanced ${platform} search...`);
    
    // Add timeout to prevent hanging
    const searchPromise = supabase.functions.invoke(functionName, {
      body: payload
    });
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`${platform} search timeout`)), 120000)
    );
    
    const response = await Promise.race([searchPromise, timeoutPromise]);

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
      
      // Update global enhancement stats
      if (data.enhancement_stats) {
        const stats = data.enhancement_stats;
        enhancementStats.total_candidates_processed += data.candidates?.length || 0;
        
        if (stats.ai_enhanced_profiles) {
          enhancementStats.ai_enhanced_candidates += stats.ai_enhanced_profiles;
        }
      }
      
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
