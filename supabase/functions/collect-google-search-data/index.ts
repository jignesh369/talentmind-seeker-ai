
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
    const { query, location, enhancedQuery, searchQueries } = await req.json()

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
    const googleApiKey = Deno.env.get('GOOGLE_API_KEY')
    const googleSearchEngineId = Deno.env.get('GOOGLE_SEARCH_ENGINE_ID')
    const supabase = createClient(supabaseUrl, supabaseKey)

    if (!googleApiKey || !googleSearchEngineId) {
      console.log('Google Search API not configured, skipping...')
      return new Response(
        JSON.stringify({ 
          candidates: [],
          total: 0,
          source: 'google',
          error: 'Google Search API not configured'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Starting enhanced Google Search with Boolean queries...')

    const candidates = []
    const seenUrls = new Set()

    // Use advanced Boolean search queries if provided
    const queriesToSearch = searchQueries && searchQueries.length > 0 
      ? searchQueries.slice(0, 6) // Limit to 6 queries to conserve API calls
      : buildFallbackQueries(query, location, enhancedQuery)

    console.log(`Executing ${queriesToSearch.length} enhanced search queries...`)

    for (const searchQuery of queriesToSearch) {
      try {
        console.log(`🔍 Boolean search: ${searchQuery.substring(0, 100)}...`)
        
        const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleSearchEngineId}&q=${encodeURIComponent(searchQuery)}&num=10`
        
        const response = await fetch(searchUrl)
        
        if (!response.ok) {
          console.error(`Google Search API error: ${response.status}`)
          continue
        }

        const data = await response.json()
        const items = data.items || []

        console.log(`📊 Found ${items.length} results for query`)

        for (const item of items) {
          if (seenUrls.has(item.link)) continue
          seenUrls.add(item.link)

          // Enhanced candidate extraction with Boolean context
          const candidate = await extractEnhancedCandidateFromResult(item, enhancedQuery, searchQuery)
          
          if (candidate && isValidDeveloperCandidate(candidate, enhancedQuery)) {
            candidates.push(candidate)

            // Save enhanced source data
            try {
              await supabase
                .from('candidate_sources')
                .upsert({
                  candidate_id: generateCandidateId(item),
                  platform: 'google',
                  platform_id: item.link,
                  url: item.link,
                  data: { 
                    ...item, 
                    search_query: searchQuery,
                    boolean_context: true,
                    discovery_method: 'enhanced_google_boolean'
                  }
                }, { onConflict: 'platform,platform_id' })
            } catch (error) {
              console.error('Error saving Google source data:', error)
            }
          }
        }

        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        console.error(`Error in Google search query: ${searchQuery}`, error)
        continue
      }
    }

    // Enhanced scoring and deduplication
    const scoredCandidates = await enhanceGoogleCandidateScoring(candidates, enhancedQuery)
    const deduplicatedCandidates = deduplicateGoogleCandidates(scoredCandidates)

    const finalCandidates = deduplicatedCandidates
      .sort((a, b) => b.overall_score - a.overall_score)
      .slice(0, 20)

    console.log(`✅ Google Search completed: ${finalCandidates.length} enhanced candidates`)

    return new Response(
      JSON.stringify({ 
        candidates: finalCandidates,
        total: finalCandidates.length,
        source: 'google',
        enhancement_stats: {
          boolean_queries_used: queriesToSearch.length,
          enhanced_google_discoveries: finalCandidates.length,
          linkedin_profiles_found: finalCandidates.filter(c => c.linkedin_url).length,
          portfolio_sites_found: finalCandidates.filter(c => c.portfolio_url).length,
          github_profiles_found: finalCandidates.filter(c => c.github_url).length
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in enhanced Google Search:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to perform enhanced Google Search' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function buildFallbackQueries(query: string, location: string, enhancedQuery: any): string[] {
  const queries = []
  const skills = enhancedQuery?.skills || []
  const roleTypes = enhancedQuery?.role_types || []

  // LinkedIn profile searches
  if (roleTypes.length > 0) {
    const primaryRole = roleTypes[0]
    const skillGroup = skills.slice(0, 3).map(skill => `"${skill}"`).join(' OR ')
    queries.push(`site:linkedin.com/in "${primaryRole}" ${location ? `"${location}"` : ''} ${skillGroup} -job -hiring`)
  }

  // GitHub profile searches
  if (skills.length > 0) {
    queries.push(`site:github.com "${skills[0]}" ${location ? `"${location}"` : ''} developer`)
  }

  // Portfolio and resume searches
  queries.push(`"portfolio" OR "resume" "${query}" developer filetype:pdf OR site:github.io`)

  // Stack Overflow profiles
  queries.push(`site:stackoverflow.com/users "${query}" developer`)

  return queries.slice(0, 4)
}

async function extractEnhancedCandidateFromResult(item: any, enhancedQuery: any, searchQuery: string) {
  try {
    const title = item.title || ''
    const snippet = item.snippet || ''
    const url = item.link || ''

    // Enhanced name extraction
    const name = extractNameFromResult(title, snippet, url)
    if (!name) return null

    // Platform detection and URL extraction
    const platformInfo = detectPlatformAndExtractInfo(url, title, snippet)
    
    // Enhanced skill extraction based on context
    const skills = extractSkillsFromContent(title + ' ' + snippet, enhancedQuery?.skills || [])
    
    // Enhanced title inference
    const candidateTitle = extractTitleFromContent(title, snippet) || 
                          inferTitleFromSkills(skills) || 
                          'Software Professional'

    // Location extraction
    const location = extractLocationFromContent(snippet) || enhancedQuery?.location_preferences?.[0] || ''

    // Enhanced scoring
    const skillMatchScore = calculateSkillMatchScore(skills, enhancedQuery?.skills || [])
    const platformScore = calculatePlatformScore(platformInfo.platform)
    const contentQualityScore = calculateContentQualityScore(title, snippet)

    const candidate = {
      name,
      title: candidateTitle,
      location,
      summary: snippet.substring(0, 200),
      skills,
      experience_years: estimateExperienceFromContent(title, snippet),
      last_active: new Date().toISOString(),
      overall_score: Math.round((skillMatchScore + platformScore + contentQualityScore) / 3),
      skill_match: skillMatchScore,
      experience: calculateExperienceScore(title, snippet),
      reputation: platformScore,
      freshness: 75, // Google results are generally fresh
      social_proof: calculateSocialProofScore(url, snippet),
      risk_flags: calculateRiskFlags(title, snippet, url),
      discovery_method: 'enhanced_google_boolean',
      search_query_context: searchQuery,
      boolean_search: true,
      ...platformInfo.urls
    }

    return candidate
  } catch (error) {
    console.error('Error extracting candidate from Google result:', error)
    return null
  }
}

function detectPlatformAndExtractInfo(url: string, title: string, snippet: string) {
  const platforms = {
    platform: 'unknown',
    urls: {}
  }

  if (url.includes('linkedin.com/in/')) {
    platforms.platform = 'linkedin'
    platforms.urls.linkedin_url = url
  } else if (url.includes('github.com/') && !url.includes('/blob/') && !url.includes('/tree/')) {
    platforms.platform = 'github'
    platforms.urls.github_url = url
    platforms.urls.github_username = extractGitHubUsername(url)
  } else if (url.includes('stackoverflow.com/users/')) {
    platforms.platform = 'stackoverflow'
    platforms.urls.stackoverflow_url = url
  } else if (url.includes('github.io') || url.includes('portfolio') || url.includes('personal')) {
    platforms.platform = 'portfolio'
    platforms.urls.portfolio_url = url
  }

  return platforms
}

function extractNameFromResult(title: string, snippet: string, url: string): string | null {
  // LinkedIn name extraction
  const linkedinMatch = title.match(/^([^-|]+)/)
  if (linkedinMatch && url.includes('linkedin.com')) {
    return linkedinMatch[1].trim()
  }

  // GitHub name extraction
  const githubMatch = url.match(/github\.com\/([^\/]+)/)
  if (githubMatch) {
    return githubMatch[1].replace(/-/g, ' ').replace(/\d+/g, '').trim()
  }

  // Generic name extraction from title
  const namePatterns = [
    /^([A-Z][a-z]+ [A-Z][a-z]+)/,
    /([A-Z][a-z]+ [A-Z]\. [A-Z][a-z]+)/,
    /^([^-|,]+?)(?:\s*[-|,])/
  ]

  for (const pattern of namePatterns) {
    const match = title.match(pattern)
    if (match && match[1].length > 3 && match[1].length < 50) {
      return match[1].trim()
    }
  }

  return null
}

function extractSkillsFromContent(content: string, enhancedSkills: string[]): string[] {
  const skills = new Set<string>()
  const contentLower = content.toLowerCase()

  // Enhanced skill detection
  const allTechSkills = [
    'python', 'javascript', 'typescript', 'java', 'go', 'rust', 'php', 'ruby', 'c++', 'c#',
    'react', 'vue', 'angular', 'svelte', 'node.js', 'django', 'flask', 'spring', 'laravel',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'jenkins', 'gitlab',
    'machine learning', 'ai', 'data science', 'devops', 'frontend', 'backend', 'full stack',
    'sql', 'mongodb', 'postgresql', 'redis', 'elasticsearch', 'graphql', 'rest api'
  ]

  // Check for enhanced skills first (higher priority)
  for (const skill of enhancedSkills) {
    if (contentLower.includes(skill.toLowerCase())) {
      skills.add(skill)
    }
  }

  // Check for all tech skills
  for (const skill of allTechSkills) {
    if (contentLower.includes(skill)) {
      skills.add(skill)
    }
  }

  return Array.from(skills).slice(0, 8)
}

function extractTitleFromContent(title: string, snippet: string): string | null {
  const titlePatterns = [
    /(?:Senior|Lead|Principal|Staff)?\s*(?:Software|Full Stack|Backend|Frontend)?\s*(?:Engineer|Developer|Programmer)/i,
    /(?:Data|Machine Learning|DevOps|Cloud)\s*(?:Engineer|Scientist|Architect)/i,
    /(?:Technical|Software|Engineering)\s*(?:Lead|Manager|Director)/i
  ]

  const combinedText = title + ' ' + snippet

  for (const pattern of titlePatterns) {
    const match = combinedText.match(pattern)
    if (match) return match[0]
  }

  return null
}

function extractLocationFromContent(content: string): string | null {
  const locationPatterns = [
    /(?:in|at|from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),?\s*(?:[A-Z]{2}|[A-Z][a-z]+)/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*(?:CA|NY|TX|FL|WA|IL)/i,
    /(San Francisco|New York|Los Angeles|Seattle|Boston|Austin|Chicago|Denver)/i
  ]

  for (const pattern of locationPatterns) {
    const match = content.match(pattern)
    if (match) return match[1] || match[0]
  }

  return null
}

function isValidDeveloperCandidate(candidate: any, enhancedQuery: any): boolean {
  // Must have a name
  if (!candidate.name || candidate.name.length < 2) return false

  // Must have at least one relevant skill
  if (candidate.skills.length === 0) return false

  // Check if the candidate matches the search intent
  const titleLower = candidate.title.toLowerCase()
  const roleTypes = enhancedQuery?.role_types || []
  const hasRelevantTitle = roleTypes.some(role => 
    titleLower.includes(role.toLowerCase()) || 
    titleLower.includes('developer') || 
    titleLower.includes('engineer')
  )

  if (!hasRelevantTitle && candidate.skills.length < 3) return false

  return true
}

function calculateSkillMatchScore(candidateSkills: string[], requiredSkills: string[]): number {
  if (requiredSkills.length === 0) return 60

  const matches = requiredSkills.filter(skill =>
    candidateSkills.some(candSkill =>
      candSkill.toLowerCase().includes(skill.toLowerCase()) ||
      skill.toLowerCase().includes(candSkill.toLowerCase())
    )
  )

  return Math.min((matches.length / requiredSkills.length) * 100, 100)
}

function calculatePlatformScore(platform: string): number {
  const platformScores = {
    'linkedin': 85,
    'github': 90,
    'stackoverflow': 80,
    'portfolio': 75,
    'unknown': 50
  }

  return platformScores[platform] || 50
}

function calculateContentQualityScore(title: string, snippet: string): number {
  let score = 50

  // Length and completeness
  if (title.length > 20) score += 10
  if (snippet.length > 50) score += 10

  // Professional keywords
  const professionalKeywords = ['engineer', 'developer', 'senior', 'lead', 'architect', 'technical']
  const keywordCount = professionalKeywords.filter(keyword =>
    (title + snippet).toLowerCase().includes(keyword)
  ).length
  score += keywordCount * 5

  return Math.min(score, 100)
}

function estimateExperienceFromContent(title: string, snippet: string): number {
  const content = (title + ' ' + snippet).toLowerCase()

  if (content.includes('senior') || content.includes('lead')) return 7
  if (content.includes('principal') || content.includes('staff')) return 10
  if (content.includes('junior') || content.includes('entry')) return 2
  if (content.includes('mid') || content.includes('intermediate')) return 4

  return 5 // Default
}

function calculateExperienceScore(title: string, snippet: string): number {
  const years = estimateExperienceFromContent(title, snippet)
  return Math.min(years * 8, 90)
}

function calculateSocialProofScore(url: string, snippet: string): number {
  let score = 40

  if (url.includes('linkedin.com')) score += 20
  if (url.includes('github.com')) score += 25
  if (snippet.includes('followers') || snippet.includes('connections')) score += 15

  return Math.min(score, 100)
}

function calculateRiskFlags(title: string, snippet: string, url: string): string[] {
  const flags = []

  if (title.length < 10) flags.push('Short title')
  if (snippet.length < 30) flags.push('Limited information')
  if (!url.includes('linkedin.com') && !url.includes('github.com')) flags.push('Unverified platform')

  return flags
}

function inferTitleFromSkills(skills: string[]): string | null {
  if (skills.includes('react') || skills.includes('vue') || skills.includes('angular')) {
    return 'Frontend Developer'
  }
  if (skills.includes('node.js') || skills.includes('django') || skills.includes('spring')) {
    return 'Backend Developer'
  }
  if (skills.includes('devops') || skills.includes('kubernetes') || skills.includes('aws')) {
    return 'DevOps Engineer'
  }
  if (skills.includes('machine learning') || skills.includes('data science')) {
    return 'Data Scientist'
  }

  return null
}

function extractGitHubUsername(url: string): string | null {
  const match = url.match(/github\.com\/([^\/]+)/)
  return match ? match[1] : null
}

async function enhanceGoogleCandidateScoring(candidates: any[], enhancedQuery: any): Promise<any[]> {
  return candidates.map(candidate => {
    // Boolean search bonus
    if (candidate.boolean_search) {
      candidate.overall_score += 10
      candidate.search_relevance_bonus = 10
    }

    // Platform diversity bonus
    const platformCount = [
      candidate.linkedin_url,
      candidate.github_url,
      candidate.stackoverflow_url,
      candidate.portfolio_url
    ].filter(Boolean).length

    candidate.platform_diversity_score = platformCount * 5
    candidate.overall_score += candidate.platform_diversity_score

    // Enhanced skill matching
    if (enhancedQuery?.must_have_skills) {
      const mustHaveMatches = enhancedQuery.must_have_skills.filter(skill =>
        candidate.skills.some(candSkill =>
          candSkill.toLowerCase().includes(skill.toLowerCase())
        )
      )
      candidate.must_have_skill_match = (mustHaveMatches.length / enhancedQuery.must_have_skills.length) * 100
      
      if (candidate.must_have_skill_match >= 80) {
        candidate.overall_score += 15
      }
    }

    // Cap the score
    candidate.overall_score = Math.min(candidate.overall_score, 100)

    return candidate
  })
}

function deduplicateGoogleCandidates(candidates: any[]): any[] {
  const seen = new Set()
  const unique = []

  for (const candidate of candidates) {
    // Create a unique key based on name and primary URL
    const primaryUrl = candidate.linkedin_url || candidate.github_url || candidate.portfolio_url || ''
    const key = `${candidate.name.toLowerCase()}_${primaryUrl}`

    if (!seen.has(key)) {
      seen.add(key)
      unique.push(candidate)
    }
  }

  return unique
}

function generateCandidateId(item: any): string {
  // Generate a consistent ID for the candidate
  const url = item.link || ''
  const title = item.title || ''
  
  return `google_${url.split('/').pop() || title.replace(/\s+/g, '_').toLowerCase()}`
}
