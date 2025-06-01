
export function buildEnhancedSearchQueries(enhancedQuery: any, location?: string): string[] {
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
    searchQueries.push(`${enhancedQuery.query || 'developer'} in:bio,name type:user repos:>=2${location ? ` location:"${location}"` : ''}`)
  }

  return searchQueries.slice(0, 4) // Limit to 4 queries
}
