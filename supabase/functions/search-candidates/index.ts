
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
    const { query, user_id } = requestBody

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

    // Initialize Supabase client with error handling
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required environment variables')
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)

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

      if (error) {
        console.warn('⚠️ Failed to save search record:', error.message)
      } else {
        searchData = data
      }
    } catch (error) {
      console.warn('⚠️ Search recording failed, continuing without it:', error.message)
    }

    // Step 3: Execute enhanced search strategies
    const allResults = new Map()
    const searchResults = {}

    // Strategy 1: Advanced Semantic Search (highest priority)
    if (parsed_criteria?.contextual_skills && parsed_criteria.confidence_score > 30) {
      const advancedSemanticResult = await executeAdvancedSemanticSearch(supabase, parsed_criteria)
      searchResults['advanced_semantic'] = { 
        count: advancedSemanticResult.data.length, 
        error: advancedSemanticResult.error,
        confidence: parsed_criteria.confidence_score
      }
      
      advancedSemanticResult.data.forEach(candidate => {
        if (!allResults.has(candidate.id)) {
          allResults.set(candidate.id, candidate)
        }
      })
    }

    // Strategy 2: Technology Stack Search
    if (parsed_criteria?.technology_stack?.length > 0) {
      const stackResult = await executeTechnologyStackSearch(supabase, parsed_criteria)
      searchResults['technology_stack'] = { 
        count: stackResult.data.length, 
        error: stackResult.error,
        stacks: parsed_criteria.technology_stack
      }
      
      stackResult.data.forEach(candidate => {
        if (!allResults.has(candidate.id)) {
          allResults.set(candidate.id, candidate)
        }
      })
    }

    // Strategy 3: Intent-Based Search
    if (parsed_criteria?.search_intent) {
      const intentResult = await executeIntentBasedSearch(supabase, parsed_criteria)
      searchResults['intent_based'] = { 
        count: intentResult.data.length, 
        error: intentResult.error,
        intent: parsed_criteria.search_intent
      }
      
      intentResult.data.forEach(candidate => {
        if (!allResults.has(candidate.id)) {
          allResults.set(candidate.id, candidate)
        }
      })
    }

    // Strategy 4: Semantic search
    if (parsed_criteria?.semantic_skills && Array.isArray(parsed_criteria.semantic_skills) && parsed_criteria.semantic_skills.length > 0) {
      const semanticResult = await executeSemanticSearch(supabase, parsed_criteria)
      searchResults['semantic_search'] = { 
        count: semanticResult.data.length, 
        error: semanticResult.error 
      }
      
      semanticResult.data.forEach(candidate => {
        if (!allResults.has(candidate.id)) {
          allResults.set(candidate.id, candidate)
        }
      })
    }

    // Strategy 5: Role-based search
    if (parsed_criteria?.role_types && Array.isArray(parsed_criteria.role_types) && parsed_criteria.role_types.length > 0) {
      const roleResult = await executeRoleBasedSearch(supabase, parsed_criteria)
      searchResults['role_based_search'] = { 
        count: roleResult.data.length, 
        error: roleResult.error 
      }
      
      roleResult.data.forEach(candidate => {
        if (!allResults.has(candidate.id)) {
          allResults.set(candidate.id, candidate)
        }
      })
    }

    // Strategy 6: Seniority-based search
    if (parsed_criteria?.seniority_level && parsed_criteria.seniority_level !== 'any') {
      const seniorityResult = await executeSenioritySearch(supabase, parsed_criteria)
      searchResults['seniority_search'] = { 
        count: seniorityResult.data.length, 
        error: seniorityResult.error 
      }
      
      seniorityResult.data.forEach(candidate => {
        if (!allResults.has(candidate.id)) {
          allResults.set(candidate.id, candidate)
        }
      })
    }

    // Strategy 7: Industry-based search
    if (parsed_criteria?.industries && Array.isArray(parsed_criteria.industries) && parsed_criteria.industries.length > 0) {
      const industryResult = await executeIndustrySearch(supabase, parsed_criteria)
      searchResults['industry_search'] = { 
        count: industryResult.data.length, 
        error: industryResult.error 
      }
      
      industryResult.data.forEach(candidate => {
        if (!allResults.has(candidate.id)) {
          allResults.set(candidate.id, candidate)
        }
      })
    }

    // Strategy 8: Skills-based search (traditional)
    if (parsed_criteria?.skills && Array.isArray(parsed_criteria.skills) && parsed_criteria.skills.length > 0) {
      try {
        const skillsQuery = supabase
          .from('candidates')
          .select('*')
          .overlaps('skills', parsed_criteria.skills)
          .order('overall_score', { ascending: false })
          .limit(20)
        
        const skillsResult = await executeSearchStrategy('skills_based', skillsQuery)
        searchResults['skills_based'] = { 
          count: skillsResult.data.length, 
          error: skillsResult.error 
        }
        
        if (skillsResult.data.length > 0) {
          skillsResult.data.forEach(candidate => {
            if (!allResults.has(candidate.id)) {
              candidate.hybrid_score = (candidate.overall_score || 0) + 25 // Skills boost
              allResults.set(candidate.id, candidate)
            }
          })
        }
      } catch (error) {
        console.error('❌ Skills search strategy failed:', error.message)
        searchResults['skills_based'] = { count: 0, error: error.message }
      }
    }

    // Strategy 9: Text-based search (fallback)
    try {
      const searchTerms = sanitizedQuery.toLowerCase()
        .split(/\s+/)
        .filter(term => term.length > 2 && !/^[0-9]+$/.test(term))
        .slice(0, 5)

      if (searchTerms.length > 0) {
        let textQuery = supabase.from('candidates').select('*')
        
        const conditions = []
        searchTerms.forEach(term => {
          const safeTerm = term.replace(/[%_\\]/g, '\\$&')
          conditions.push(`name.ilike.%${safeTerm}%`)
          conditions.push(`title.ilike.%${safeTerm}%`)
          conditions.push(`summary.ilike.%${safeTerm}%`)
        })
        
        if (conditions.length > 0) {
          textQuery = textQuery.or(conditions.join(','))
          
          const textResult = await executeSearchStrategy('text_based', 
            textQuery.order('overall_score', { ascending: false }).limit(30)
          )
          
          searchResults['text_based'] = { 
            count: textResult.data.length, 
            error: textResult.error 
          }
          
          if (textResult.data.length > 0) {
            textResult.data.forEach(candidate => {
              if (!allResults.has(candidate.id)) {
                let relevanceScore = candidate.overall_score || 0
                
                const nameMatch = searchTerms.some(term => 
                  candidate.name?.toLowerCase().includes(term)
                ) ? 20 : 0
                
                const titleMatch = searchTerms.some(term => 
                  candidate.title?.toLowerCase().includes(term)
                ) ? 15 : 0
                
                const summaryMatch = searchTerms.some(term => 
                  candidate.summary?.toLowerCase().includes(term)
                ) ? 10 : 0
                
                candidate.hybrid_score = relevanceScore + nameMatch + titleMatch + summaryMatch
                allResults.set(candidate.id, candidate)
              }
            })
          }
        }
      }
    } catch (error) {
      console.error('❌ Text search strategy failed:', error.message)
      searchResults['text_based'] = { count: 0, error: error.message }
    }

    // Convert results and sort with advanced scoring
    let candidates = Array.from(allResults.values())
      .sort((a, b) => (b.hybrid_score || 0) - (a.hybrid_score || 0))

    // Enhanced fallback strategy
    if (candidates.length === 0) {
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
          candidates = fallbackResult.data.map(candidate => ({
            ...candidate,
            hybrid_score: candidate.overall_score || 0,
            fallback_result: true
          }))
          searchResults['smart_fallback'] = { count: candidates.length }
        } else {
          console.warn('⚠️ Even smart fallback strategy returned no results')
          searchResults['smart_fallback'] = { count: 0, error: 'No candidates available' }
        }
      } catch (error) {
        console.error('❌ Smart fallback strategy failed:', error.message)
        searchResults['smart_fallback'] = { count: 0, error: error.message }
      }
    }

    // Limit final results
    const finalCandidates = candidates.slice(0, 50)

    // Step 4: Safe search update
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

    console.log(`✅ Enhanced search completed: "${sanitizedQuery}" -> ${finalCandidates.length} candidates`)
    console.log('📊 Enhanced search strategy results:', searchResults)

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
          confidence_scoring: parsed_criteria?.confidence_score || 0
        }
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
