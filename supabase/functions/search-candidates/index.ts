
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
    console.log('🔍 Attempting enhanced query parsing...')
    const parseResponse = await fetch(`${supabaseUrl}/functions/v1/parse-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(8000) // Increased timeout for enhanced parsing
    })
    
    if (!parseResponse.ok) {
      throw new Error(`Enhanced parse query failed with status: ${parseResponse.status}`)
    }
    
    const parseResult = await parseResponse.json()
    console.log('✅ Enhanced query parsing successful:', parseResult.parsed_criteria)
    return parseResult.parsed_criteria
    
  } catch (error) {
    console.warn('⚠️ Enhanced query parsing failed, using basic fallback:', error.message)
    return null
  }
}

async function executeSemanticSearch(supabase: any, criteria: any): Promise<{ data: any[], error?: string }> {
  try {
    console.log('🧠 Executing semantic search strategy')
    
    if (!criteria?.semantic_skills || !Array.isArray(criteria.semantic_skills) || criteria.semantic_skills.length === 0) {
      return { data: [] }
    }
    
    // Search using semantic skills
    const semanticQuery = supabase
      .from('candidates')
      .select('*')
      .overlaps('skills', criteria.semantic_skills)
      .order('overall_score', { ascending: false })
      .limit(25)
    
    const { data, error } = await semanticQuery
    
    if (error) {
      throw new Error(`Semantic search failed: ${error.message}`)
    }
    
    // Boost semantic matches
    const enhancedData = (data || []).map(candidate => ({
      ...candidate,
      hybrid_score: (candidate.overall_score || 0) + 30, // Strong semantic boost
      search_strategy: 'semantic'
    }))
    
    console.log(`✅ Semantic search completed: ${enhancedData.length} results`)
    return { data: enhancedData }
    
  } catch (error) {
    console.error('❌ Semantic search error:', error.message)
    return { data: [], error: error.message }
  }
}

async function executeRoleBasedSearch(supabase: any, criteria: any): Promise<{ data: any[], error?: string }> {
  try {
    console.log('👔 Executing role-based search strategy')
    
    if (!criteria?.role_types || !Array.isArray(criteria.role_types) || criteria.role_types.length === 0) {
      return { data: [] }
    }
    
    // Build role search conditions
    const roleConditions = criteria.role_types
      .map(role => `title.ilike.%${role.replace(/[%_\\]/g, '\\$&')}%`)
      .join(',')
    
    const roleQuery = supabase
      .from('candidates')
      .select('*')
      .or(roleConditions)
      .order('overall_score', { ascending: false })
      .limit(20)
    
    const { data, error } = await roleQuery
    
    if (error) {
      throw new Error(`Role-based search failed: ${error.message}`)
    }
    
    // Add role match scoring
    const enhancedData = (data || []).map(candidate => {
      let roleBoost = 0
      const candidateTitle = candidate.title?.toLowerCase() || ''
      
      // Calculate role relevance boost
      criteria.role_types.forEach(role => {
        if (candidateTitle.includes(role.toLowerCase())) {
          roleBoost += 20
        }
      })
      
      return {
        ...candidate,
        hybrid_score: (candidate.overall_score || 0) + roleBoost,
        search_strategy: 'role_based'
      }
    })
    
    console.log(`✅ Role-based search completed: ${enhancedData.length} results`)
    return { data: enhancedData }
    
  } catch (error) {
    console.error('❌ Role-based search error:', error.message)
    return { data: [], error: error.message }
  }
}

async function executeSenioritySearch(supabase: any, criteria: any): Promise<{ data: any[], error?: string }> {
  try {
    console.log('🎯 Executing seniority-based search strategy')
    
    if (!criteria?.seniority_level || criteria.seniority_level === 'any') {
      return { data: [] }
    }
    
    // Map seniority to experience range
    const seniorityMap = {
      'junior': { min: 0, max: 3 },
      'mid': { min: 2, max: 6 },
      'senior': { min: 5, max: 12 },
      'lead': { min: 7, max: 15 },
      'principal': { min: 10, max: 25 }
    }
    
    const experienceRange = seniorityMap[criteria.seniority_level]
    if (!experienceRange) {
      return { data: [] }
    }
    
    const seniorityQuery = supabase
      .from('candidates')
      .select('*')
      .gte('experience_years', experienceRange.min)
      .lte('experience_years', experienceRange.max)
      .order('overall_score', { ascending: false })
      .limit(20)
    
    const { data, error } = await seniorityQuery
    
    if (error) {
      throw new Error(`Seniority search failed: ${error.message}`)
    }
    
    const enhancedData = (data || []).map(candidate => ({
      ...candidate,
      hybrid_score: (candidate.overall_score || 0) + 18, // Seniority boost
      search_strategy: 'seniority_based'
    }))
    
    console.log(`✅ Seniority search completed: ${enhancedData.length} results`)
    return { data: enhancedData }
    
  } catch (error) {
    console.error('❌ Seniority search error:', error.message)
    return { data: [], error: error.message }
  }
}

async function executeIndustrySearch(supabase: any, criteria: any): Promise<{ data: any[], error?: string }> {
  try {
    console.log('🏢 Executing industry-based search strategy')
    
    if (!criteria?.industries || !Array.isArray(criteria.industries) || criteria.industries.length === 0) {
      return { data: [] }
    }
    
    // Search in summary and skills for industry keywords
    const industryTerms = criteria.industries.join('|')
    const industryConditions = [
      `summary.ilike.%${industryTerms}%`,
      `skills.cs.{${criteria.industries.join(',')}}`
    ]
    
    const industryQuery = supabase
      .from('candidates')
      .select('*')
      .or(industryConditions.join(','))
      .order('overall_score', { ascending: false })
      .limit(15)
    
    const { data, error } = await industryQuery
    
    if (error) {
      throw new Error(`Industry search failed: ${error.message}`)
    }
    
    const enhancedData = (data || []).map(candidate => ({
      ...candidate,
      hybrid_score: (candidate.overall_score || 0) + 12, // Industry boost
      search_strategy: 'industry_based'
    }))
    
    console.log(`✅ Industry search completed: ${enhancedData.length} results`)
    return { data: enhancedData }
    
  } catch (error) {
    console.error('❌ Industry search error:', error.message)
    return { data: [], error: error.message }
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

    // Strategy 1: Semantic search (highest priority)
    if (parsed_criteria?.semantic_skills) {
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

    // Strategy 2: Role-based search
    if (parsed_criteria?.role_types) {
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

    // Strategy 3: Seniority-based search
    if (parsed_criteria?.seniority_level) {
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

    // Strategy 4: Industry-based search
    if (parsed_criteria?.industries) {
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

    // Strategy 5: Skills-based search (traditional)
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

    // Strategy 6: Text-based search (fallback)
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

    // Convert results and sort
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
          role_matching: !!parsed_criteria?.role_types?.length,
          seniority_filtering: parsed_criteria?.seniority_level !== 'any',
          industry_targeting: !!parsed_criteria?.industries?.length
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
