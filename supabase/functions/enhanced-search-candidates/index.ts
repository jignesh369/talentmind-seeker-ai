
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log(`Enhanced search for query: ${query}`)

    // Step 1: Parse query with OpenAI
    const parsedCriteria = await parseSearchQuery(query, openaiApiKey)
    console.log('Parsed criteria:', parsedCriteria)

    // Step 2: Save search to database
    const { data: searchData, error: searchError } = await supabase
      .from('searches')
      .insert({
        user_id,
        query,
        parsed_criteria: parsedCriteria,
        results_count: 0
      })
      .select()
      .single()

    if (searchError) {
      console.error('Error saving search:', searchError)
      throw searchError
    }

    // Step 3: Build intelligent search query
    let candidatesQuery = supabase
      .from('candidates')
      .select('*')

    // Apply enhanced filters
    if (parsedCriteria.skills && parsedCriteria.skills.length > 0) {
      candidatesQuery = candidatesQuery.overlaps('skills', parsedCriteria.skills)
    }

    if (parsedCriteria.location_preferences && parsedCriteria.location_preferences.length > 0) {
      // Search for any of the preferred locations
      const locationFilters = parsedCriteria.location_preferences.map(loc => 
        `location.ilike.%${loc}%`
      ).join(',')
      candidatesQuery = candidatesQuery.or(locationFilters)
    }

    if (parsedCriteria.experience_min) {
      candidatesQuery = candidatesQuery.gte('experience_years', parsedCriteria.experience_min)
    }

    // Filter by minimum score to ensure quality
    candidatesQuery = candidatesQuery.gte('overall_score', 60)

    // Order by relevance score
    candidatesQuery = candidatesQuery.order('overall_score', { ascending: false })

    const { data: candidates, error: candidatesError } = await candidatesQuery.limit(50)

    if (candidatesError) {
      console.error('Error fetching candidates:', candidatesError)
      throw candidatesError
    }

    // Step 4: Re-rank candidates using AI
    const rankedCandidates = await rankCandidatesWithAI(candidates || [], parsedCriteria, openaiApiKey)

    // Step 5: Update search results count
    await supabase
      .from('searches')
      .update({ results_count: rankedCandidates.length })
      .eq('id', searchData.id)

    console.log(`Found ${rankedCandidates.length} enhanced candidates for query: ${query}`)

    return new Response(
      JSON.stringify({ 
        candidates: rankedCandidates,
        search_id: searchData.id,
        parsed_criteria: parsedCriteria,
        total_results: rankedCandidates.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in enhanced search:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to perform enhanced search' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function parseSearchQuery(query: string, openaiApiKey: string) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Parse this talent search query and extract structured criteria. Return JSON with:
            - skills: array of technical skills/technologies
            - experience_level: junior/mid/senior/lead
            - experience_min: minimum years (number)
            - location_preferences: array of locations mentioned
            - role_types: array of job titles/roles
            - remote_ok: boolean if remote work is mentioned
            - company_preferences: array if specific companies mentioned`
          },
          { role: 'user', content: query }
        ],
        temperature: 0.3
      }),
    })

    const data = await response.json()
    return JSON.parse(data.choices[0].message.content)
  } catch (error) {
    console.error('Error parsing search query:', error)
    return {
      skills: [],
      experience_level: 'any',
      experience_min: 0,
      location_preferences: [],
      role_types: [],
      remote_ok: false,
      company_preferences: []
    }
  }
}

async function rankCandidatesWithAI(candidates: any[], criteria: any, openaiApiKey: string) {
  try {
    if (candidates.length === 0) return []

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a technical recruiter. Rank these candidates by relevance to the search criteria.
            Return an array of candidate IDs in order of best match to worst match.
            Consider: skill relevance, experience level, location match, profile completeness, recent activity.`
          },
          {
            role: 'user',
            content: `Search criteria: ${JSON.stringify(criteria)}
            
            Candidates: ${JSON.stringify(candidates.map(c => ({
              id: c.id,
              name: c.name,
              title: c.title,
              skills: c.skills,
              experience_years: c.experience_years,
              location: c.location,
              overall_score: c.overall_score,
              summary: c.summary?.substring(0, 200)
            })))}`
          }
        ],
        temperature: 0.3
      }),
    })

    const data = await response.json()
    const rankedIds = JSON.parse(data.choices[0].message.content)
    
    // Reorder candidates based on AI ranking
    const rankedCandidates = []
    for (const id of rankedIds) {
      const candidate = candidates.find(c => c.id === id)
      if (candidate) rankedCandidates.push(candidate)
    }
    
    // Add any candidates that weren't ranked
    for (const candidate of candidates) {
      if (!rankedCandidates.find(c => c.id === candidate.id)) {
        rankedCandidates.push(candidate)
      }
    }
    
    return rankedCandidates
  } catch (error) {
    console.error('Error ranking candidates with AI:', error)
    return candidates.sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0))
  }
}
