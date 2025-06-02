
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { EnhancedGitHubSearchStrategies } from './enhanced-search-strategies.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, location, time_budget = 30, use_real_api = true } = await req.json()

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required', candidates: [] }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🚀 Starting enhanced GitHub collection...`)
    console.log(`Query: "${query}", Location: "${location || 'Any'}", Time Budget: ${time_budget}s`)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Parse query using enhanced parser
    const parsedQuery = EnhancedGitHubSearchStrategies.parseQueryForGitHub(query, location)
    console.log(`📊 Parsed query for GitHub:`, JSON.stringify(parsedQuery, null, 2))

    // Generate search strategies
    const strategies = EnhancedGitHubSearchStrategies.generateStrategiesFromParsedQuery(parsedQuery, location)
    console.log(`🎯 Generated ${strategies.length} enhanced search strategies`)

    const candidates = []
    const errors = []
    const startTime = Date.now()

    // Execute search strategies
    for (const strategy of strategies) {
      if (Date.now() - startTime > time_budget * 1000) {
        console.log(`⏰ Time budget exceeded, stopping search`)
        break
      }

      try {
        console.log(`🔍 Executing strategy: ${strategy.name} - ${strategy.query}`)
        
        // Simulate GitHub API call (replace with real API when available)
        if (use_real_api) {
          const githubToken = Deno.env.get('GITHUB_TOKEN')
          if (githubToken) {
            const searchUrl = `https://api.github.com/search/users?q=${encodeURIComponent(strategy.query)}&per_page=10`
            const response = await fetch(searchUrl, {
              headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Candidate-Search-App'
              }
            })

            if (response.ok) {
              const data = await response.json()
              console.log(`✅ GitHub API returned ${data.items?.length || 0} users for strategy: ${strategy.name}`)
              
              // Process GitHub users
              for (const user of data.items || []) {
                const candidate = {
                  id: crypto.randomUUID(),
                  name: user.login,
                  github_username: user.login,
                  avatar_url: user.avatar_url,
                  location: user.location || location,
                  title: `${parsedQuery.enhancedSkills[0] || 'Software'} Developer`,
                  skills: parsedQuery.enhancedSkills.slice(0, 5),
                  summary: `GitHub developer with ${user.public_repos || 0} repositories and ${user.followers || 0} followers`,
                  overall_score: Math.min(50 + (user.followers || 0) + (user.public_repos || 0) * 2, 100),
                  platform: 'github',
                  data_source: 'github_api_real',
                  search_strategy: strategy.name,
                  total_stars: 0,
                  total_forks: 0,
                  followers: user.followers || 0,
                  public_repos: user.public_repos || 0
                }

                candidates.push(candidate)
              }
            } else {
              console.error(`❌ GitHub API error for strategy ${strategy.name}:`, response.status)
              errors.push(`GitHub API error: ${response.status}`)
            }
          } else {
            console.log(`⚠️ No GitHub token available, skipping real API call`)
          }
        }
        
      } catch (error) {
        console.error(`❌ Error in strategy ${strategy.name}:`, error.message)
        errors.push(`Strategy ${strategy.name}: ${error.message}`)
      }
    }

    // Save candidates to database
    let savedCount = 0
    for (const candidate of candidates) {
      try {
        const { error: insertError } = await supabase
          .from('candidates')
          .upsert(candidate, { 
            onConflict: 'github_username',
            ignoreDuplicates: false 
          })

        if (!insertError) {
          savedCount++
        } else {
          console.error(`❌ Failed to save candidate ${candidate.name}:`, insertError.message)
        }
      } catch (saveError) {
        console.error(`❌ Database error saving ${candidate.name}:`, saveError.message)
      }
    }

    console.log(`✅ Enhanced GitHub collection completed in ${Date.now() - startTime}ms`)
    console.log(`📊 Results: ${savedCount} saved, ${errors.length} errors, ${candidates.length} total candidates`)

    return new Response(
      JSON.stringify({
        candidates,
        total: candidates.length,
        saved: savedCount,
        errors,
        strategies_used: strategies.length,
        parsed_query: parsedQuery,
        processing_time: Date.now() - startTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ GitHub collection error:', error)
    return new Response(
      JSON.stringify({
        error: 'GitHub collection failed',
        details: error.message,
        candidates: []
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
