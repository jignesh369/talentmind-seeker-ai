
// Google Search enhancement for targeted profile discovery
export async function performEnhancedGoogleSearch(query: string, location: string | undefined, googleApiKey: string, searchEngineId: string, openaiApiKey: string): Promise<any[]> {
  if (!googleApiKey || !searchEngineId) {
    console.log('Google Search API not configured, skipping enhanced search')
    return []
  }

  try {
    // Generate targeted search queries using LLM
    const searchQueries = await generateTargetedSearchQueries(query, location, openaiApiKey)
    console.log('Generated targeted search queries:', searchQueries)
    
    const allResults = []
    
    for (const searchQuery of searchQueries) {
      try {
        const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${searchEngineId}&q=${encodeURIComponent(searchQuery)}&num=10`
        
        const response = await fetch(searchUrl)
        if (!response.ok) {
          console.log(`Google search failed for query "${searchQuery}": ${response.status}`)
          continue
        }
        
        const data = await response.json()
        
        if (data.items && data.items.length > 0) {
          for (const item of data.items) {
            const candidate = await extractCandidateFromSearchResult(item, query)
            if (candidate) {
              allResults.push(candidate)
            }
          }
        }
        
        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (error) {
        console.error(`Error in Google search for query "${searchQuery}":`, error)
        continue
      }
    }
    
    return allResults
  } catch (error) {
    console.error('Error in enhanced Google search:', error)
    return []
  }
}

async function generateTargetedSearchQueries(query: string, location: string | undefined, openaiApiKey: string): Promise<string[]> {
  if (!openaiApiKey) {
    // Fallback queries if OpenAI is not available
    const fallbackQueries = [
      `site:linkedin.com "${query}" developer engineer`,
      `site:github.com "${query}" profile`,
      `"${query}" developer portfolio resume`,
    ]
    
    if (location) {
      fallbackQueries.push(`site:linkedin.com "${query}" "${location}"`)
    }
    
    return fallbackQueries
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: `Generate 5 targeted Google search queries to find developer profiles for: "${query}"${location ? ` in ${location}` : ''}. 

Focus on:
1. LinkedIn profiles with site:linkedin.com
2. GitHub profiles with site:github.com  
3. Personal portfolios and resumes
4. Developer community profiles
5. Professional directories

Return only the search queries, one per line, no explanations.`
        }],
        max_tokens: 200,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const queries = data.choices[0]?.message?.content?.trim()?.split('\n')?.filter(q => q.trim()) || []
    
    return queries.length > 0 ? queries : [
      `site:linkedin.com "${query}" developer`,
      `site:github.com "${query}"`,
      `"${query}" developer portfolio`
    ]
  } catch (error) {
    console.error('Error generating search queries:', error)
    return [
      `site:linkedin.com "${query}" developer`,
      `site:github.com "${query}"`,
      `"${query}" developer portfolio`
    ]
  }
}

async function extractCandidateFromSearchResult(item: any, originalQuery: string): Promise<any | null> {
  try {
    const url = item.link
    const title = item.title
    const snippet = item.snippet || ''
    
    // Skip non-profile URLs
    if (url.includes('/search') || url.includes('/jobs') || url.includes('/company')) {
      return null
    }
    
    // Extract candidate information from search result
    const candidate = {
      name: extractNameFromTitle(title),
      title: extractTitleFromSnippet(snippet, title),
      profile_url: url,
      url: url,
      summary: snippet,
      location: extractLocationFromSnippet(snippet),
      platform_id: extractPlatformId(url),
      overall_score: 75, // Base score for Google search results
      skill_match: calculateSkillMatchFromSnippet(snippet, originalQuery),
      experience: 60,
      reputation: 50,
      freshness: 70,
      social_proof: 40,
      risk_flags: [],
      skills: extractSkillsFromSnippet(snippet),
      google_search_result: true
    }
    
    // Platform-specific enhancements
    if (url.includes('linkedin.com')) {
      candidate.linkedin_url = url
      candidate.overall_score += 10 // LinkedIn profiles are typically more valuable
    } else if (url.includes('github.com')) {
      candidate.github_username = extractGitHubUsername(url)
      candidate.overall_score += 5
    }
    
    return candidate
  } catch (error) {
    console.error('Error extracting candidate from search result:', error)
    return null
  }
}

function extractNameFromTitle(title: string): string {
  // Try to extract name from various title formats
  const patterns = [
    /^([^|]+)\s*\|\s*LinkedIn/i,
    /^([^-]+)\s*-\s*GitHub/i,
    /^([^(]+)\(/,
    /^([^,]+),/,
    /^([A-Za-z\s]+)/
  ]
  
  for (const pattern of patterns) {
    const match = title.match(pattern)
    if (match && match[1]) {
      const name = match[1].trim()
      if (name.length > 2 && name.length < 50) {
        return name
      }
    }
  }
  
  return title.split(/[-|,()]/)[0].trim() || 'Unknown'
}

function extractTitleFromSnippet(snippet: string, title: string): string {
  const titleIndicators = [
    /(?:Software|Senior|Lead|Principal|Staff)\s+(?:Developer|Engineer|Architect)/i,
    /(?:Full Stack|Frontend|Backend|DevOps)\s+(?:Developer|Engineer)/i,
    /(?:Data|Machine Learning|AI)\s+(?:Scientist|Engineer)/i,
    /(?:Product|Technical)\s+(?:Manager|Lead)/i
  ]
  
  for (const pattern of titleIndicators) {
    const match = snippet.match(pattern) || title.match(pattern)
    if (match) {
      return match[0]
    }
  }
  
  return 'Developer'
}

function extractLocationFromSnippet(snippet: string): string | undefined {
  const locationPattern = /(?:in|at|based in)\s+([A-Za-z\s,]+?)(?:\.|,|\s-|\s\|)/i
  const match = snippet.match(locationPattern)
  return match ? match[1].trim() : undefined
}

function extractPlatformId(url: string): string {
  if (url.includes('linkedin.com/in/')) {
    return url.split('/in/')[1]?.split('/')[0] || ''
  } else if (url.includes('github.com/')) {
    return url.split('github.com/')[1]?.split('/')[0] || ''
  }
  return url.split('/').pop() || ''
}

function extractGitHubUsername(url: string): string | undefined {
  const match = url.match(/github\.com\/([^\/]+)/)
  return match ? match[1] : undefined
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
  
  return foundSkills.slice(0, 8) // Limit to 8 skills
}
