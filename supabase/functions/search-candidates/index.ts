import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation and sanitization
function validateAndSanitizeQuery(query: string): { isValid: boolean; sanitized: string; errors: string[] } {
  const errors: string[] = []
  
  if (!query) {
    errors.push('Query cannot be empty')
    return { isValid: false, sanitized: '', errors }
  }
  
  if (typeof query !== 'string') {
    errors.push('Query must be a string')
    return { isValid: false, sanitized: '', errors }
  }
  
  // Sanitize the query
  let sanitized = query.trim()
  
  // Length validation
  if (sanitized.length < 2) {
    errors.push('Query must be at least 2 characters long')
    return { isValid: false, sanitized, errors }
  }
  
  if (sanitized.length > 500) {
    errors.push('Query too long (max 500 characters)')
    sanitized = sanitized.substring(0, 500)
  }
  
  // Remove potentially harmful characters but keep useful ones
  sanitized = sanitized.replace(/[<>]/g, '')
  
  // Remove excessive whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim()
  
  return { isValid: errors.length === 0, sanitized, errors }
}

function validateUserId(user_id: any): { isValid: boolean; error?: string } {
  if (!user_id) {
    return { isValid: false, error: 'User ID is required' }
  }
  
  if (typeof user_id !== 'string') {
    return { isValid: false, error: 'User ID must be a string' }
  }
  
  // Basic UUID format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(user_id)) {
    return { isValid: false, error: 'Invalid User ID format' }
  }
  
  return { isValid: true }
}

async function safeParseQuery(query: string, supabaseUrl: string, supabaseKey: string): Promise<any> {
  try {
    console.log('🔍 Attempting to parse query with AI...')
    const parseResponse = await fetch(`${supabaseUrl}/functions/v1/parse-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(5000) // 5 second timeout
    })
    
    if (!parseResponse.ok) {
      throw new Error(`Parse query failed with status: ${parseResponse.status}`)
    }
    
    const parseResult = await parseResponse.json()
    console.log('✅ Query parsed successfully')
    return parseResult.parsed_criteria
    
  } catch (error) {
    console.warn('⚠️ Query parsing failed, using fallback:', error.message)
    return null
  }
}

async function executeSearchStrategy(strategyName: string, query: any, retryCount = 0): Promise<{ data: any[], error?: string }> {
  const MAX_RETRIES = 2
  
  try {
    console.log(`🔍 Executing ${strategyName} strategy (attempt ${retryCount + 1})`)
    
    const { data, error } = await query
    
    if (error) {
      throw new Error(`${strategyName} strategy failed: ${error.message}`)
    }
    
    console.log(`✅ ${strategyName} strategy completed: ${data?.length || 0} results`)
    return { data: data || [] }
    
  } catch (error) {
    console.error(`❌ ${strategyName} strategy error:`, error.message)
    
    // Retry logic for transient errors
    if (retryCount < MAX_RETRIES && (
      error.message?.includes('timeout') ||
      error.message?.includes('network') ||
      error.message?.includes('connection')
    )) {
      console.log(`🔄 Retrying ${strategyName} strategy...`)
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))) // Exponential backoff
      return executeSearchStrategy(strategyName, query, retryCount + 1)
    }
    
    return { data: [], error: error.message }
  }
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

    // Step 1: Safe query parsing
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

    // Step 3: Execute search strategies with robust error handling
    const allResults = new Map()
    const searchResults = {}
    const searchStrategies = []

    // Strategy 1: Skills-based search
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

    // Strategy 2: Text-based search with robust term handling
    try {
      const searchTerms = sanitizedQuery.toLowerCase()
        .split(/\s+/)
        .filter(term => term.length > 2 && !/^[0-9]+$/.test(term)) // Filter out numbers and short terms
        .slice(0, 5) // Limit terms to prevent query complexity

      if (searchTerms.length > 0) {
        let textQuery = supabase.from('candidates').select('*')
        
        // Build safe OR conditions
        const conditions = []
        searchTerms.forEach(term => {
          const safeTerm = term.replace(/[%_\\]/g, '\\$&') // Escape SQL wildcards
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
                
                // Calculate text match bonus
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

    // Strategy 3: Location-based search
    if (parsed_criteria?.location && typeof parsed_criteria.location === 'string') {
      try {
        const safeLocation = parsed_criteria.location.replace(/[%_\\]/g, '\\$&')
        const locationQuery = supabase
          .from('candidates')
          .select('*')
          .ilike('location', `%${safeLocation}%`)
          .order('overall_score', { ascending: false })
          .limit(20)
        
        const locationResult = await executeSearchStrategy('location_based', locationQuery)
        searchResults['location_based'] = { 
          count: locationResult.data.length, 
          error: locationResult.error 
        }
        
        if (locationResult.data.length > 0) {
          locationResult.data.forEach(candidate => {
            if (!allResults.has(candidate.id)) {
              candidate.hybrid_score = (candidate.overall_score || 0) + 15 // Location boost
              allResults.set(candidate.id, candidate)
            }
          })
        }
      } catch (error) {
        console.error('❌ Location search strategy failed:', error.message)
        searchResults['location_based'] = { count: 0, error: error.message }
      }
    }

    // Strategy 4: Experience-based search
    if (parsed_criteria?.experience_min && typeof parsed_criteria.experience_min === 'number' && parsed_criteria.experience_min > 0) {
      try {
        const experienceQuery = supabase
          .from('candidates')
          .select('*')
          .gte('experience_years', Math.max(0, parsed_criteria.experience_min))
          .order('overall_score', { ascending: false })
          .limit(20)
        
        const experienceResult = await executeSearchStrategy('experience_based', experienceQuery)
        searchResults['experience_based'] = { 
          count: experienceResult.data.length, 
          error: experienceResult.error 
        }
        
        if (experienceResult.data.length > 0) {
          experienceResult.data.forEach(candidate => {
            if (!allResults.has(candidate.id)) {
              candidate.hybrid_score = (candidate.overall_score || 0) + 10 // Experience boost
              allResults.set(candidate.id, candidate)
            }
          })
        }
      } catch (error) {
        console.error('❌ Experience search strategy failed:', error.message)
        searchResults['experience_based'] = { count: 0, error: error.message }
      }
    }

    // Convert results and sort
    let candidates = Array.from(allResults.values())
      .sort((a, b) => (b.hybrid_score || 0) - (a.hybrid_score || 0))

    // Robust fallback strategy
    if (candidates.length === 0) {
      console.log('🔄 No results from targeted search, using robust fallback')
      
      try {
        const fallbackResult = await executeSearchStrategy('fallback',
          supabase
            .from('candidates')
            .select('*')
            .order('overall_score', { ascending: false })
            .limit(15)
        )
        
        if (fallbackResult.data.length > 0) {
          candidates = fallbackResult.data.map(candidate => ({
            ...candidate,
            hybrid_score: candidate.overall_score || 0,
            fallback_result: true
          }))
          searchResults['fallback'] = { count: candidates.length }
        } else {
          // Ultimate fallback - return empty but valid response
          console.warn('⚠️ Even fallback strategy returned no results')
          searchResults['fallback'] = { count: 0, error: 'No candidates available' }
        }
      } catch (error) {
        console.error('❌ Fallback strategy failed:', error.message)
        searchResults['fallback'] = { count: 0, error: error.message }
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

    console.log(`✅ Search completed: "${sanitizedQuery}" -> ${finalCandidates.length} candidates`)
    console.log('📊 Search strategy results:', searchResults)

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
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Critical search error:', error)
    
    // Return graceful error response
    return new Response(
      JSON.stringify({ 
        error: 'Search service temporarily unavailable',
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
