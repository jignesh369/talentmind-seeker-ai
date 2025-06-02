
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { validateAndSanitizeQuery, validateUserId } from './validation.ts'
import { safeParseQuery } from './query-parser.ts'
import { 
  executeSemanticSearch, 
  executeRoleBasedSearch, 
  executeSenioritySearch, 
  executeIndustrySearch 
} from './search-strategies.ts'
import { 
  executeAdvancedSemanticSearch, 
  executeTechnologyStackSearch, 
  executeIntentBasedSearch 
} from './advanced-strategies.ts'
import { executeSearchStrategy } from './search-utils.ts'
import { EnhancedSearchCoordinator } from './enhanced-search-coordinator.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestBody = await req.json()
    const { query, user_id, quality_settings } = requestBody

    // Validate inputs
    const queryValidation = validateAndSanitizeQuery(query)
    if (!queryValidation.isValid) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid query', 
          details: queryValidation.errors,
          candidates: [],
          total_results: 0,
          search_strategies: {},
          fallback_used: true
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const userValidation = validateUserId(user_id)
    if (!userValidation.isValid) {
      return new Response(
        JSON.stringify({ 
          error: userValidation.error,
          candidates: [],
          total_results: 0,
          search_strategies: {},
          fallback_used: true
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const sanitizedQuery = queryValidation.sanitized

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required environment variables')
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('🚀 Starting enhanced search with comprehensive quality improvements...')

    // Step 1: Enhanced query parsing
    const parsed_criteria = await safeParseQuery(sanitizedQuery, supabaseUrl, supabaseKey)

    // Step 2: Safe search recording
    let searchData = null
    try {
      const { data, error } = await supabase
        .from('searches')
        .insert({
          user_id,
          query: sanitizedQuery,
          parsed_criteria,
          results_count: 0
        })
        .select()
        .single()

      if (!error) {
        searchData = data
      }
    } catch (error) {
      console.warn('⚠️ Search recording failed, continuing without it:', error.message)
    }

    // Step 3: Execute traditional search strategies (for compatibility)
    const allResults = new Map()
    const searchResults = {}

    // Execute all traditional strategies first
    const strategies = [
      { name: 'advanced_semantic', executor: executeAdvancedSemanticSearch, condition: () => parsed_criteria?.contextual_skills && parsed_criteria.confidence_score > 30 },
      { name: 'technology_stack', executor: executeTechnologyStackSearch, condition: () => parsed_criteria?.technology_stack?.length > 0 },
      { name: 'intent_based', executor: executeIntentBasedSearch, condition: () => parsed_criteria?.search_intent },
      { name: 'semantic_search', executor: executeSemanticSearch, condition: () => parsed_criteria?.semantic_skills?.length > 0 },
      { name: 'role_based_search', executor: executeRoleBasedSearch, condition: () => parsed_criteria?.role_types?.length > 0 },
      { name: 'seniority_search', executor: executeSenioritySearch, condition: () => parsed_criteria?.seniority_level !== 'any' },
      { name: 'industry_search', executor: executeIndustrySearch, condition: () => parsed_criteria?.industries?.length > 0 }
    ]

    for (const strategy of strategies) {
      if (strategy.condition()) {
        try {
          const result = await strategy.executor(supabase, parsed_criteria)
          searchResults[strategy.name] = { 
            count: result.data.length, 
            error: result.error,
            data: result.data // Store data for enhanced coordination
          }
          
          result.data.forEach(candidate => {
            if (!allResults.has(candidate.id)) {
              allResults.set(candidate.id, candidate)
            }
          })
        } catch (error) {
          console.error(`❌ ${strategy.name} strategy failed:`, error.message)
          searchResults[strategy.name] = { count: 0, error: error.message }
        }
      }
    }

    // Step 4: Apply enhanced search coordination for quality improvement
    const enhancementConfig = {
      enable_quality_filtering: true,
      quality_thresholds: {
        min_profile_completeness: quality_settings?.min_profile_completeness || 50,
        min_skill_relevance: quality_settings?.min_skill_relevance || 40,
        min_overall_quality: quality_settings?.min_overall_quality || 55
      },
      result_limits: {
        max_per_strategy: 25,
        final_result_limit: 50
      }
    }

    let enhancedResult = null
    try {
      enhancedResult = await EnhancedSearchCoordinator.coordinateEnhancedSearch(
        supabase,
        sanitizedQuery,
        parsed_criteria,
        searchResults,
        enhancementConfig
      )
      
      console.log('✅ Enhanced search coordination completed successfully')
    } catch (error) {
      console.error('⚠️ Enhanced coordination failed, using traditional results:', error.message)
    }

    // Use enhanced results if available, otherwise fall back to traditional
    let finalCandidates = enhancedResult?.candidates || Array.from(allResults.values())
    let enhancedMetadata = enhancedResult?.enhanced_metadata || {}
    let qualityReport = enhancedResult?.quality_report || null

    // Traditional fallback if no results
    if (finalCandidates.length === 0) {
      console.log('🔄 No results from enhanced search, using intelligent fallback')
      
      try {
        const fallbackResult = await executeSearchStrategy('smart_fallback',
          supabase
            .from('candidates')
            .select('*')
            .order('overall_score', { ascending: false })
            .limit(20)
        )
        
        if (fallbackResult.data.length > 0) {
          finalCandidates = fallbackResult.data.map(candidate => ({
            ...candidate,
            hybrid_score: candidate.overall_score || 0,
            fallback_result: true
          }))
          searchResults['smart_fallback'] = { count: finalCandidates.length }
        }
      } catch (error) {
        console.error('❌ Smart fallback strategy failed:', error.message)
        searchResults['smart_fallback'] = { count: 0, error: error.message }
      }
    }

    // Limit final results
    finalCandidates = finalCandidates.slice(0, 50)

    // Step 5: Update search record
    if (searchData?.id) {
      try {
        await supabase
          .from('searches')
          .update({ results_count: finalCandidates.length })
          .eq('id', searchData.id)
      } catch (error) {
        console.warn('⚠️ Failed to update search record:', error.message)
      }
    }

    console.log(`✅ Enhanced search completed: "${sanitizedQuery}" -> ${finalCandidates.length} high-quality candidates`)

    return new Response(
      JSON.stringify({ 
        candidates: finalCandidates,
        search_id: searchData?.id,
        parsed_criteria,
        total_results: finalCandidates.length,
        search_strategies: searchResults,
        fallback_used: finalCandidates.some(c => c.fallback_result),
        query_validation: {
          original_query: query,
          sanitized_query: sanitizedQuery,
          validation_errors: queryValidation.errors
        },
        enhanced_features: {
          semantic_search: !!parsed_criteria?.semantic_skills?.length,
          contextual_search: !!parsed_criteria?.contextual_skills?.length,
          role_matching: !!parsed_criteria?.role_types?.length,
          seniority_filtering: parsed_criteria?.seniority_level !== 'any',
          industry_targeting: !!parsed_criteria?.industries?.length,
          technology_stack: !!parsed_criteria?.technology_stack?.length,
          intent_detection: !!parsed_criteria?.search_intent,
          confidence_scoring: parsed_criteria?.confidence_score || 0,
          quality_filtering: enhancementConfig.enable_quality_filtering,
          enhanced_coordination: !!enhancedResult
        },
        quality_metrics: {
          processing_quality: enhancedMetadata.processing_quality || 0,
          result_quality: enhancedMetadata.result_quality || 0,
          search_effectiveness: enhancedMetadata.search_effectiveness || 0,
          quality_report: qualityReport
        },
        search_report: enhancedResult?.search_report || null
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Critical enhanced search error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Enhanced search service temporarily unavailable',
        details: error.message,
        candidates: [],
        total_results: 0,
        search_strategies: {},
        fallback_used: true,
        service_status: 'degraded'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
