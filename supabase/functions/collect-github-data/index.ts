
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const githubToken = Deno.env.get('GITHUB_TOKEN')
    const supabase = createClient(supabaseUrl, supabaseKey)

    if (!githubToken) {
      console.error('GitHub token not configured')
      return new Response(
        JSON.stringify({ error: 'GitHub API token not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Build search query with improved parameters
    const searchTerms = query.split(' ').filter(term => term.length > 2)
    let searchQuery = searchTerms.join(' ')
    
    // Add GitHub-specific search qualifiers
    searchQuery += ' in:bio,name'
    if (location) {
      searchQuery += ` location:${location}`
    }
    searchQuery += ' repos:>=5 followers:>1' // Focus on active users

    console.log('GitHub search query:', searchQuery)

    const candidates = []

    try {
      const response = await fetch(
        `https://api.github.com/search/users?q=${encodeURIComponent(searchQuery)}&per_page=30`,
        {
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'TalentMind-App'
          }
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error('GitHub API error:', response.status, errorText)
        throw new Error(`GitHub API error: ${response.status}`)
      }

      const data = await response.json()
      const users = data.items || []

      console.log(`Found ${users.length} GitHub users`)

      for (const user of users.slice(0, 20)) { // Limit to 20 users
        try {
          // Get detailed user info
          const userResponse = await fetch(user.url, {
            headers: {
              'Authorization': `token ${githubToken}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'TalentMind-App'
            }
          })

          if (!userResponse.ok) continue

          const userDetails = await userResponse.json()

          // Extract skills from bio and recent repositories
          const skills = []
          const bio = userDetails.bio?.toLowerCase() || ''
          const skillKeywords = [
            'python', 'javascript', 'typescript', 'java', 'c++', 'go', 'rust',
            'react', 'vue', 'angular', 'node.js', 'django', 'flask',
            'machine learning', 'ml', 'ai', 'data science', 'backend', 'frontend'
          ]

          skillKeywords.forEach(skill => {
            if (bio.includes(skill)) {
              skills.push(skill)
            }
          })

          const candidate = {
            name: userDetails.name || userDetails.login,
            title: 'Software Developer',
            location: userDetails.location || location || '',
            avatar_url: userDetails.avatar_url,
            email: userDetails.email,
            github_username: userDetails.login,
            summary: userDetails.bio || `GitHub developer with ${userDetails.public_repos} public repositories`,
            skills: skills,
            experience_years: Math.min(Math.max(Math.floor((new Date().getFullYear() - new Date(userDetails.created_at).getFullYear()) / 2), 1), 15),
            last_active: userDetails.updated_at,
            overall_score: Math.min(60 + (userDetails.followers * 2) + (userDetails.public_repos), 100),
            skill_match: skills.length * 15,
            experience: Math.min(userDetails.public_repos * 5, 90),
            reputation: Math.min(userDetails.followers * 3, 100),
            freshness: 80, // GitHub users are generally active
            social_proof: Math.min(userDetails.followers * 2, 100),
            risk_flags: []
          }

          candidates.push(candidate)

          // Save to database
          const { error } = await supabase
            .from('candidates')
            .upsert(candidate, { onConflict: 'github_username' })

          if (error) {
            console.error('Error saving GitHub candidate:', error)
          }

          // Save source data
          await supabase
            .from('candidate_sources')
            .upsert({
              candidate_id: userDetails.login,
              platform: 'github',
              platform_id: userDetails.login,
              url: userDetails.html_url,
              data: userDetails
            }, { onConflict: 'platform,platform_id' })

        } catch (error) {
          console.error(`Error processing GitHub user ${user.login}:`, error)
          continue
        }
      }

    } catch (error) {
      console.error('GitHub search error:', error)
      throw error
    }

    console.log(`Collected ${candidates.length} candidates from GitHub`)

    return new Response(
      JSON.stringify({ 
        candidates,
        total: candidates.length,
        source: 'github'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error collecting GitHub data:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to collect GitHub data' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
