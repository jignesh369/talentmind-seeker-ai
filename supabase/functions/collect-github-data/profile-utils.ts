
export function extractEnhancedTitleFromBio(bio: string | null): string | null {
  if (!bio) return null
  
  const titlePatterns = [
    /^([^@\n]+)(?:@|$)/,
    /(.*?(?:engineer|developer|programmer|architect|lead|senior|principal).*?)/i,
    /(.*?(?:scientist|analyst|specialist).*?)/i
  ]
  
  for (const pattern of titlePatterns) {
    const match = bio.match(pattern)
    if (match) {
      return match[1].trim().substring(0, 60)
    }
  }
  
  return null
}

export function inferTitleFromLanguages(repositories: any[]): string {
  const languageStats = {}
  repositories.forEach(repo => {
    if (repo.language) {
      const lang = repo.language.toLowerCase()
      languageStats[lang] = (languageStats[lang] || 0) + 1
    }
  })
  
  const topLanguage = Object.entries(languageStats)
    .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0]
  
  if (topLanguage) {
    const titleMap = {
      'python': 'Python Developer',
      'javascript': 'JavaScript Developer', 
      'typescript': 'TypeScript Developer',
      'java': 'Java Developer',
      'go': 'Go Developer',
      'rust': 'Rust Developer'
    }
    return titleMap[topLanguage] || `${topLanguage.charAt(0).toUpperCase() + topLanguage.slice(1)} Developer`
  }
  
  return 'Software Developer'
}

export function createEnhancedSummaryFromGitHub(userDetails: any, repositories: any[], skills: string[]): string {
  const parts = []
  
  if (userDetails.bio) {
    parts.push(userDetails.bio)
  }
  
  parts.push(`GitHub developer with ${userDetails.public_repos || 0} public repositories`)
  
  if (skills.length > 0) {
    parts.push(`Expertise in: ${skills.slice(0, 6).join(', ')}`)
  }
  
  const totalStars = repositories.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0)
  if (totalStars > 10) {
    parts.push(`${totalStars} total stars across projects`)
  }
  
  if (userDetails.followers > 10) {
    parts.push(`${userDetails.followers} followers`)
  }
  
  return parts.join('. ').substring(0, 350)
}

export function isValidDeveloperProfile(userDetails: any, repositories: any[], skills: string[]): boolean {
  // Must have at least one of: bio mentioning development, skills, or recent repositories
  const hasBio = userDetails.bio && userDetails.bio.length > 10
  const hasSkills = skills.length > 0
  const hasRecentRepos = repositories.length > 0 && 
    new Date(repositories[0].updated_at) > new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
  
  return hasBio || hasSkills || hasRecentRepos
}
