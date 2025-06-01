
const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY')
const GOOGLE_SEARCH_ENGINE_ID = Deno.env.get('GOOGLE_SEARCH_ENGINE_ID')

export interface GoogleSearchResult {
  title: string
  link: string
  snippet: string
  displayLink?: string
  formattedUrl?: string
}

export async function searchGoogle(query: string, location?: string): Promise<GoogleSearchResult[]> {
  console.log('🔍 Google Search API Configuration Check:')
  console.log(`API Key configured: ${GOOGLE_API_KEY ? 'Yes' : 'No'}`)
  console.log(`Search Engine ID configured: ${GOOGLE_SEARCH_ENGINE_ID ? 'Yes' : 'No'}`)
  
  if (!GOOGLE_API_KEY || !GOOGLE_SEARCH_ENGINE_ID) {
    console.log('❌ Google Search API not configured properly')
    return []
  }

  try {
    // Simplified search queries for better results
    const searchQueries = [
      `"${query}" developer resume portfolio ${location ? `"${location}"` : ''}`,
      `"${query}" software engineer ${location ? `"${location}"` : ''} -jobs`,
      `site:linkedin.com/in "${query}" ${location ? `"${location}"` : ''}`,
      `site:github.com "${query}" developer`
    ]

    console.log('🔍 Starting Google search with simplified queries...')
    
    const allResults: GoogleSearchResult[] = []
    const seenUrls = new Set<string>()
    
    for (const searchQuery of searchQueries.slice(0, 2)) { // Limit to 2 queries for speed
      try {
        console.log(`🔍 Searching: ${searchQuery.substring(0, 60)}...`)
        
        const encodedQuery = encodeURIComponent(searchQuery)
        const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_SEARCH_ENGINE_ID}&q=${encodedQuery}&num=8`
        
        console.log(`📡 Making request to Google API...`)
        const response = await fetch(searchUrl)
        
        console.log(`📡 Google API Response: ${response.status} ${response.statusText}`)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.log(`❌ Google search failed: ${response.status} - ${errorText}`)
          continue
        }
        
        const data = await response.json()
        console.log(`📊 API response structure:`, {
          hasItems: !!data.items,
          itemCount: data.items?.length || 0,
          hasError: !!data.error,
          quotaRemaining: data.searchInformation?.totalResults
        })
        
        if (data.error) {
          console.log('❌ Google API Error:', data.error)
          continue
        }
        
        const results = data.items || []
        console.log(`📊 Found ${results.length} results for query`)
        
        for (const item of results) {
          if (!seenUrls.has(item.link)) {
            seenUrls.add(item.link)
            allResults.push({
              title: item.title,
              link: item.link,
              snippet: item.snippet || '',
              displayLink: item.displayLink,
              formattedUrl: item.formattedUrl
            })
          }
        }
        
        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (error) {
        console.error(`❌ Error in Google search for query "${searchQuery}":`, error.message)
        continue
      }
    }
    
    console.log(`✅ Google search completed: ${allResults.length} unique results`)
    return allResults.slice(0, 15) // Limit to top 15 results
    
  } catch (error) {
    console.error('❌ Critical error in Google search:', error.message)
    return []
  }
}

export function extractTitleFromSnippet(snippet: string): string | null {
  const titlePatterns = [
    /(?:Software|Senior|Lead|Principal|Staff)\s+(?:Developer|Engineer|Architect)/i,
    /(?:Full Stack|Frontend|Backend|DevOps)\s+(?:Developer|Engineer)/i,
    /(?:Data|Machine Learning|AI)\s+(?:Scientist|Engineer)/i,
    /(?:Product|Technical)\s+(?:Manager|Lead)/i
  ]
  
  for (const pattern of titlePatterns) {
    const match = snippet.match(pattern)
    if (match) {
      return match[0]
    }
  }
  
  return null
}

export function extractLocationFromSnippet(snippet: string): string | null {
  const locationPattern = /(?:in|at|based in|located in)\s+([A-Za-z\s,]+?)(?:\.|,|\s-|\s\||$)/i
  const match = snippet.match(locationPattern)
  return match ? match[1].trim() : null
}

export function extractEmailFromSnippet(snippet: string): string | null {
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
  const match = snippet.match(emailPattern)
  return match ? match[0] : null
}

export function extractSkillsFromSnippet(snippet: string, enhancedSkills: string[] = []): string[] {
  const commonSkills = [
    'JavaScript', 'Python', 'Java', 'TypeScript', 'React', 'Node.js', 'Angular', 'Vue.js',
    'Django', 'Flask', 'Spring', 'Express', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis',
    'AWS', 'Docker', 'Kubernetes', 'Git', 'CI/CD', 'Machine Learning', 'AI', 'Data Science'
  ]
  
  const skillsToCheck = enhancedSkills.length > 0 ? enhancedSkills : commonSkills
  const foundSkills = []
  const snippetLower = snippet.toLowerCase()
  
  for (const skill of skillsToCheck) {
    if (snippetLower.includes(skill.toLowerCase())) {
      foundSkills.push(skill)
    }
  }
  
  return foundSkills.slice(0, 8) // Limit to 8 skills
}
