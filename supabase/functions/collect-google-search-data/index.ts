import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { saveCandidateWithSource, sanitizeIntegerValue, sanitizeStringValue, generateValidUUID } from '../shared/database-operations.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GoogleSearchResult {
  title: string;
  link: string;
  snippet: string;
  displayLink?: string;
}

// Enhanced Google Search with better location and API handling
async function searchGoogleWithLocation(query: string, location?: string): Promise<GoogleSearchResult[]> {
  const apiKey = Deno.env.get('GOOGLE_API_KEY')
  const searchEngineId = Deno.env.get('GOOGLE_SEARCH_ENGINE_ID')
  
  console.log('🔍 Google Search API Configuration Check:')
  console.log('API Key configured:', apiKey ? 'Yes (length: ' + apiKey.length + ')' : 'No')
  console.log('Search Engine ID configured:', searchEngineId ? 'Yes' : 'No')

  if (!apiKey || !searchEngineId) {
    console.log('❌ Google Search API not configured properly')
    throw new Error('Google Search API credentials not configured')
  }

  try {
    // Enhanced search queries with better location targeting
    const locationQuery = location ? `"${location}"` : '';
    const searchQueries = [
      `"${query}" developer resume portfolio ${locationQuery}`,
      `"${query}" software engineer ${locationQuery} -jobs -hiring`,
      `site:linkedin.com/in "${query}" ${locationQuery}`,
      `site:github.com "${query}" developer ${locationQuery}`
    ];

    console.log('🔍 Starting Google search with enhanced queries...')
    console.log('Base query:', query)
    console.log('Location filter:', location || 'None')
    
    const allResults: GoogleSearchResult[] = []
    const seenUrls = new Set<string>()
    
    for (const [index, searchQuery] of searchQueries.entries()) {
      try {
        console.log(`🔍 Query ${index + 1}: ${searchQuery.substring(0, 80)}...`)
        
        const encodedQuery = encodeURIComponent(searchQuery)
        const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodedQuery}&num=8`
        
        const response = await fetch(searchUrl)
        
        console.log(`📡 Google API Response ${index + 1}: ${response.status} ${response.statusText}`)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.log(`❌ Google search query ${index + 1} failed: ${response.status} - ${errorText}`)
          
          // Check for specific error types
          if (response.status === 429) {
            console.log('⚠️ Rate limit exceeded, skipping remaining queries')
            break
          }
          continue
        }
        
        const data = await response.json()
        
        if (data.error) {
          console.log('❌ Google API Error:', data.error)
          if (data.error.code === 403) {
            console.log('⚠️ Quota exceeded or API key invalid')
          }
          continue
        }
        
        const results = data.items || []
        console.log(`📊 Found ${results.length} results for query ${index + 1}`)
        
        for (const item of results) {
          if (!seenUrls.has(item.link)) {
            seenUrls.add(item.link)
            allResults.push({
              title: item.title,
              link: item.link,
              snippet: item.snippet || '',
              displayLink: item.displayLink
            })
          }
        }
        
        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (error) {
        console.error(`❌ Error in Google search query ${index + 1}:`, error.message)
        continue
      }
    }
    
    console.log(`✅ Google search completed: ${allResults.length} unique results`)
    return allResults.slice(0, 20) // Limit results
    
  } catch (error) {
    console.error('❌ Critical error in Google search:', error.message)
    throw error
  }
}

async function processGoogleResult(result: GoogleSearchResult, query: string, location?: string) {
  try {
    const candidate = {
      id: generateValidUUID(),
      name: sanitizeStringValue(extractNameFromTitle(result.title)),
      title: sanitizeStringValue(extractTitleFromSnippet(result.snippet, result.title)),
      summary: sanitizeStringValue(result.snippet.substring(0, 200)),
      skills: extractSkillsFromSnippet(result.snippet),
      location: sanitizeStringValue(extractLocationFromSnippet(result.snippet) || location || ''),
      profile_url: sanitizeStringValue(result.link),
      platform_id: sanitizeStringValue(extractPlatformId(result.link)),
      overall_score: sanitizeIntegerValue(75),
      skill_match: sanitizeIntegerValue(calculateSkillMatchFromSnippet(result.snippet, query)),
      experience: sanitizeIntegerValue(60),
      reputation: sanitizeIntegerValue(50),
      freshness: sanitizeIntegerValue(70),
      social_proof: sanitizeIntegerValue(40),
      risk_flags: [],
      platform: 'google_search',
      last_active: new Date().toISOString()
    }

    return candidate
  } catch (error) {
    console.error('Error processing Google result:', error)
    return null
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, location, time_budget = 25 } = await req.json()
    
    console.log(`🎯 Enhanced Google Search starting for query: "${query}"`)
    console.log(`📍 Location filter: ${location || 'Not specified'}`)
    console.log(`⏱️ Time Budget: ${time_budget}s`)

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Valid query is required',
          candidates: [],
          total: 0
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const startTime = Date.now()
    
    try {
      // Enhanced Google search with location
      const searchResults = await searchGoogleWithLocation(query.trim(), location?.trim())
      
      const candidates = []
      const savedCandidates = []
      let successCount = 0
      let errorCount = 0

      for (const result of searchResults) {
        if (Date.now() - startTime > (time_budget - 2) * 1000) {
          console.log(`⏰ Time budget exceeded, stopping at ${candidates.length} candidates`)
          break
        }

        const candidate = await processGoogleResult(result, query, location)
        if (candidate) {
          candidates.push(candidate)

          const sourceData = {
            candidate_id: candidate.id,
            platform: 'google_search',
            platform_id: candidate.platform_id,
            url: candidate.profile_url,
            data: { 
              search_query: query,
              location_filter: location,
              search_result: result,
              processed_at: new Date().toISOString()
            }
          }

          const saveResult = await saveCandidateWithSource(supabase, candidate, sourceData)
          if (saveResult.success) {
            savedCandidates.push(candidate)
            successCount++
            console.log(`✅ Successfully saved Google candidate: ${candidate.name}`)
          } else {
            errorCount++
            console.error(`❌ Failed to save candidate ${candidate.name}: ${saveResult.error}`)
          }
        }
      }

      const processingTime = Date.now() - startTime
      console.log(`✅ Enhanced Google Search completed in ${processingTime}ms`)
      console.log(`📊 Results: ${successCount} saved, ${errorCount} errors`)

      return new Response(
        JSON.stringify({
          candidates: savedCandidates,
          total: savedCandidates.length,
          validated: savedCandidates.length,
          source: 'google_search',
          processing_time_ms: processingTime,
          success_count: successCount,
          error_count: errorCount,
          location_filter_applied: !!location,
          api_configured: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (apiError) {
      console.error('❌ Google Search API Error:', apiError)
      
      let errorMessage = 'Google Search API failed'
      if (apiError.message.includes('credentials')) {
        errorMessage = 'Google Search API credentials not configured'
      } else if (apiError.message.includes('quota')) {
        errorMessage = 'Google Search API quota exceeded'
      } else if (apiError.message.includes('rate limit')) {
        errorMessage = 'Google Search API rate limit exceeded'
      }

      return new Response(
        JSON.stringify({
          error: errorMessage,
          candidates: [],
          total: 0,
          validated: 0,
          api_configured: false,
          location_filter_applied: !!location
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('❌ Google Search collection error:', error)
    
    return new Response(
      JSON.stringify({
        error: 'Google Search collection failed',
        message: error.message,
        candidates: [],
        total: 0,
        validated: 0
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function extractNameFromTitle(title: string): string {
  const cleanTitle = title
    .replace(/\b(Developer|Engineer|Programmer|Full Stack|Frontend|Backend|Software|Web|React|JavaScript|Portfolio|Resume|CV)\b/gi, '')
    .replace(/[-|–—]/g, ' ')
    .trim()

  const words = cleanTitle.split(/\s+/).filter(word => word.length > 1)
  
  for (let i = 0; i < words.length - 1; i++) {
    const potential = words.slice(i, i + 2).join(' ')
    if (potential.length > 3 && potential.length < 30) {
      return potential
    }
  }

  return words.slice(0, 2).join(' ') || 'Unknown Developer'
}

function extractTitleFromSnippet(snippet: string, title: string): string {
  const titlePatterns = [
    /(?:Software|Senior|Lead|Principal|Staff)\s+(?:Developer|Engineer|Architect)/i,
    /(?:Full Stack|Frontend|Backend|DevOps)\s+(?:Developer|Engineer)/i,
    /(?:Data|Machine Learning|AI)\s+(?:Scientist|Engineer)/i,
    /(?:Product|Technical)\s+(?:Manager|Lead)/i
  ]
  
  for (const pattern of titlePatterns) {
    const match = snippet.match(pattern) || title.match(pattern)
    if (match) {
      return match[0]
    }
  }
  
  return 'Software Developer'
}

function extractLocationFromSnippet(snippet: string): string | null {
  const locationPattern = /(?:in|at|based in|located in)\s+([A-Za-z\s,]+?)(?:\.|,|\s-|\s\||$)/i
  const match = snippet.match(locationPattern)
  return match ? match[1].trim() : null
}

function extractPlatformId(url: string): string {
  if (url.includes('linkedin.com/in/')) {
    return url.split('/in/')[1]?.split('/')[0] || ''
  } else if (url.includes('github.com/')) {
    return url.split('github.com/')[1]?.split('/')[0] || ''
  }
  return url.split('/').pop() || ''
}

function calculateSkillMatchFromSnippet(snippet: string, query: string): number {
  const queryTerms = query.toLowerCase().split(/\s+/)
  const snippetLower = snippet.toLowerCase()
  
  let matchCount = 0
  for (const term of queryTerms) {
    if (snippetLower.includes(term)) {
      matchCount++
    }
  }
  
  return Math.min((matchCount / queryTerms.length) * 100, 100)
}

function extractSkillsFromSnippet(snippet: string): string[] {
  const commonSkills = [
    'JavaScript', 'Python', 'Java', 'TypeScript', 'React', 'Node.js', 'Angular', 'Vue.js',
    'Django', 'Flask', 'Spring', 'Express', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis',
    'AWS', 'Docker', 'Kubernetes', 'Git', 'CI/CD', 'Machine Learning', 'AI', 'Data Science'
  ]
  
  const foundSkills = []
  const snippetLower = snippet.toLowerCase()
  
  for (const skill of commonSkills) {
    if (snippetLower.includes(skill.toLowerCase())) {
      foundSkills.push(skill)
    }
  }
  
  return foundSkills.slice(0, 8)
}
