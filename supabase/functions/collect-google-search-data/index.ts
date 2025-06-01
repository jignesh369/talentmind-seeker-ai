
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generateUUID() {
  return crypto.randomUUID();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, location, enhancedQuery } = await req.json()

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const googleApiKey = Deno.env.get('GOOGLE_API_KEY')
    const searchEngineId = Deno.env.get('GOOGLE_SEARCH_ENGINE_ID')
    const supabase = createClient(supabaseUrl, supabaseKey)

    if (!googleApiKey || !searchEngineId) {
      console.log('Google API not configured, skipping Google Search')
      return new Response(
        JSON.stringify({ 
          candidates: [], 
          total: 0, 
          source: 'google',
          error: 'Google API not configured' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Starting enhanced Google Search with Boolean queries...')

    // Enhanced Boolean search queries
    const searchQueries = [
      `(\"portfolio\" OR \"resume\" OR \"CV\") \"${enhancedQuery?.role_types?.[0] || query}\" \"${enhancedQuery?.skills?.[0] || 'software'}\" filetype:pdf OR site:github.io`,
      `site:linkedin.com/in \"${enhancedQuery?.role_types?.[0] || query}\" \"google\" \"${enhancedQuery?.skills?.[0] || 'software'}\"`,
      `site:linkedin.com/in \"${enhancedQuery?.role_types?.[0] || query}\" \"microsoft\" \"${enhancedQuery?.skills?.[0] || 'software'}\"`,
      `site:linkedin.com/in \"${enhancedQuery?.role_types?.[0] || query}\" \"amazon\" \"${enhancedQuery?.skills?.[0] || 'software'}\"`,
      `site:stackoverflow.com/users \"${enhancedQuery?.role_types?.[0] || query}\" \"${enhancedQuery?.skills?.[0] || 'software'}\"`,
      `site:github.com \"${enhancedQuery?.role_types?.[0] || query}\" \"${enhancedQuery?.skills?.[0] || 'software'}\"`
    ]

    console.log('Executing 6 enhanced search queries...')

    const candidates = []
    const seenUrls = new Set()

    for (const searchQuery of searchQueries) {
      try {
        console.log(`🔍 Boolean search: ${searchQuery.slice(0, 60)}...`)
        
        const response = await fetch(
          `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${searchEngineId}&q=${encodeURIComponent(searchQuery)}&num=10`
        )

        if (!response.ok) {
          console.error(`Google API error: ${response.status}`)
          continue
        }

        const data = await response.json()
        const results = data.items || []
        
        console.log(`📊 Found ${results.length} results for query`)

        for (const result of results) {
          if (seenUrls.has(result.link)) continue
          seenUrls.add(result.link)

          const candidateId = generateUUID()
          
          // Enhanced candidate extraction from search results
          const candidate = {
            id: candidateId,
            name: extractNameFromTitle(result.title),
            title: extractTitleFromSnippet(result.snippet, enhancedQuery?.role_types?.[0]),
            location: location || extractLocationFromSnippet(result.snippet),
            avatar_url: null,
            email: extractEmailFromSnippet(result.snippet),
            summary: result.snippet,
            skills: enhancedQuery?.skills?.slice(0, 5) || [query],
            experience_years: extractExperienceFromSnippet(result.snippet),
            last_active: new Date().toISOString(),
            overall_score: calculateGoogleScore(result, enhancedQuery),
            skill_match: calculateSkillMatch(result.snippet, enhancedQuery?.skills || []),
            experience: 50,
            reputation: 40,
            freshness: 80,
            social_proof: 30,
            risk_flags: [],
            source_url: result.link,
            source_platform: detectPlatform(result.link)
          }

          candidates.push(candidate)

          // Save to database with proper UUID
          try {
            const { error: candidateError } = await supabase
              .from('candidates')
              .upsert({
                id: candidateId,
                name: candidate.name,
                title: candidate.title,
                location: candidate.location,
                avatar_url: candidate.avatar_url,
                email: candidate.email,
                summary: candidate.summary,
                skills: candidate.skills,
                experience_years: candidate.experience_years,
                last_active: candidate.last_active,
                overall_score: candidate.overall_score,
                skill_match: candidate.skill_match,
                experience: candidate.experience,
                reputation: candidate.reputation,
                freshness: candidate.freshness,
                social_proof: candidate.social_proof,
                risk_flags: candidate.risk_flags
              }, { 
                onConflict: 'email',
                ignoreDuplicates: true 
              })

            if (candidateError) {
              console.error(`Error saving Google candidate:`, candidateError)
            }

            // Save source data
            const { error: sourceError } = await supabase
              .from('candidate_sources')
              .upsert({
                candidate_id: candidateId,
                platform: 'google',
                platform_id: result.link,
                url: result.link,
                data: {
                  title: result.title,
                  snippet: result.snippet,
                  search_query: searchQuery,
                  platform: candidate.source_platform
                }
              }, { 
                onConflict: 'platform,platform_id',
                ignoreDuplicates: true 
              })

            if (sourceError) {
              console.error(`Error saving Google source data:`, sourceError)
            }

          } catch (error) {
            console.error(`Error saving Google candidate data:`, error)
          }

          if (candidates.length >= 20) break
        }

        if (candidates.length >= 20) break

      } catch (error) {
        console.error(`Google search error for query "${searchQuery}":`, error)
        continue
      }
    }

    const sortedCandidates = candidates
      .sort((a, b) => b.overall_score - a.overall_score)
      .slice(0, 20)

    console.log(`✅ Google Search completed: ${sortedCandidates.length} enhanced candidates`)

    return new Response(
      JSON.stringify({ 
        candidates: sortedCandidates,
        total: sortedCandidates.length,
        source: 'google',
        enhancement_stats: {
          boolean_queries_executed: searchQueries.length,
          platforms_discovered: [...new Set(sortedCandidates.map(c => c.source_platform))].length,
          avg_score: Math.round(sortedCandidates.reduce((sum, c) => sum + c.overall_score, 0) / sortedCandidates.length || 0)
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in enhanced Google Search:', error)
    return new Response(
      JSON.stringify({ 
        candidates: [], 
        total: 0, 
        source: 'google',
        error: 'Google Search failed' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

// Helper functions for enhanced candidate extraction
function extractNameFromTitle(title: string): string {
  // Extract name from LinkedIn profiles, GitHub profiles, etc.
  const patterns = [
    /^([^|•-]+)(?:[|•-])/,  // Name before separator
    /(\w+\s+\w+)/,          // First and last name pattern
  ]
  
  for (const pattern of patterns) {
    const match = title.match(pattern)
    if (match) return match[1].trim()
  }
  
  return title.split(' ').slice(0, 2).join(' ') || 'Professional'
}

function extractTitleFromSnippet(snippet: string, roleType?: string): string {
  const commonTitles = [
    'Senior Software Engineer', 'Software Engineer', 'Full Stack Developer',
    'Frontend Developer', 'Backend Developer', 'DevOps Engineer',
    'Data Scientist', 'Product Manager', 'Tech Lead'
  ]
  
  for (const title of commonTitles) {
    if (snippet.toLowerCase().includes(title.toLowerCase())) {
      return title
    }
  }
  
  return roleType || 'Software Professional'
}

function extractLocationFromSnippet(snippet: string): string {
  const locationPatterns = [
    /(?:based in|located in|from)\s+([^.]+)/i,
    /(San Francisco|New York|London|Toronto|Berlin|Bangalore|Hyderabad|Mumbai|Delhi)/i
  ]
  
  for (const pattern of locationPatterns) {
    const match = snippet.match(pattern)
    if (match) return match[1].trim()
  }
  
  return ''
}

function extractEmailFromSnippet(snippet: string): string | null {
  const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
  const match = snippet.match(emailPattern)
  return match ? match[1] : null
}

function extractExperienceFromSnippet(snippet: string): number {
  const expPatterns = [
    /(\d+)\+?\s*years?\s*(?:of\s*)?experience/i,
    /(\d+)\+?\s*yrs/i,
    /experience.*?(\d+)\+?\s*years?/i
  ]
  
  for (const pattern of expPatterns) {
    const match = snippet.match(pattern)
    if (match) return parseInt(match[1])
  }
  
  return 3 // Default experience
}

function calculateGoogleScore(result: any, enhancedQuery: any): number {
  let score = 50 // Base score
  
  // Platform-specific scoring
  if (result.link.includes('linkedin.com')) score += 20
  if (result.link.includes('github.com')) score += 15
  if (result.link.includes('stackoverflow.com')) score += 10
  
  // Keyword relevance
  const skills = enhancedQuery?.skills || []
  for (const skill of skills) {
    if (result.snippet.toLowerCase().includes(skill.toLowerCase())) {
      score += 5
    }
  }
  
  // Title relevance
  const roles = enhancedQuery?.role_types || []
  for (const role of roles) {
    if (result.title.toLowerCase().includes(role.toLowerCase())) {
      score += 10
    }
  }
  
  return Math.min(score, 100)
}

function calculateSkillMatch(snippet: string, skills: string[]): number {
  if (!skills || skills.length === 0) return 50
  
  let matchCount = 0
  for (const skill of skills) {
    if (snippet.toLowerCase().includes(skill.toLowerCase())) {
      matchCount++
    }
  }
  
  return Math.round((matchCount / skills.length) * 100)
}

function detectPlatform(url: string): string {
  if (url.includes('linkedin.com')) return 'linkedin'
  if (url.includes('github.com')) return 'github'
  if (url.includes('stackoverflow.com')) return 'stackoverflow'
  if (url.includes('medium.com')) return 'medium'
  if (url.includes('dev.to')) return 'devto'
  return 'web'
}
