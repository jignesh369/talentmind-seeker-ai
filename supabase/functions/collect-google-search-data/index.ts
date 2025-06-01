
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
    const { query, location } = await req.json()

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
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

    // Get Google API credentials
    const googleApiKey = Deno.env.get('GOOGLE_API_KEY')
    const googleSearchEngineId = Deno.env.get('GOOGLE_SEARCH_ENGINE_ID')

    if (!googleApiKey || !googleSearchEngineId) {
      return new Response(
        JSON.stringify({ error: 'Google API credentials not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Build search queries for different platforms
    const searchQueries = [
      `${query} site:github.com ${location ? location : ''}`,
      `${query} site:linkedin.com/in ${location ? location : ''}`,
      `${query} site:stackoverflow.com/users ${location ? location : ''}`,
      `${query} developer portfolio ${location ? location : ''}`
    ]

    const candidates = []

    for (const searchQuery of searchQueries) {
      try {
        const response = await fetch(
          `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleSearchEngineId}&q=${encodeURIComponent(searchQuery)}&num=10`
        )

        if (!response.ok) continue

        const data = await response.json()
        const results = data.items || []

        for (const result of results) {
          // Extract information from search results
          let platform = 'web'
          let platformId = result.link
          let name = result.title
          let summary = result.snippet

          // Detect platform
          if (result.link.includes('github.com/')) {
            platform = 'github'
            const githubMatch = result.link.match(/github\.com\/([^\/]+)/)
            if (githubMatch) {
              platformId = githubMatch[1]
              name = platformId
            }
          } else if (result.link.includes('linkedin.com/in/')) {
            platform = 'linkedin'
            const linkedinMatch = result.link.match(/linkedin\.com\/in\/([^\/]+)/)
            if (linkedinMatch) {
              platformId = linkedinMatch[1]
            }
          } else if (result.link.includes('stackoverflow.com/users/')) {
            platform = 'stackoverflow'
            const soMatch = result.link.match(/stackoverflow\.com\/users\/(\d+)/)
            if (soMatch) {
              platformId = soMatch[1]
            }
          }

          // Extract skills from title and snippet
          const skillKeywords = [
            'python', 'javascript', 'typescript', 'java', 'c++', 'go', 'rust',
            'react', 'vue', 'angular', 'node.js', 'django', 'flask', 'fastapi',
            'machine learning', 'ml', 'ai', 'data science', 'backend', 'frontend'
          ]

          const text = (result.title + ' ' + result.snippet).toLowerCase()
          const extractedSkills = skillKeywords.filter(skill => text.includes(skill))

          const candidate = {
            name: name || 'Unknown Developer',
            title: result.title.substring(0, 100),
            summary: summary.substring(0, 500),
            skills: extractedSkills,
            experience_years: 3, // Default estimate
            last_active: new Date().toISOString(),
            overall_score: 60 + (extractedSkills.length * 5), // Base score + skill bonus
            skill_match: Math.min(extractedSkills.length * 20, 90),
            experience: 50,
            reputation: 40,
            freshness: 75,
            social_proof: 30,
            risk_flags: []
          }

          // Add platform-specific fields
          if (platform === 'github') {
            candidate.github_username = platformId
          } else if (platform === 'stackoverflow') {
            candidate.stackoverflow_id = platformId
          }

          candidates.push(candidate)

          // Save to database
          const { error } = await supabase
            .from('candidates')
            .upsert(candidate)

          if (error) {
            console.error('Error saving Google search candidate:', error)
          }

          // Save source data
          await supabase
            .from('candidate_sources')
            .upsert({
              candidate_id: platformId,
              platform: platform,
              platform_id: platformId,
              url: result.link,
              data: result
            }, { onConflict: 'platform,platform_id' })

        }

      } catch (error) {
        console.error(`Error processing search query ${searchQuery}:`, error)
        continue
      }
    }

    console.log(`Collected ${candidates.length} candidates from Google Search`)

    return new Response(
      JSON.stringify({ 
        candidates,
        total: candidates.length,
        source: 'google'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error collecting Google search data:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to collect Google search data' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
