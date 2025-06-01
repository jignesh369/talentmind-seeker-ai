
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

    // Build developer-specific search queries
    const skills = enhancedQuery?.skills || []
    const keywords = enhancedQuery?.keywords || []
    const searchTerms = [...skills, ...keywords].filter(Boolean)

    const searchQueries = [
      // GitHub profiles with skills
      `${searchTerms.join(' OR ')} site:github.com ${location ? location : ''} developer`,
      // LinkedIn developer profiles
      `"software engineer" OR "developer" OR "programmer" ${searchTerms.slice(0, 3).join(' ')} site:linkedin.com/in ${location ? location : ''}`,
      // Stack Overflow user profiles
      `${searchTerms.slice(0, 2).join(' ')} site:stackoverflow.com/users ${location ? location : ''}`,
      // Dev.to profiles
      `${searchTerms.slice(0, 2).join(' ')} site:dev.to ${location ? location : ''} developer`,
      // Personal portfolios and websites
      `"${searchTerms.slice(0, 2).join('" "')}" developer portfolio ${location ? location : ''} -site:github.com -site:linkedin.com`
    ]

    const candidates = []
    const seenProfiles = new Set()

    for (const searchQuery of searchQueries) {
      try {
        const response = await fetch(
          `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleSearchEngineId}&q=${encodeURIComponent(searchQuery)}&num=10`
        )

        if (!response.ok) {
          console.error(`Google API error for query "${searchQuery}":`, response.status)
          continue
        }

        const data = await response.json()
        const results = data.items || []

        for (const result of results) {
          // Skip if we've already processed this URL
          if (seenProfiles.has(result.link)) continue
          seenProfiles.add(result.link)

          // Extract platform information
          let platform = 'web'
          let platformId = result.link
          let name = result.title
          let summary = result.snippet || ''

          // Enhanced platform detection
          if (result.link.includes('github.com/')) {
            platform = 'github'
            const githubMatch = result.link.match(/github\.com\/([^\/\?]+)/)
            if (githubMatch && !githubMatch[1].includes('orgs')) {
              platformId = githubMatch[1]
              name = githubMatch[1]
            } else {
              continue // Skip organization pages
            }
          } else if (result.link.includes('linkedin.com/in/')) {
            platform = 'linkedin'
            const linkedinMatch = result.link.match(/linkedin\.com\/in\/([^\/\?]+)/)
            if (linkedinMatch) {
              platformId = linkedinMatch[1]
            }
          } else if (result.link.includes('stackoverflow.com/users/')) {
            platform = 'stackoverflow'
            const soMatch = result.link.match(/stackoverflow\.com\/users\/(\d+)/)
            if (soMatch) {
              platformId = soMatch[1]
            }
          } else if (result.link.includes('dev.to/')) {
            platform = 'dev.to'
            const devMatch = result.link.match(/dev\.to\/([^\/\?]+)/)
            if (devMatch) {
              platformId = devMatch[1]
              name = devMatch[1]
            }
          }

          // Enhanced skill extraction
          const text = (result.title + ' ' + summary).toLowerCase()
          const skillKeywords = [
            'python', 'javascript', 'typescript', 'java', 'c++', 'c#', 'go', 'rust', 'php', 'ruby',
            'react', 'vue', 'angular', 'node.js', 'django', 'flask', 'fastapi', 'spring', 'laravel',
            'machine learning', 'ml', 'ai', 'data science', 'backend', 'frontend', 'full stack',
            'devops', 'cloud', 'aws', 'azure', 'docker', 'kubernetes', 'tensorflow', 'pytorch'
          ]

          const extractedSkills = skillKeywords.filter(skill => 
            text.includes(skill) || text.includes(skill.replace(/[.\s]/g, ''))
          )

          // Enhanced validation for developer profiles
          const isDeveloper = (
            extractedSkills.length > 0 ||
            text.includes('developer') ||
            text.includes('programmer') ||
            text.includes('engineer') ||
            text.includes('coding') ||
            text.includes('software') ||
            platform === 'github' ||
            platform === 'stackoverflow' ||
            platform === 'dev.to'
          )

          if (!isDeveloper) {
            continue // Skip non-developer profiles
          }

          // Calculate quality score
          let qualityScore = 30 // Base score
          qualityScore += extractedSkills.length * 8 // Skill bonus
          qualityScore += platform === 'github' ? 20 : 0 // GitHub bonus
          qualityScore += platform === 'linkedin' ? 15 : 0 // LinkedIn bonus
          qualityScore += platform === 'stackoverflow' ? 18 : 0 // SO bonus
          qualityScore += summary.length > 100 ? 10 : 0 // Content bonus

          const candidate = {
            name: name || 'Unknown Developer',
            title: extractTitleFromResult(result.title, platform),
            summary: cleanSummary(summary),
            location: extractLocationFromText(text) || location || '',
            skills: extractedSkills,
            experience_years: estimateExperienceFromText(text),
            last_active: new Date().toISOString(),
            overall_score: Math.min(qualityScore, 100),
            skill_match: Math.min(extractedSkills.length * 15, 90),
            experience: estimateExperienceScore(text),
            reputation: platform === 'github' || platform === 'stackoverflow' ? 60 : 40,
            freshness: 75,
            social_proof: platform === 'linkedin' ? 50 : 30,
            risk_flags: []
          }

          // Add platform-specific fields
          if (platform === 'github') {
            candidate.github_username = platformId
          } else if (platform === 'stackoverflow') {
            candidate.stackoverflow_id = platformId
          }

          candidates.push(candidate)

          // Save source data
          try {
            await supabase
              .from('candidate_sources')
              .upsert({
                candidate_id: platformId,
                platform: platform,
                platform_id: platformId,
                url: result.link,
                data: result
              }, { onConflict: 'platform,platform_id' })
          } catch (error) {
            console.error('Error saving source data:', error)
          }
        }

      } catch (error) {
        console.error(`Error processing search query ${searchQuery}:`, error)
        continue
      }
    }

    // Sort by quality score and limit results
    const sortedCandidates = candidates
      .sort((a, b) => b.overall_score - a.overall_score)
      .slice(0, 20)

    console.log(`Collected ${sortedCandidates.length} quality candidates from Google Search`)

    return new Response(
      JSON.stringify({ 
        candidates: sortedCandidates,
        total: sortedCandidates.length,
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

function extractTitleFromResult(title, platform) {
  if (platform === 'github') {
    return 'Software Developer'
  }
  if (platform === 'linkedin') {
    // Extract title from LinkedIn result
    const match = title.match(/([^-|]+)\s*[-|]/)
    return match ? match[1].trim() : 'Software Professional'
  }
  if (platform === 'stackoverflow') {
    return 'Stack Overflow Contributor'
  }
  if (platform === 'dev.to') {
    return 'Developer & Writer'
  }
  return 'Software Developer'
}

function cleanSummary(summary) {
  return summary
    .replace(/\.\.\./g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 300)
}

function extractLocationFromText(text) {
  const locationPatterns = [
    /located in ([^,.]+)/i,
    /based in ([^,.]+)/i,
    /from ([^,.]+)/i
  ]
  
  for (const pattern of locationPatterns) {
    const match = text.match(pattern)
    if (match) {
      return match[1].trim()
    }
  }
  
  return null
}

function estimateExperienceFromText(text) {
  const yearMatches = text.match(/(\d+)\+?\s*years?/i)
  if (yearMatches) {
    return parseInt(yearMatches[1])
  }
  
  if (text.includes('senior') || text.includes('lead')) return 7
  if (text.includes('mid') || text.includes('intermediate')) return 4
  if (text.includes('junior') || text.includes('entry')) return 2
  
  return 3 // Default estimate
}

function estimateExperienceScore(text) {
  const years = estimateExperienceFromText(text)
  return Math.min(years * 12, 90)
}
