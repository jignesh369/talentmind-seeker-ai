
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
    const { query, location, enhancedQuery } = await req.json()

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

    // Build multiple targeted search queries
    const skills = enhancedQuery?.skills || []
    const keywords = enhancedQuery?.keywords || []
    const roleTypes = enhancedQuery?.role_types || []
    
    const searchQueries = []
    
    // Query 1: Skills-based search
    if (skills.length > 0) {
      const skillQuery = skills.slice(0, 3).join(' ')
      searchQueries.push(`${skillQuery} in:bio,name type:user ${location ? `location:${location}` : ''} repos:>=3 followers:>=1`)
    }
    
    // Query 2: Role-based search
    if (roleTypes.length > 0) {
      const roleQuery = roleTypes.slice(0, 2).join(' OR ')
      searchQueries.push(`${roleQuery} in:bio type:user ${location ? `location:${location}` : ''} repos:>=5`)
    }
    
    // Query 3: General keyword search
    if (keywords.length > 0) {
      const keywordQuery = keywords.slice(0, 2).join(' ')
      searchQueries.push(`${keywordQuery} developer in:bio type:user repos:>=2 followers:>=1`)
    }
    
    // Fallback query
    if (searchQueries.length === 0) {
      searchQueries.push(`${query} in:bio,name type:user repos:>=1`)
    }

    console.log('GitHub search queries:', searchQueries)

    const candidates = []
    const seenUsers = new Set()

    for (const searchQuery of searchQueries) {
      try {
        const response = await fetch(
          `https://api.github.com/search/users?q=${encodeURIComponent(searchQuery)}&per_page=30&sort=repositories`,
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
          
          if (response.status === 403) {
            console.log('Rate limit hit, breaking...')
            break
          }
          continue
        }

        const data = await response.json()
        const users = data.items || []

        console.log(`Found ${users.length} GitHub users for query: ${searchQuery}`)

        for (const user of users.slice(0, 20)) {
          // Skip if we've already processed this user
          if (seenUsers.has(user.login)) continue
          seenUsers.add(user.login)

          try {
            // Get detailed user info
            const userResponse = await fetch(user.url, {
              headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'TalentMind-App'
              }
            })

            if (!userResponse.ok) {
              console.log(`Failed to get user details for ${user.login}`)
              continue
            }

            const userDetails = await userResponse.json()

            // Get user's repositories for better skill analysis
            const reposResponse = await fetch(`${user.url}/repos?sort=updated&per_page=10`, {
              headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'TalentMind-App'
              }
            })

            let repositories = []
            if (reposResponse.ok) {
              repositories = await reposResponse.json()
            }

            // Enhanced skill extraction from bio and repositories
            const skills = extractSkillsFromGitHub(userDetails, repositories, enhancedQuery)
            
            // Validate this is a real developer profile
            if (!isValidDeveloperProfile(userDetails, repositories, skills)) {
              console.log(`Skipping ${user.login} - not a valid developer profile`)
              continue
            }

            // Calculate experience based on account age and activity
            const accountAge = Math.floor((new Date().getFullYear() - new Date(userDetails.created_at).getFullYear()))
            const estimatedExperience = Math.min(Math.max(accountAge, 1), 15)

            // Calculate quality scores
            const reputationScore = Math.min((userDetails.followers || 0) * 2 + (userDetails.public_repos || 0), 100)
            const activityScore = calculateActivityScore(userDetails, repositories)
            const skillMatchScore = calculateSkillMatch(skills, enhancedQuery)

            const candidate = {
              name: userDetails.name || userDetails.login,
              title: extractTitleFromBio(userDetails.bio) || 'Software Developer',
              location: userDetails.location || location || '',
              avatar_url: userDetails.avatar_url,
              email: userDetails.email,
              github_username: userDetails.login,
              summary: createSummaryFromGitHub(userDetails, repositories, skills),
              skills: skills,
              experience_years: estimatedExperience,
              last_active: userDetails.updated_at,
              overall_score: Math.round((reputationScore + activityScore + skillMatchScore) / 3),
              skill_match: skillMatchScore,
              experience: Math.min(estimatedExperience * 6 + (userDetails.public_repos || 0), 90),
              reputation: Math.min(reputationScore, 100),
              freshness: calculateFreshness(userDetails.updated_at),
              social_proof: Math.min((userDetails.followers || 0) * 3, 100),
              risk_flags: calculateRiskFlags(userDetails, repositories)
            }

            candidates.push(candidate)

            // Save source data
            await supabase
              .from('candidate_sources')
              .upsert({
                candidate_id: userDetails.login,
                platform: 'github',
                platform_id: userDetails.login,
                url: userDetails.html_url,
                data: { ...userDetails, repositories: repositories.slice(0, 5) }
              }, { onConflict: 'platform,platform_id' })

          } catch (error) {
            console.error(`Error processing GitHub user ${user.login}:`, error)
            continue
          }
        }

      } catch (error) {
        console.error(`GitHub search error for query "${searchQuery}":`, error)
        continue
      }
    }

    // Sort by overall score and limit
    const sortedCandidates = candidates
      .sort((a, b) => b.overall_score - a.overall_score)
      .slice(0, 25)

    console.log(`Collected ${sortedCandidates.length} candidates from GitHub`)

    return new Response(
      JSON.stringify({ 
        candidates: sortedCandidates,
        total: sortedCandidates.length,
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

function extractSkillsFromGitHub(userDetails, repositories, enhancedQuery) {
  const skills = new Set()
  
  // Extract from bio
  const bio = (userDetails.bio || '').toLowerCase()
  const bioSkills = [
    'python', 'javascript', 'typescript', 'java', 'c++', 'c#', 'go', 'rust', 'php', 'ruby',
    'react', 'vue', 'angular', 'node.js', 'django', 'flask', 'fastapi', 'spring', 'laravel',
    'machine learning', 'ml', 'ai', 'data science', 'backend', 'frontend', 'full stack',
    'devops', 'cloud', 'aws', 'azure', 'docker', 'kubernetes', 'tensorflow', 'pytorch'
  ]
  
  bioSkills.forEach(skill => {
    if (bio.includes(skill) || bio.includes(skill.replace(/[.\s]/g, ''))) {
      skills.add(skill)
    }
  })
  
  // Extract from repository languages and names
  repositories.forEach(repo => {
    if (repo.language) {
      skills.add(repo.language.toLowerCase())
    }
    
    const repoName = repo.name.toLowerCase()
    bioSkills.forEach(skill => {
      if (repoName.includes(skill.replace(/[.\s]/g, ''))) {
        skills.add(skill)
      }
    })
  })
  
  return Array.from(skills).slice(0, 10)
}

function isValidDeveloperProfile(userDetails, repositories, skills) {
  // Must have at least one of: bio mentioning development, skills, or recent repositories
  const hasBio = userDetails.bio && userDetails.bio.length > 10
  const hasSkills = skills.length > 0
  const hasRecentRepos = repositories.length > 0 && 
    new Date(repositories[0].updated_at) > new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
  
  return hasBio || hasSkills || hasRecentRepos
}

function extractTitleFromBio(bio) {
  if (!bio) return null
  
  const titlePatterns = [
    /^([^@\n]+)(?:@|$)/,
    /(.*?engineer.*?)/i,
    /(.*?developer.*?)/i,
    /(.*?programmer.*?)/i
  ]
  
  for (const pattern of titlePatterns) {
    const match = bio.match(pattern)
    if (match) {
      return match[1].trim().substring(0, 50)
    }
  }
  
  return null
}

function createSummaryFromGitHub(userDetails, repositories, skills) {
  const parts = []
  
  if (userDetails.bio) {
    parts.push(userDetails.bio)
  }
  
  parts.push(`GitHub developer with ${userDetails.public_repos || 0} public repositories`)
  
  if (skills.length > 0) {
    parts.push(`Specializes in: ${skills.slice(0, 5).join(', ')}`)
  }
  
  if (userDetails.followers > 10) {
    parts.push(`${userDetails.followers} followers`)
  }
  
  return parts.join('. ').substring(0, 300)
}

function calculateActivityScore(userDetails, repositories) {
  let score = 0
  
  // Recent activity bonus
  const lastUpdate = new Date(userDetails.updated_at)
  const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
  if (daysSinceUpdate < 30) score += 30
  else if (daysSinceUpdate < 90) score += 20
  else if (daysSinceUpdate < 180) score += 10
  
  // Repository activity
  const recentRepos = repositories.filter(repo => 
    new Date(repo.updated_at) > new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
  )
  score += Math.min(recentRepos.length * 5, 30)
  
  // Repository quality
  const starsTotal = repositories.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0)
  score += Math.min(starsTotal, 40)
  
  return Math.min(score, 100)
}

function calculateSkillMatch(skills, enhancedQuery) {
  if (!enhancedQuery || !enhancedQuery.skills) return 50
  
  const requiredSkills = enhancedQuery.skills.map(s => s.toLowerCase())
  const candidateSkills = skills.map(s => s.toLowerCase())
  
  const matches = requiredSkills.filter(skill => 
    candidateSkills.some(cSkill => cSkill.includes(skill) || skill.includes(cSkill))
  )
  
  return Math.min(matches.length * 20, 100)
}

function calculateFreshness(lastUpdate) {
  const daysSinceUpdate = (Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60 * 24)
  
  if (daysSinceUpdate < 7) return 100
  if (daysSinceUpdate < 30) return 80
  if (daysSinceUpdate < 90) return 60
  if (daysSinceUpdate < 180) return 40
  return 20
}

function calculateRiskFlags(userDetails, repositories) {
  const flags = []
  
  if (!userDetails.email) flags.push('No public email')
  if (!userDetails.bio) flags.push('No bio')
  if (userDetails.public_repos < 3) flags.push('Few repositories')
  if (userDetails.followers < 5) flags.push('Low social proof')
  
  const hasRecentActivity = repositories.some(repo => 
    new Date(repo.updated_at) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  )
  if (!hasRecentActivity) flags.push('No recent activity')
  
  return flags
}
