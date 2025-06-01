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

    // Enhanced search strategies with language-based targeting
    const skills = enhancedQuery?.skills || []
    const keywords = enhancedQuery?.keywords || []
    const roleTypes = enhancedQuery?.role_types || []
    
    const searchQueries = []
    
    // Strategy 1: Language-based searches (highest priority)
    const programmingLanguages = ['python', 'javascript', 'typescript', 'java', 'go', 'rust', 'php', 'ruby', 'c++']
    const detectedLanguages = skills.filter(skill => 
      programmingLanguages.includes(skill.toLowerCase())
    )
    
    if (detectedLanguages.length > 0) {
      for (const lang of detectedLanguages.slice(0, 2)) {
        searchQueries.push(`language:${lang}${location ? ` location:"${location}"` : ''} repos:>=5 followers:>=10`)
        searchQueries.push(`language:${lang} ${skills.slice(0, 2).join(' ')} repos:>=3 followers:>=5`)
      }
    }
    
    // Strategy 2: Technology stack searches
    const techStacks = [
      ['react', 'node.js'], ['django', 'python'], ['spring', 'java'], 
      ['rails', 'ruby'], ['laravel', 'php'], ['vue', 'javascript']
    ]
    
    for (const stack of techStacks) {
      if (skills.some(skill => stack.includes(skill.toLowerCase()))) {
        const stackTerms = stack.filter(tech => skills.some(s => s.toLowerCase().includes(tech)))
        if (stackTerms.length > 0) {
          searchQueries.push(`${stackTerms.join(' ')} in:bio${location ? ` location:"${location}"` : ''} repos:>=3`)
        }
      }
    }
    
    // Strategy 3: Role-based searches with location
    if (roleTypes.length > 0) {
      const roleQuery = roleTypes.slice(0, 2).join(' OR ')
      searchQueries.push(`${roleQuery} in:bio${location ? ` location:"${location}"` : ''} repos:>=5 followers:>=10`)
    }
    
    // Fallback strategy
    if (searchQueries.length === 0) {
      searchQueries.push(`${query} in:bio,name type:user repos:>=2${location ? ` location:"${location}"` : ''}`)
    }

    console.log('Enhanced GitHub search queries:', searchQueries)

    const candidates = []
    const seenUsers = new Set()

    for (const searchQuery of searchQueries.slice(0, 4)) { // Limit to 4 queries
      try {
        const response = await fetch(
          `https://api.github.com/search/users?q=${encodeURIComponent(searchQuery)}&per_page=40&sort=repositories`,
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

        for (const user of users.slice(0, 25)) {
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

            // Get user's repositories for better analysis
            const reposResponse = await fetch(`${user.url}/repos?sort=updated&per_page=15`, {
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

            // Enhanced README crawling for email discovery
            const emailFromReadme = await extractEmailFromReadmes(repositories, githubToken)
            
            // Enhanced skill extraction
            const skills = extractEnhancedSkillsFromGitHub(userDetails, repositories, enhancedQuery)
            
            // Validate developer profile with stricter criteria
            if (!isValidDeveloperProfile(userDetails, repositories, skills)) {
              console.log(`Skipping ${user.login} - not a valid developer profile`)
              continue
            }

            // Calculate enhanced experience and activity
            const accountAge = Math.floor((new Date().getFullYear() - new Date(userDetails.created_at).getFullYear()))
            const estimatedExperience = Math.min(Math.max(accountAge, 1), 15)
            const activityScore = calculateEnhancedActivityScore(userDetails, repositories)
            const languageScore = calculateLanguageExpertiseScore(repositories, detectedLanguages)

            // Enhanced scoring with language expertise
            const reputationScore = Math.min((userDetails.followers || 0) * 3 + (userDetails.public_repos || 0) * 2, 100)
            const skillMatchScore = calculateEnhancedSkillMatch(skills, enhancedQuery)
            const overallScore = Math.round((reputationScore + activityScore + skillMatchScore + languageScore) / 4)

            const candidate = {
              name: userDetails.name || userDetails.login,
              title: extractEnhancedTitleFromBio(userDetails.bio) || inferTitleFromLanguages(repositories),
              location: userDetails.location || location || '',
              avatar_url: userDetails.avatar_url,
              email: emailFromReadme || userDetails.email, // Prioritize README email
              github_username: userDetails.login,
              summary: createEnhancedSummaryFromGitHub(userDetails, repositories, skills),
              skills: skills,
              experience_years: estimatedExperience,
              last_active: userDetails.updated_at,
              overall_score: overallScore,
              skill_match: skillMatchScore,
              experience: Math.min(estimatedExperience * 6 + (userDetails.public_repos || 0), 90),
              reputation: Math.min(reputationScore, 100),
              freshness: calculateFreshness(userDetails.updated_at),
              social_proof: Math.min((userDetails.followers || 0) * 3, 100),
              risk_flags: calculateRiskFlags(userDetails, repositories),
              language_expertise: languageScore,
              readme_email_found: !!emailFromReadme
            }

            candidates.push(candidate)

            // Save enhanced source data
            await supabase
              .from('candidate_sources')
              .upsert({
                candidate_id: userDetails.login,
                platform: 'github',
                platform_id: userDetails.login,
                url: userDetails.html_url,
                data: { 
                  ...userDetails, 
                  repositories: repositories.slice(0, 8),
                  readme_email: emailFromReadme,
                  language_stats: calculateLanguageStats(repositories)
                }
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

    // Sort by overall score and language expertise
    const sortedCandidates = candidates
      .sort((a, b) => (b.overall_score + b.language_expertise) - (a.overall_score + a.language_expertise))
      .slice(0, 30)

    console.log(`Collected ${sortedCandidates.length} enhanced candidates from GitHub`)

    return new Response(
      JSON.stringify({ 
        candidates: sortedCandidates,
        total: sortedCandidates.length,
        source: 'github',
        enhancement_stats: {
          emails_from_readme: sortedCandidates.filter(c => c.readme_email_found).length,
          language_based_searches: detectedLanguages.length,
          avg_language_expertise: Math.round(sortedCandidates.reduce((sum, c) => sum + c.language_expertise, 0) / sortedCandidates.length)
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error collecting enhanced GitHub data:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to collect enhanced GitHub data' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

// Enhanced README email extraction function
async function extractEmailFromReadmes(repositories, githubToken) {
  for (const repo of repositories.slice(0, 5)) { // Check top 5 repos
    try {
      const readmeResponse = await fetch(
        `https://api.github.com/repos/${repo.full_name}/readme`,
        {
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'TalentMind-App'
          }
        }
      )

      if (readmeResponse.ok) {
        const readmeData = await readmeResponse.json()
        const content = atob(readmeData.content)
        
        // Extract email using regex
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
        const emails = content.match(emailRegex)
        
        if (emails && emails.length > 0) {
          // Filter out common non-personal emails
          const personalEmail = emails.find(email => 
            !email.includes('noreply') && 
            !email.includes('example') && 
            !email.includes('test') &&
            !email.includes('github.com')
          )
          
          if (personalEmail) {
            console.log(`Found email in README: ${personalEmail}`)
            return personalEmail
          }
        }
      }
    } catch (error) {
      console.log(`Error checking README for ${repo.full_name}:`, error.message)
    }
  }
  return null
}

// Enhanced skill extraction with better language detection
function extractEnhancedSkillsFromGitHub(userDetails, repositories, enhancedQuery) {
  const skills = new Set()
  
  // Extract from bio with enhanced patterns
  const bio = (userDetails.bio || '').toLowerCase()
  const advancedSkills = [
    'python', 'javascript', 'typescript', 'java', 'c++', 'c#', 'go', 'rust', 'php', 'ruby', 'swift', 'kotlin',
    'react', 'vue', 'angular', 'node.js', 'django', 'flask', 'fastapi', 'spring', 'laravel', 'rails',
    'machine learning', 'ml', 'ai', 'data science', 'backend', 'frontend', 'full stack', 'fullstack',
    'devops', 'cloud', 'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform',
    'tensorflow', 'pytorch', 'scikit-learn', 'pandas', 'numpy'
  ]
  
  advancedSkills.forEach(skill => {
    const variations = [skill, skill.replace(/[.\s]/g, ''), skill.replace(/[.\s]/g, '-')]
    if (variations.some(variant => bio.includes(variant))) {
      skills.add(skill)
    }
  })
  
  // Enhanced repository language analysis
  const languageStats = {}
  repositories.forEach(repo => {
    if (repo.language) {
      const lang = repo.language.toLowerCase()
      languageStats[lang] = (languageStats[lang] || 0) + 1
      skills.add(lang)
    }
    
    // Extract skills from repo names and descriptions
    const repoText = `${repo.name} ${repo.description || ''}`.toLowerCase()
    advancedSkills.forEach(skill => {
      if (repoText.includes(skill.replace(/[.\s]/g, ''))) {
        skills.add(skill)
      }
    })
  })
  
  return Array.from(skills).slice(0, 12)
}

// Enhanced activity scoring
function calculateEnhancedActivityScore(userDetails, repositories) {
  let score = 0
  
  // Recent activity bonus (enhanced)
  const lastUpdate = new Date(userDetails.updated_at)
  const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
  if (daysSinceUpdate < 7) score += 40
  else if (daysSinceUpdate < 30) score += 30
  else if (daysSinceUpdate < 90) score += 20
  else if (daysSinceUpdate < 180) score += 10
  
  // Repository activity with quality weighting
  const recentRepos = repositories.filter(repo => 
    new Date(repo.updated_at) > new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
  )
  score += Math.min(recentRepos.length * 6, 35)
  
  // Quality indicators
  const totalStars = repositories.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0)
  const totalForks = repositories.reduce((sum, repo) => sum + (repo.forks_count || 0), 0)
  score += Math.min(totalStars / 2, 25)
  score += Math.min(totalForks, 15)
  
  return Math.min(score, 100)
}

// Language expertise scoring
function calculateLanguageExpertiseScore(repositories, detectedLanguages) {
  if (detectedLanguages.length === 0) return 50
  
  const languageStats = {}
  repositories.forEach(repo => {
    if (repo.language) {
      const lang = repo.language.toLowerCase()
      languageStats[lang] = (languageStats[lang] || 0) + 1
    }
  })
  
  let expertiseScore = 0
  detectedLanguages.forEach(lang => {
    const count = languageStats[lang.toLowerCase()] || 0
    expertiseScore += Math.min(count * 10, 30)
  })
  
  return Math.min(expertiseScore, 100)
}

// Enhanced skill matching
function calculateEnhancedSkillMatch(skills, enhancedQuery) {
  if (!enhancedQuery || !enhancedQuery.skills) return 50
  
  const requiredSkills = [...(enhancedQuery.skills || []), ...(enhancedQuery.keywords || [])].map(s => s.toLowerCase())
  const candidateSkills = skills.map(s => s.toLowerCase())
  
  const directMatches = requiredSkills.filter(skill => 
    candidateSkills.some(cSkill => cSkill.includes(skill) || skill.includes(cSkill))
  )
  
  const semanticMatches = requiredSkills.filter(skill => {
    const semanticMap = {
      'ai': ['machine learning', 'ml', 'tensorflow', 'pytorch'],
      'backend': ['api', 'server', 'django', 'flask', 'spring'],
      'frontend': ['react', 'vue', 'angular', 'ui', 'ux'],
      'devops': ['docker', 'kubernetes', 'aws', 'cloud']
    }
    
    return Object.entries(semanticMap).some(([key, values]) => 
      skill.includes(key) && values.some(v => candidateSkills.includes(v))
    )
  })
  
  const totalMatches = directMatches.length + semanticMatches.length
  return Math.min(totalMatches * 15, 100)
}

// Enhanced title extraction
function extractEnhancedTitleFromBio(bio) {
  if (!bio) return null
  
  const titlePatterns = [
    /^([^@\n]+)(?:@|$)/,
    /(.*?(?:engineer|developer|programmer|architect|lead|senior|principal).*?)/i,
    /(.*?(?:scientist|analyst|specialist).*?)/i
  ]
  
  for (const pattern of titlePatterns) {
    const match = bio.match(pattern)
    if (match) {
      return match[1].trim().substring(0, 60)
    }
  }
  
  return null
}

// Infer title from programming languages
function inferTitleFromLanguages(repositories) {
  const languageStats = {}
  repositories.forEach(repo => {
    if (repo.language) {
      const lang = repo.language.toLowerCase()
      languageStats[lang] = (languageStats[lang] || 0) + 1
    }
  })
  
  const topLanguage = Object.entries(languageStats)
    .sort(([,a], [,b]) => b - a)[0]?.[0]
  
  if (topLanguage) {
    const titleMap = {
      'python': 'Python Developer',
      'javascript': 'JavaScript Developer', 
      'typescript': 'TypeScript Developer',
      'java': 'Java Developer',
      'go': 'Go Developer',
      'rust': 'Rust Developer'
    }
    return titleMap[topLanguage] || `${topLanguage.charAt(0).toUpperCase() + topLanguage.slice(1)} Developer`
  }
  
  return 'Software Developer'
}

// Enhanced summary creation
function createEnhancedSummaryFromGitHub(userDetails, repositories, skills) {
  const parts = []
  
  if (userDetails.bio) {
    parts.push(userDetails.bio)
  }
  
  parts.push(`GitHub developer with ${userDetails.public_repos || 0} public repositories`)
  
  if (skills.length > 0) {
    parts.push(`Expertise in: ${skills.slice(0, 6).join(', ')}`)
  }
  
  const totalStars = repositories.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0)
  if (totalStars > 10) {
    parts.push(`${totalStars} total stars across projects`)
  }
  
  if (userDetails.followers > 10) {
    parts.push(`${userDetails.followers} followers`)
  }
  
  return parts.join('. ').substring(0, 350)
}

// Language statistics calculation
function calculateLanguageStats(repositories) {
  const stats = {}
  repositories.forEach(repo => {
    if (repo.language) {
      stats[repo.language] = (stats[repo.language] || 0) + 1
    }
  })
  return stats
}

// ... keep existing code (isValidDeveloperProfile, calculateFreshness, calculateRiskFlags functions)
function isValidDeveloperProfile(userDetails, repositories, skills) {
  // Must have at least one of: bio mentioning development, skills, or recent repositories
  const hasBio = userDetails.bio && userDetails.bio.length > 10
  const hasSkills = skills.length > 0
  const hasRecentRepos = repositories.length > 0 && 
    new Date(repositories[0].updated_at) > new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
  
  return hasBio || hasSkills || hasRecentRepos
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
