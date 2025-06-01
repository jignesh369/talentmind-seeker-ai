
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name: string;
  company: string;
  location: string;
  email: string;
  bio: string;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, location, minRepos = 10 } = await req.json()

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

    // Get GitHub token from secrets
    const githubToken = Deno.env.get('GITHUB_TOKEN')
    if (!githubToken) {
      return new Response(
        JSON.stringify({ error: 'GitHub token not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Build GitHub search query
    let searchQuery = `${query} in:bio,name`
    if (location) {
      searchQuery += ` location:${location}`
    }
    searchQuery += ` repos:>=${minRepos} followers:>5`

    console.log('GitHub search query:', searchQuery)

    // Search GitHub users
    const response = await fetch(`https://api.github.com/search/users?q=${encodeURIComponent(searchQuery)}&per_page=50`, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'TalentMind-Recruiter'
      }
    })

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`)
    }

    const searchResults = await response.json()
    const users = searchResults.items || []

    const candidates = []

    // Fetch detailed info for each user
    for (const user of users.slice(0, 20)) { // Limit to prevent rate limiting
      try {
        // Get user details
        const userResponse = await fetch(`https://api.github.com/users/${user.login}`, {
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'TalentMind-Recruiter'
          }
        })

        if (!userResponse.ok) continue

        const userDetail: GitHubUser = await userResponse.json()

        // Get user's top repositories to extract skills
        const reposResponse = await fetch(`https://api.github.com/users/${user.login}/repos?sort=stars&per_page=10`, {
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'TalentMind-Recruiter'
          }
        })

        const repos = reposResponse.ok ? await reposResponse.json() : []
        
        // Extract skills from repository languages
        const skills = new Set<string>()
        for (const repo of repos) {
          if (repo.language) {
            skills.add(repo.language.toLowerCase())
          }
        }

        // Calculate basic scores
        const followerScore = Math.min(userDetail.followers / 100 * 20, 20)
        const repoScore = Math.min(userDetail.public_repos / 20 * 15, 15)
        const experienceYears = Math.floor((Date.now() - new Date(userDetail.created_at).getTime()) / (365 * 24 * 60 * 60 * 1000))
        const experienceScore = Math.min(experienceYears * 5, 25)

        const candidate = {
          name: userDetail.name || userDetail.login,
          title: userDetail.company ? `Developer at ${userDetail.company}` : 'Software Developer',
          location: userDetail.location,
          avatar_url: userDetail.avatar_url,
          email: userDetail.email,
          github_username: userDetail.login,
          summary: userDetail.bio || `GitHub developer with ${userDetail.public_repos} repositories and ${userDetail.followers} followers`,
          skills: Array.from(skills),
          experience_years: experienceYears,
          last_active: new Date().toISOString(),
          overall_score: Math.round(followerScore + repoScore + experienceScore + 40), // Base score of 40
          skill_match: 75, // Default, will be calculated based on search query
          experience: experienceScore,
          reputation: followerScore + repoScore,
          freshness: 85, // GitHub users are generally active
          social_proof: followerScore,
          risk_flags: []
        }

        candidates.push(candidate)

        // Save to database
        const { error } = await supabase
          .from('candidates')
          .upsert(candidate, { 
            onConflict: 'github_username',
            ignoreDuplicates: false 
          })

        if (error) {
          console.error('Error saving candidate:', error)
        }

        // Also save source data
        await supabase
          .from('candidate_sources')
          .upsert({
            candidate_id: candidate.github_username, // We'll need to get the actual ID after insert
            platform: 'github',
            platform_id: userDetail.login,
            url: `https://github.com/${userDetail.login}`,
            data: userDetail
          }, { onConflict: 'platform,platform_id' })

      } catch (error) {
        console.error(`Error processing user ${user.login}:`, error)
        continue
      }
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
