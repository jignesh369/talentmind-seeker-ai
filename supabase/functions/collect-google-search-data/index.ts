
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, location } = await req.json()
    
    const apiKey = Deno.env.get('GOOGLE_API_KEY')
    const searchEngineId = Deno.env.get('GOOGLE_SEARCH_ENGINE_ID')
    
    console.log('🔍 Google Search API Configuration Check:')
    console.log('API Key configured:', apiKey ? 'Yes' : 'No')
    console.log('Search Engine ID configured:', searchEngineId ? 'Yes' : 'No')

    if (!apiKey || !searchEngineId) {
      return new Response(
        JSON.stringify({ 
          error: 'Google API configuration missing',
          candidates: [],
          total: 0,
          validated: 0
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const simplifiedQuery = query.split(' ').slice(0, 3).join(' ')
    console.log(`🔍 Simplified query: "${simplifiedQuery}"`)
    console.log(`Query: "${query}", Location: "${location || 'Not specified'}"`)

    const searchQueries = [
      `"${simplifiedQuery}" developer resume portfolio`,
      `"${simplifiedQuery}" software engineer -jobs`
    ]

    console.log('🔍 Starting Google search with simplified queries...')
    
    const allResults: GoogleSearchResult[] = []
    
    for (const searchQuery of searchQueries) {
      try {
        console.log(`🔍 Searching: ${searchQuery}...`)
        
        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(searchQuery)}&num=10`
        
        console.log('📡 Making request to Google API...')
        const response = await fetch(url)
        
        console.log(`📡 Google API Response: ${response.status} ${response.statusText}`)
        
        if (!response.ok) {
          console.error(`Google API error: ${response.status}`)
          continue
        }

        const data = await response.json()
        
        console.log('📊 API response structure:', {
          hasItems: !!data.items,
          itemCount: data.items?.length || 0,
          hasError: !!data.error,
          quotaRemaining: data.searchInformation?.totalResults || 'unknown'
        })

        if (data.items && Array.isArray(data.items)) {
          console.log(`📊 Found ${data.items.length} results for query`)
          allResults.push(...data.items)
        }
      } catch (error) {
        console.error(`Error in search query "${searchQuery}":`, error)
        continue
      }
    }

    console.log(`✅ Google search completed: ${allResults.length} unique results`)
    console.log(`📊 Google Search returned ${allResults.length} results`)

    // Process results safely
    const candidates = []
    
    for (const result of allResults) {
      try {
        if (!result || typeof result !== 'object') {
          continue
        }

        const candidate = await processGoogleResult(result, simplifiedQuery)
        if (candidate) {
          candidates.push(candidate)
        }
      } catch (error) {
        console.error(`❌ Error processing Google search result:`, error.message)
        continue
      }
    }

    console.log(`✅ Google Search collection completed: ${candidates.length} candidates in ${Date.now()}ms`)

    return new Response(
      JSON.stringify({
        candidates,
        total: allResults.length,
        validated: candidates.length,
        error: null,
        processing_time_ms: Date.now()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

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

async function processGoogleResult(result: GoogleSearchResult, query: string) {
  try {
    // Safe property access
    const title = result.title || ''
    const snippet = result.snippet || ''
    const link = result.link || ''
    const displayLink = result.displayLink || ''

    // Extract potential developer information
    const name = extractNameFromTitle(title)
    const skills = extractSkillsFromText(`${title} ${snippet}`)
    const location = extractLocationFromText(`${title} ${snippet}`)

    if (!name || name.length < 2) {
      return null
    }

    const candidate = {
      name,
      title: extractTitleFromText(title),
      summary: snippet.substring(0, 200),
      skills: skills || [],
      location: location || '',
      source_url: link,
      domain: displayLink,
      google_search: true,
      search_relevance: calculateRelevance(title, snippet, query),
      overall_score: 45,
      skill_match: 40,
      experience: 35,
      reputation: 30,
      freshness: 50,
      social_proof: 25
    }

    return candidate
  } catch (error) {
    console.error('Error processing individual result:', error)
    return null
  }
}

function extractNameFromTitle(title: string): string {
  // Remove common developer keywords and extract potential names
  const cleanTitle = title
    .replace(/\b(Developer|Engineer|Programmer|Full Stack|Frontend|Backend|Software|Web|React|JavaScript|Portfolio|Resume|CV)\b/gi, '')
    .replace(/[-|–—]/g, ' ')
    .trim()

  const words = cleanTitle.split(/\s+/).filter(word => word.length > 1)
  
  // Look for name patterns (2-3 consecutive capitalized words)
  for (let i = 0; i < words.length - 1; i++) {
    const potential = words.slice(i, i + 2).join(' ')
    if (potential.length > 3 && potential.length < 30) {
      return potential
    }
  }

  return words.slice(0, 2).join(' ') || 'Unknown Developer'
}

function extractTitleFromText(text: string): string {
  const titles = [
    'Full Stack Developer', 'Frontend Developer', 'Backend Developer',
    'Software Engineer', 'Web Developer', 'React Developer',
    'JavaScript Developer', 'Senior Developer', 'Lead Developer'
  ]

  for (const title of titles) {
    if (text.toLowerCase().includes(title.toLowerCase())) {
      return title
    }
  }

  return 'Software Developer'
}

function extractSkillsFromText(text: string): string[] {
  const skillKeywords = [
    'React', 'JavaScript', 'TypeScript', 'Node.js', 'Python', 'Java',
    'Angular', 'Vue', 'Docker', 'AWS', 'MongoDB', 'PostgreSQL',
    'Express', 'Next.js', 'GraphQL', 'Redux', 'Git', 'HTML', 'CSS'
  ]

  const foundSkills: string[] = []
  const lowerText = text.toLowerCase()

  for (const skill of skillKeywords) {
    if (lowerText.includes(skill.toLowerCase())) {
      foundSkills.push(skill)
    }
  }

  return foundSkills.slice(0, 8) // Limit to 8 skills
}

function extractLocationFromText(text: string): string {
  const locationKeywords = [
    'New York', 'San Francisco', 'London', 'Berlin', 'Toronto',
    'Remote', 'NYC', 'SF', 'LA', 'Boston', 'Seattle', 'Austin'
  ]

  const lowerText = text.toLowerCase()

  for (const location of locationKeywords) {
    if (lowerText.includes(location.toLowerCase())) {
      return location
    }
  }

  return ''
}

function calculateRelevance(title: string, snippet: string, query: string): number {
  const combinedText = `${title} ${snippet}`.toLowerCase()
  const queryTerms = query.toLowerCase().split(' ')
  
  let relevance = 0
  for (const term of queryTerms) {
    if (combinedText.includes(term)) {
      relevance += 20
    }
  }

  return Math.min(relevance, 100)
}
