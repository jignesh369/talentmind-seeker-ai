
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

    console.log(`🔍 Enhanced search for query: "${query}"`)

    // Enhanced query parsing with better error handling
    let searchParams = { skills: [], location: '', experience_min: 0, keywords: [] }
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
                content: 'Extract search parameters from the query. Return only valid JSON with: skills (array), location (string), experience_min (number), keywords (array).'
              },
              { role: 'user', content: query }
            ],
            temperature: 0.1,
            max_tokens: 200
          }),
        })

        if (response.ok) {
          const data = await response.json()
          const content = data.choices[0].message.content
          
          try {
            const parsedParams = JSON.parse(content.replace(/```json\s*|\s*```/g, ''))
            searchParams = {
              skills: parsedParams.skills || [],
              location: parsedParams.location || '',
              experience_min: parsedParams.experience_min || 0,
              keywords: parsedParams.keywords || []
            }
            console.log('✅ AI parsed search params:', searchParams)
          } catch (parseError) {
            console.log('⚠️ Failed to parse AI response, using fallback parsing')
            searchParams = fallbackQueryParsing(query)
          }
        }
      } catch (error) {
        console.error('❌ AI query parsing error:', error)
        searchParams = fallbackQueryParsing(query)
      }
    } else {
      searchParams = fallbackQueryParsing(query)
    }

    // Enhanced database search with multiple strategies
    let candidates = []
    let searchStrategy = 'basic'

    try {
      // Strategy 1: Full-text search across multiple fields
      console.log('🔍 Attempting full-text search...')
      const searchTerms = [...searchParams.skills, ...searchParams.keywords, query]
        .filter(term => term && term.length > 2)
        .slice(0, 5)

      if (searchTerms.length > 0) {
        let dbQuery = supabase
          .from('candidates')
          .select('*')

        // Build comprehensive OR conditions for text search
        const textConditions = []
        searchTerms.forEach(term => {
          const safeTerm = term.replace(/[%_]/g, '\\$&') // Escape SQL wildcards
          textConditions.push(`name.ilike.%${safeTerm}%`)
          textConditions.push(`title.ilike.%${safeTerm}%`)
          textConditions.push(`summary.ilike.%${safeTerm}%`)
        })

        if (textConditions.length > 0) {
          dbQuery = dbQuery.or(textConditions.join(','))
          searchStrategy = 'full-text'
        }

        // Add location filter if specified
        if (searchParams.location && searchParams.location.trim()) {
          const safeLocation = searchParams.location.replace(/[%_]/g, '\\$&')
          dbQuery = dbQuery.ilike('location', `%${safeLocation}%`)
        }

        // Add experience filter
        if (searchParams.experience_min > 0) {
          dbQuery = dbQuery.gte('experience_years', searchParams.experience_min)
        }

        // Add skills filter with proper array handling
        if (searchParams.skills && searchParams.skills.length > 0) {
          try {
            dbQuery = dbQuery.overlaps('skills', searchParams.skills)
          } catch (skillsError) {
            console.log('⚠️ Skills filter failed, continuing without it:', skillsError)
          }
        }

        const { data: searchResults, error: searchError } = await dbQuery
          .order('overall_score', { ascending: false })
          .limit(50)

        if (!searchError && searchResults) {
          candidates = searchResults
          console.log(`✅ Full-text search found ${candidates.length} candidates`)
        } else {
          throw new Error(`Search query failed: ${searchError?.message}`)
        }
      }

      // Strategy 2: Fallback to simple name search if no results
      if (candidates.length === 0) {
        console.log('🔍 Attempting fallback name search...')
        const firstTerm = query.split(' ')[0]
        if (firstTerm && firstTerm.length > 2) {
          const { data: fallbackResults, error: fallbackError } = await supabase
            .from('candidates')
            .select('*')
            .ilike('name', `%${firstTerm}%`)
            .order('overall_score', { ascending: false })
            .limit(30)

          if (!fallbackError && fallbackResults) {
            candidates = fallbackResults
            searchStrategy = 'name-fallback'
            console.log(`✅ Fallback search found ${candidates.length} candidates`)
          }
        }
      }

      // Strategy 3: Last resort - get top candidates
      if (candidates.length === 0) {
        console.log('🔍 Attempting last resort - top candidates...')
        const { data: topResults, error: topError } = await supabase
          .from('candidates')
          .select('*')
          .order('overall_score', { ascending: false })
          .limit(20)

        if (!topError && topResults) {
          candidates = topResults
          searchStrategy = 'top-candidates'
          console.log(`✅ Top candidates search found ${candidates.length} candidates`)
        }
      }

    } catch (error) {
      console.error('❌ All search strategies failed:', error)
      
      // Final fallback - empty result with proper structure
      return new Response(
        JSON.stringify({ 
          candidates: [],
          total_results: 0,
          search_params: searchParams,
          query,
          search_strategy: 'failed',
          error_message: 'All search strategies failed',
          fallback_used: true
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`📊 Found ${candidates?.length || 0} candidates using ${searchStrategy} strategy`)

    // Enhanced AI ranking if available and we have candidates
    let rankedCandidates = candidates || []
    let aiRankingUsed = false

    if (openaiApiKey && rankedCandidates.length > 1) {
      try {
        console.log('🤖 Applying AI ranking...')
        const topCandidates = rankedCandidates.slice(0, 15) // Rank top 15 only
        
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
                content: 'Rank these candidates by relevance to the search query. Consider skills match, experience level, and job title relevance. Return only a JSON array of candidate IDs in order of relevance (most relevant first).'
              },
              {
                role: 'user',
                content: `Query: "${query}"\n\nCandidates: ${JSON.stringify(topCandidates.map(c => ({ 
                  id: c.id, 
                  name: c.name, 
                  title: c.title, 
                  skills: c.skills, 
                  summary: c.summary?.substring(0, 200),
                  experience_years: c.experience_years
                })))}`
              }
            ],
            temperature: 0.1,
            max_tokens: 1000
          }),
        })

        if (rankingResponse.ok) {
          const rankingData = await rankingResponse.json()
          const content = rankingData.choices[0].message.content
          
          try {
            const rankedIds = JSON.parse(content.replace(/```json\s*|\s*```/g, ''))
            
            if (Array.isArray(rankedIds)) {
              const rankedTop = []
              const remaining = [...topCandidates]
              
              rankedIds.forEach(id => {
                const index = remaining.findIndex(c => c.id === id)
                if (index !== -1) {
                  rankedTop.push(remaining.splice(index, 1)[0])
                }
              })
              
              rankedCandidates = [...rankedTop, ...remaining, ...rankedCandidates.slice(15)]
              aiRankingUsed = true
              console.log('✅ AI ranking applied successfully')
            }
          } catch (rankingParseError) {
            console.log('⚠️ Failed to parse AI ranking, using original order')
          }
        }
        
      } catch (error) {
        console.error('❌ AI ranking error:', error)
        // Continue with original order if AI ranking fails
      }
    }

    return new Response(
      JSON.stringify({ 
        candidates: rankedCandidates,
        total_results: rankedCandidates.length,
        search_params: searchParams,
        query,
        search_strategy: searchStrategy,
        ai_ranking_used: aiRankingUsed,
        fallback_used: searchStrategy !== 'full-text',
        performance: {
          candidates_found: rankedCandidates.length,
          search_strategy_used: searchStrategy,
          ai_parsing_used: !!openaiApiKey,
          ai_ranking_used: aiRankingUsed
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Error in enhanced search:', error)
    return new Response(
      JSON.stringify({ 
        candidates: [],
        total_results: 0,
        query,
        search_strategy: 'error',
        error: 'Search failed completely',
        error_details: error.message,
        fallback_used: true
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function fallbackQueryParsing(query: string): any {
  const queryLower = query.toLowerCase()
  const words = queryLower.split(/\s+/)
  
  const skillKeywords = [
    'javascript', 'typescript', 'python', 'java', 'react', 'angular', 'vue',
    'node.js', 'django', 'flask', 'spring', 'laravel', 'docker', 'kubernetes',
    'aws', 'azure', 'gcp', 'sql', 'mongodb', 'postgresql', 'redis', 'git'
  ]
  
  const locationKeywords = ['remote', 'london', 'new york', 'san francisco', 'berlin', 'toronto', 'sydney']
  
  const skills = []
  let location = ''
  let experience_min = 0
  const keywords = []
  
  words.forEach(word => {
    if (skillKeywords.includes(word)) {
      skills.push(word)
    } else if (locationKeywords.includes(word)) {
      location = word
    } else if (word.match(/\d+/) && queryLower.includes('year')) {
      experience_min = parseInt(word) || 0
    } else if (word.length > 2) {
      keywords.push(word)
    }
  })
  
  return { skills, location, experience_min, keywords }
}
