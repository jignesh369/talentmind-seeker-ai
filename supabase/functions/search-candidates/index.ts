
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, user_id } = await req.json()

    if (!query || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Query and user_id are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Step 1: Parse the query for enhanced search
    let parsed_criteria = null
    try {
      const parseResponse = await fetch(`${supabaseUrl}/functions/v1/parse-query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ query })
      })
      const parseResult = await parseResponse.json()
      parsed_criteria = parseResult.parsed_criteria
    } catch (error) {
      console.warn('Query parsing failed, using basic search:', error)
    }

    // Step 2: Save search to database
    const { data: searchData, error: searchError } = await supabase
      .from('searches')
      .insert({
        user_id,
        query,
        parsed_criteria,
        results_count: 0
      })
      .select()
      .single()

    if (searchError) {
      console.error('Error saving search:', searchError)
      // Continue without saving search - don't fail the entire request
    }

    // Step 3: Implement hybrid search strategy
    let candidates = []
    const searchStrategies = []

    // Strategy 1: Skills-based search (if skills are parsed)
    if (parsed_criteria?.skills && parsed_criteria.skills.length > 0) {
      searchStrategies.push({
        name: 'skills_based',
        query: supabase
          .from('candidates')
          .select('*')
          .overlaps('skills', parsed_criteria.skills)
          .order('overall_score', { ascending: false })
          .limit(20)
      })
    }

    // Strategy 2: Text-based search across name, title, summary
    const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2)
    if (searchTerms.length > 0) {
      // Create text search conditions
      let textQuery = supabase.from('candidates').select('*')
      
      searchTerms.forEach(term => {
        textQuery = textQuery.or(`name.ilike.%${term}%,title.ilike.%${term}%,summary.ilike.%${term}%`)
      })
      
      searchStrategies.push({
        name: 'text_based',
        query: textQuery.order('overall_score', { ascending: false }).limit(30)
      })
    }

    // Strategy 3: Location-based search (if location is specified)
    if (parsed_criteria?.location) {
      searchStrategies.push({
        name: 'location_based',
        query: supabase
          .from('candidates')
          .select('*')
          .ilike('location', `%${parsed_criteria.location}%`)
          .order('overall_score', { ascending: false })
          .limit(20)
      })
    }

    // Strategy 4: Experience-based search (if experience is specified)
    if (parsed_criteria?.experience_min) {
      searchStrategies.push({
        name: 'experience_based',
        query: supabase
          .from('candidates')
          .select('*')
          .gte('experience_years', parsed_criteria.experience_min)
          .order('overall_score', { ascending: false })
          .limit(20)
      })
    }

    // Execute search strategies and combine results
    const allResults = new Map() // Use Map to avoid duplicates
    const searchResults = {}

    for (const strategy of searchStrategies) {
      try {
        const { data: strategyResults, error } = await strategy.query
        
        if (error) {
          console.error(`${strategy.name} search failed:`, error)
          searchResults[strategy.name] = { count: 0, error: error.message }
          continue
        }

        searchResults[strategy.name] = { count: strategyResults?.length || 0 }
        
        if (strategyResults) {
          strategyResults.forEach(candidate => {
            if (!allResults.has(candidate.id)) {
              // Calculate hybrid relevance score
              let relevanceScore = candidate.overall_score || 0
              
              // Boost score based on text match quality
              if (strategy.name === 'text_based') {
                const nameMatch = searchTerms.some(term => 
                  candidate.name?.toLowerCase().includes(term)
                ) ? 20 : 0
                
                const titleMatch = searchTerms.some(term => 
                  candidate.title?.toLowerCase().includes(term)
                ) ? 15 : 0
                
                const summaryMatch = searchTerms.some(term => 
                  candidate.summary?.toLowerCase().includes(term)
                ) ? 10 : 0
                
                relevanceScore += nameMatch + titleMatch + summaryMatch
              }
              
              // Boost for skills match
              if (strategy.name === 'skills_based') {
                relevanceScore += 25
              }
              
              // Boost for location match
              if (strategy.name === 'location_based') {
                relevanceScore += 15
              }
              
              // Add hybrid_score for sorting
              candidate.hybrid_score = relevanceScore
              allResults.set(candidate.id, candidate)
            }
          })
        }
      } catch (error) {
        console.error(`${strategy.name} search error:`, error)
        searchResults[strategy.name] = { count: 0, error: error.message }
      }
    }

    // Convert Map to Array and sort by hybrid score
    candidates = Array.from(allResults.values())
      .sort((a, b) => (b.hybrid_score || 0) - (a.hybrid_score || 0))

    // Fallback strategy: If no results, get top candidates by overall score
    if (candidates.length === 0) {
      console.log('No results from targeted search, using fallback strategy')
      
      const { data: fallbackResults, error: fallbackError } = await supabase
        .from('candidates')
        .select('*')
        .order('overall_score', { ascending: false })
        .limit(10)

      if (!fallbackError && fallbackResults) {
        candidates = fallbackResults.map(candidate => ({
          ...candidate,
          hybrid_score: candidate.overall_score || 0,
          fallback_result: true
        }))
        searchResults['fallback'] = { count: candidates.length }
      }
    }

    // Limit final results
    const finalCandidates = candidates.slice(0, 50)

    // Step 4: Update search results count
    if (searchData?.id) {
      await supabase
        .from('searches')
        .update({ results_count: finalCandidates.length })
        .eq('id', searchData.id)
    }

    console.log(`Search completed: "${query}" -> ${finalCandidates.length} candidates`)
    console.log('Search strategy results:', searchResults)

    return new Response(
      JSON.stringify({ 
        candidates: finalCandidates,
        search_id: searchData?.id,
        parsed_criteria,
        total_results: finalCandidates.length,
        search_strategies: searchResults,
        fallback_used: finalCandidates.some(c => c.fallback_result)
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error searching candidates:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to search candidates', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
