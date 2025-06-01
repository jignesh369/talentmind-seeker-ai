
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
  if (!GOOGLE_API_KEY || !GOOGLE_SEARCH_ENGINE_ID) {
    console.log('Google Search API not configured, returning empty results')
    return []
  }

  try {
    // Create enhanced search queries for better candidate discovery
    const searchQueries = [
      `site:linkedin.com/in "${query}" ${location ? `"${location}"` : ''} -"LinkedIn"`,
      `site:github.com "${query}" location:anywhere followers:>10`,
      `"${query}" developer portfolio resume ${location ? `"${location}"` : ''}`,
      `"${query}" software engineer ${location ? `"${location}"` : ''} -jobs -hiring`,
      `"${query}" programmer ${location ? `"${location}"` : ''} profile about`
    ]

    console.log('🔍 Executing enhanced Boolean search queries...')
    
    const allResults: GoogleSearchResult[] = []
    const seenUrls = new Set<string>()
    
    for (const searchQuery of searchQueries) {
      try {
        console.log(`🔍 Boolean search: ${searchQuery.substring(0, 80)}...`)
        
        const encodedQuery = encodeURIComponent(searchQuery)
        const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_SEARCH_ENGINE_ID}&q=${encodedQuery}&num=10`
        
        const response = await fetch(searchUrl)
        
        if (!response.ok) {
          console.log(`Google search failed for query "${searchQuery}": ${response.status}`)
          continue
        }
        
        const data = await response.json()
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
        console.error(`Error in Google search for query "${searchQuery}":`, error)
        continue
      }
    }
    
    return allResults.slice(0, 25) // Limit to top 25 results
    
  } catch (error) {
    console.error('Error in Google search:', error)
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
