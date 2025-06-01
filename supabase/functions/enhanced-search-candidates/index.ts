
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

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log(`Enhanced search for query: ${query}`)

    // Parse query using AI if available
    let searchParams = { skills: [], location: '', experience_min: 0 }
    if (openaiApiKey) {
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
                content: 'Extract search parameters from the query. Return only valid JSON with: skills (array), location (string), experience_min (number).'
              },
              { role: 'user', content: query }
            ],
            temperature: 0.1
          }),
        })

        const data = await response.json()
        const content = data.choices[0].message.content
        
        try {
          searchParams = JSON.parse(content.replace(/```json\s*|\s*```/g, ''))
        } catch {
          console.log('Failed to parse AI response, using fallback search')
        }
      } catch (error) {
        console.error('AI query parsing error:', error)
      }
    }

    // Start with base query
    let dbQuery = supabase
      .from('candidates')
      .select('*')

    let hasFilters = false

    // Add text search with proper PostgREST syntax
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2)
    if (searchTerms.length > 0) {
      // Use textSearch for full-text search across multiple columns
      const searchTerm = searchTerms.join(' & ')
      
      try {
        // Try advanced search first
        dbQuery = dbQuery.or(`name.ilike.%${searchTerms[0]}%,title.ilike.%${searchTerms[0]}%,summary.ilike.%${searchTerms[0]}%`)
        hasFilters = true
        console.log(`Applied text search for: ${searchTerms[0]}`)
      } catch (error) {
        console.log('Text search failed, falling back to simpler query:', error)
        // Fallback to simple name search
        dbQuery = dbQuery.ilike('name', `%${searchTerms[0]}%`)
        hasFilters = true
      }
    }

    // Add location filter if specified
    if (searchParams.location && searchParams.location.trim()) {
      dbQuery = dbQuery.ilike('location', `%${searchParams.location}%`)
      hasFilters = true
      console.log(`Applied location filter: ${searchParams.location}`)
    }

    // Add experience filter
    if (searchParams.experience_min > 0) {
      dbQuery = dbQuery.gte('experience_years', searchParams.experience_min)
      hasFilters = true
      console.log(`Applied experience filter: ${searchParams.experience_min}+ years`)
    }

    // Add skills filter with proper array syntax
    if (searchParams.skills && searchParams.skills.length > 0) {
      try {
        // Use overlaps operator for array intersection
        dbQuery = dbQuery.overlaps('skills', searchParams.skills)
        hasFilters = true
        console.log(`Applied skills filter: ${searchParams.skills.join(', ')}`)
      } catch (error) {
        console.log('Skills filter failed:', error)
      }
    }

    // If no specific filters applied, get all candidates
    if (!hasFilters) {
      console.log('No specific filters applied, returning all candidates')
    }

    // Order by overall score and limit results
    dbQuery = dbQuery
      .order('overall_score', { ascending: false })
      .limit(50)

    const { data: candidates, error } = await dbQuery

    if (error) {
      console.error('Database search error:', error)
      
      // Fallback to simple query if complex search fails
      console.log('Attempting fallback search...')
      const { data: fallbackCandidates, error: fallbackError } = await supabase
        .from('candidates')
        .select('*')
        .order('overall_score', { ascending: false })
        .limit(50)
      
      if (fallbackError) {
        console.error('Fallback search also failed:', fallbackError)
        throw fallbackError
      }
      
      console.log(`Fallback search returned ${fallbackCandidates?.length || 0} candidates`)
      return new Response(
        JSON.stringify({ 
          candidates: fallbackCandidates || [],
          total_results: fallbackCandidates?.length || 0,
          search_params: searchParams,
          query,
          fallback_used: true
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Found ${candidates?.length || 0} candidates`)

    // Enhanced ranking using AI if available (only for successful searches)
    let rankedCandidates = candidates || []
    if (openaiApiKey && rankedCandidates.length > 0) {
      try {
        // Rank top candidates using AI
        const topCandidates = rankedCandidates.slice(0, 20)
        
        const rankingResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
                content: 'You are a talent scout. Rank these candidates by relevance to the search query. Return only a JSON array of candidate IDs in order of relevance.'
              },
              {
                role: 'user',
                content: `Query: ${query}\n\nCandidates: ${JSON.stringify(topCandidates.map(c => ({ id: c.id, name: c.name, title: c.title, skills: c.skills, summary: c.summary })))}`
              }
            ],
            temperature: 0.1,
            max_tokens: 500
          }),
        })

        const rankingData = await rankingResponse.json()
        const rankedIds = JSON.parse(rankingData.choices[0].message.content.replace(/```json\s*|\s*```/g, ''))
        
        // Reorder candidates based on AI ranking
        const rankedTop = []
        const remaining = [...topCandidates]
        
        rankedIds.forEach(id => {
          const index = remaining.findIndex(c => c.id === id)
          if (index !== -1) {
            rankedTop.push(remaining.splice(index, 1)[0])
          }
        })
        
        rankedCandidates = [...rankedTop, ...remaining, ...rankedCandidates.slice(20)]
        
      } catch (error) {
        console.error('AI ranking error:', error)
        // Continue with original order if AI ranking fails
      }
    }

    return new Response(
      JSON.stringify({ 
        candidates: rankedCandidates,
        total_results: rankedCandidates.length,
        search_params: searchParams,
        query,
        fallback_used: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in enhanced search:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to search candidates', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
