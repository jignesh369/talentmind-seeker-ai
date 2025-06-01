
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
    const supabase = createClient(supabaseUrl, supabaseKey)

    const skills = enhancedQuery?.skills || []
    const keywords = enhancedQuery?.keywords || []
    const searchTerms = [...skills, ...keywords].filter(Boolean)

    const candidates = []
    const seenAuthors = new Set()

    try {
      console.log('Searching Dev.to for active developers...')

      // Search for articles with relevant tags
      const searchTags = searchTerms.slice(0, 5).map(term => term.toLowerCase().replace(/\s+/g, ''))
      
      for (const tag of searchTags) {
        try {
          console.log(`Searching Dev.to articles with tag: ${tag}`)
          
          const articlesResponse = await fetch(`https://dev.to/api/articles?tag=${tag}&per_page=30&top=7`)
          
          if (!articlesResponse.ok) {
            console.error(`Dev.to API error for tag ${tag}: ${articlesResponse.status}`)
            continue
          }

          const articles = await articlesResponse.json()
          console.log(`Found ${articles.length} articles for tag ${tag}`)

          for (const article of articles) {
            if (!article.user?.username || seenAuthors.has(article.user.username)) continue
            seenAuthors.add(article.user.username)

            try {
              // Get user profile
              const userResponse = await fetch(`https://dev.to/api/users/${article.user.username}`)
              
              if (userResponse.ok) {
                const userProfile = await userResponse.json()
                
                // Get user's articles to analyze their expertise
                const userArticlesResponse = await fetch(`https://dev.to/api/articles?username=${article.user.username}&per_page=10`)
                const userArticles = userArticlesResponse.ok ? await userArticlesResponse.json() : []

                // Extract skills from user profile and articles
                const extractedSkills = extractSkillsFromDevToProfile(userProfile, userArticles, searchTerms)
                
                if (extractedSkills.length === 0) continue

                // Check if user has significant development activity
                if (!isDeveloperProfile(userProfile, userArticles, extractedSkills)) continue

                const candidate = {
                  name: userProfile.name || userProfile.username,
                  title: determineDeveloperTitle(userProfile, userArticles),
                  summary: userProfile.summary || extractSummaryFromArticles(userArticles),
                  location: userProfile.location || location || '',
                  skills: extractedSkills,
                  experience_years: estimateExperienceFromDevTo(userProfile, userArticles),
                  last_active: getLastActiveDate(userArticles),
                  overall_score: calculateDevToScore(userProfile, userArticles),
                  skill_match: calculateSkillMatch(extractedSkills, searchTerms),
                  experience: calculateExperienceScore(userProfile, userArticles),
                  reputation: calculateReputationScore(userProfile, userArticles),
                  freshness: calculateFreshnessScore(userArticles),
                  social_proof: Math.min((userProfile.public_reactions_count || 0) / 50, 80),
                  risk_flags: [],
                  devto_username: userProfile.username,
                  github_username: userProfile.github_username,
                  twitter_username: userProfile.twitter_username,
                  website_url: userProfile.website_url
                }

                candidates.push(candidate)

                // Save source data
                await supabase
                  .from('candidate_sources')
                  .upsert({
                    candidate_id: userProfile.username,
                    platform: 'dev.to',
                    platform_id: userProfile.username,
                    url: `https://dev.to/${userProfile.username}`,
                    data: { profile: userProfile, articles: userArticles.slice(0, 5) }
                  }, { onConflict: 'platform,platform_id' })

              }
            } catch (userError) {
              console.error(`Error processing Dev.to user ${article.user.username}:`, userError)
            }
          }
        } catch (tagError) {
          console.error(`Error processing tag ${tag}:`, tagError)
        }
      }

      // Also search popular/trending articles for active developers
      try {
        const trendingResponse = await fetch('https://dev.to/api/articles?per_page=50&top=7')
        
        if (trendingResponse.ok) {
          const trendingArticles = await trendingResponse.json()
          
          for (const article of trendingArticles) {
            if (!article.user?.username || seenAuthors.has(article.user.username)) continue
            
            // Check if article contains relevant keywords
            const articleText = `${article.title} ${article.description || ''} ${article.tag_list?.join(' ') || ''}`.toLowerCase()
            const hasRelevantContent = searchTerms.some(term => articleText.includes(term.toLowerCase()))
            
            if (!hasRelevantContent) continue
            
            seenAuthors.add(article.user.username)

            try {
              const userResponse = await fetch(`https://dev.to/api/users/${article.user.username}`)
              
              if (userResponse.ok) {
                const userProfile = await userResponse.json()
                const userArticlesResponse = await fetch(`https://dev.to/api/articles?username=${article.user.username}&per_page=10`)
                const userArticles = userArticlesResponse.ok ? await userArticlesResponse.json() : []

                const extractedSkills = extractSkillsFromDevToProfile(userProfile, userArticles, searchTerms)
                
                if (extractedSkills.length === 0 || !isDeveloperProfile(userProfile, userArticles, extractedSkills)) continue

                const candidate = {
                  name: userProfile.name || userProfile.username,
                  title: determineDeveloperTitle(userProfile, userArticles),
                  summary: userProfile.summary || extractSummaryFromArticles(userArticles),
                  location: userProfile.location || location || '',
                  skills: extractedSkills,
                  experience_years: estimateExperienceFromDevTo(userProfile, userArticles),
                  last_active: getLastActiveDate(userArticles),
                  overall_score: calculateDevToScore(userProfile, userArticles),
                  skill_match: calculateSkillMatch(extractedSkills, searchTerms),
                  experience: calculateExperienceScore(userProfile, userArticles),
                  reputation: calculateReputationScore(userProfile, userArticles),
                  freshness: calculateFreshnessScore(userArticles),
                  social_proof: Math.min((userProfile.public_reactions_count || 0) / 50, 80),
                  risk_flags: [],
                  devto_username: userProfile.username,
                  github_username: userProfile.github_username,
                  twitter_username: userProfile.twitter_username,
                  website_url: userProfile.website_url
                }

                candidates.push(candidate)

                await supabase
                  .from('candidate_sources')
                  .upsert({
                    candidate_id: userProfile.username,
                    platform: 'dev.to',
                    platform_id: userProfile.username,
                    url: `https://dev.to/${userProfile.username}`,
                    data: { profile: userProfile, articles: userArticles.slice(0, 5) }
                  }, { onConflict: 'platform,platform_id' })
              }
            } catch (userError) {
              console.error(`Error processing trending user:`, userError)
            }
          }
        }
      } catch (trendingError) {
        console.error('Error processing trending articles:', trendingError)
      }

    } catch (error) {
      console.error('Error collecting Dev.to data:', error)
    }

    console.log(`Collected ${candidates.length} Dev.to candidates`)

    return new Response(
      JSON.stringify({ 
        candidates,
        total: candidates.length,
        source: 'dev.to'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error collecting Dev.to data:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to collect Dev.to data' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function extractSkillsFromDevToProfile(profile, articles, searchTerms) {
  const skills = []
  const text = `${profile.summary || ''} ${articles.map(a => `${a.title} ${a.description || ''} ${a.tag_list?.join(' ') || ''}`).join(' ')}`.toLowerCase()
  
  const techSkills = [
    'javascript', 'typescript', 'python', 'java', 'c#', 'php', 'ruby', 'go', 'rust', 'swift',
    'react', 'vue', 'angular', 'svelte', 'nextjs', 'nuxt', 'gatsby', 'node.js', 'express',
    'django', 'flask', 'spring', 'laravel', 'rails', 'asp.net', 'fastapi',
    'html', 'css', 'sass', 'tailwind', 'bootstrap', 'material-ui', 'styled-components',
    'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch', 'firebase',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'ansible',
    'git', 'ci/cd', 'jenkins', 'github actions', 'gitlab ci', 'testing', 'jest',
    'machine learning', 'ai', 'data science', 'tensorflow', 'pytorch', 'scikit-learn'
  ]

  for (const skill of techSkills) {
    if (text.includes(skill) || text.includes(skill.replace(/[.\s]/g, ''))) {
      skills.push(skill)
    }
  }

  // Add search terms that appear in content
  for (const term of searchTerms) {
    if (text.includes(term.toLowerCase()) && !skills.includes(term)) {
      skills.push(term)
    }
  }

  return skills.slice(0, 10)
}

function isDeveloperProfile(profile, articles, skills) {
  // Check if profile/articles indicate developer activity
  const devIndicators = [
    skills.length >= 2,
    articles.some(a => a.tag_list?.some(tag => 
      ['javascript', 'python', 'react', 'programming', 'coding', 'development', 'webdev', 'tutorial'].includes(tag.toLowerCase())
    )),
    profile.summary?.toLowerCase().includes('developer') || 
    profile.summary?.toLowerCase().includes('engineer') || 
    profile.summary?.toLowerCase().includes('programmer'),
    articles.length >= 2 // Active writer
  ]

  return devIndicators.filter(Boolean).length >= 2
}

function determineDeveloperTitle(profile, articles) {
  const tags = articles.flatMap(a => a.tag_list || []).map(t => t.toLowerCase())
  const content = `${profile.summary || ''} ${articles.map(a => a.title).join(' ')}`.toLowerCase()

  if (tags.includes('react') || content.includes('react')) return 'React Developer'
  if (tags.includes('python') || content.includes('python')) return 'Python Developer'
  if (tags.includes('javascript') || content.includes('javascript')) return 'JavaScript Developer'
  if (tags.includes('node') || content.includes('node')) return 'Node.js Developer'
  if (tags.includes('frontend') || content.includes('frontend')) return 'Frontend Developer'
  if (tags.includes('backend') || content.includes('backend')) return 'Backend Developer'
  if (tags.includes('fullstack') || content.includes('fullstack')) return 'Full Stack Developer'
  if (tags.includes('devops') || content.includes('devops')) return 'DevOps Engineer'
  if (tags.includes('mobile') || content.includes('mobile')) return 'Mobile Developer'

  return 'Software Developer'
}

function extractSummaryFromArticles(articles) {
  if (articles.length === 0) return 'Active Dev.to contributor'
  
  const recentTitles = articles.slice(0, 3).map(a => a.title)
  return `Developer and writer covering ${recentTitles.join(', ')}`
}

function estimateExperienceFromDevTo(profile, articles) {
  const joinedDate = profile.joined_at ? new Date(profile.joined_at) : new Date()
  const yearsOnPlatform = Math.floor((Date.now() - joinedDate.getTime()) / (1000 * 60 * 60 * 24 * 365))
  
  // Estimate based on article depth and platform tenure
  const articleCount = articles.length
  let experience = Math.max(yearsOnPlatform, 1)
  
  if (articleCount > 20) experience += 2
  if (articleCount > 50) experience += 2
  
  // Check for senior-level content
  const content = articles.map(a => `${a.title} ${a.description || ''}`).join(' ').toLowerCase()
  if (content.includes('architecture') || content.includes('lead') || content.includes('senior')) {
    experience += 3
  }
  
  return Math.min(experience, 15)
}

function getLastActiveDate(articles) {
  if (articles.length === 0) return new Date().toISOString()
  
  const latestArticle = articles.reduce((latest, article) => {
    return new Date(article.published_at) > new Date(latest.published_at) ? article : latest
  })
  
  return latestArticle.published_at
}

function calculateDevToScore(profile, articles) {
  let score = 35 // Base score

  score += Math.min(articles.length * 2, 25) // Article count bonus
  score += Math.min((profile.public_reactions_count || 0) / 100, 20) // Engagement bonus
  score += Math.min(articles.reduce((sum, a) => sum + (a.public_reactions_count || 0), 0) / 200, 15) // Article popularity
  score += profile.github_username ? 10 : 0 // GitHub connection bonus

  return Math.min(score, 100)
}

function calculateSkillMatch(extractedSkills, searchTerms) {
  const matches = searchTerms.filter(term => 
    extractedSkills.some(skill => 
      skill.toLowerCase().includes(term.toLowerCase()) || 
      term.toLowerCase().includes(skill.toLowerCase())
    )
  )
  
  return Math.min((matches.length / Math.max(searchTerms.length, 1)) * 100, 100)
}

function calculateExperienceScore(profile, articles) {
  const years = estimateExperienceFromDevTo(profile, articles)
  return Math.min(years * 8, 90)
}

function calculateReputationScore(profile, articles) {
  const totalReactions = (profile.public_reactions_count || 0) + 
    articles.reduce((sum, a) => sum + (a.public_reactions_count || 0), 0)
  
  return Math.min(40 + (totalReactions / 50), 90)
}

function calculateFreshnessScore(articles) {
  if (articles.length === 0) return 30
  
  const latestArticle = articles[0]
  const daysSincePublished = Math.floor((Date.now() - new Date(latestArticle.published_at).getTime()) / (1000 * 60 * 60 * 24))
  
  if (daysSincePublished <= 30) return 90
  if (daysSincePublished <= 90) return 70
  if (daysSincePublished <= 180) return 50
  return 30
}
