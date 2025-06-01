
export function calculateEnhancedActivityScore(userDetails: any, repositories: any[]) {
  let score = 0
  
  // Recent activity bonus (enhanced)
  const lastUpdate = new Date(userDetails.updated_at)
  const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
  if (daysSinceUpdate < 7) score += 40
  else if (daysSinceUpdate < 30) score += 30
  else if (daysSinceUpdate < 90) score += 20
  else if (daysSinceUpdate < 180) score += 10
  
  // Repository activity with quality weighting
  const recentRepos = repositories.filter(repo => 
    new Date(repo.updated_at) > new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
  )
  score += Math.min(recentRepos.length * 6, 35)
  
  // Quality indicators
  const totalStars = repositories.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0)
  const totalForks = repositories.reduce((sum, repo) => sum + (repo.forks_count || 0), 0)
  score += Math.min(totalStars / 2, 25)
  score += Math.min(totalForks, 15)
  
  return Math.min(score, 100)
}

export function calculateLanguageExpertiseScore(repositories: any[], detectedLanguages: string[]) {
  if (detectedLanguages.length === 0) return 50
  
  const languageStats = {}
  repositories.forEach(repo => {
    if (repo.language) {
      const lang = repo.language.toLowerCase()
      languageStats[lang] = (languageStats[lang] || 0) + 1
    }
  })
  
  let expertiseScore = 0
  detectedLanguages.forEach(lang => {
    const count = languageStats[lang.toLowerCase()] || 0
    expertiseScore += Math.min(count * 10, 30)
  })
  
  return Math.min(expertiseScore, 100)
}

export function calculateEnhancedSkillMatch(skills: string[], enhancedQuery: any) {
  if (!enhancedQuery || !enhancedQuery.skills) return 50
  
  const requiredSkills = [...(enhancedQuery.skills || []), ...(enhancedQuery.keywords || [])].map(s => s.toLowerCase())
  const candidateSkills = skills.map(s => s.toLowerCase())
  
  const directMatches = requiredSkills.filter(skill => 
    candidateSkills.some(cSkill => cSkill.includes(skill) || skill.includes(cSkill))
  )
  
  const semanticMatches = requiredSkills.filter(skill => {
    const semanticMap = {
      'ai': ['machine learning', 'ml', 'tensorflow', 'pytorch'],
      'backend': ['api', 'server', 'django', 'flask', 'spring'],
      'frontend': ['react', 'vue', 'angular', 'ui', 'ux'],
      'devops': ['docker', 'kubernetes', 'aws', 'cloud']
    }
    
    return Object.entries(semanticMap).some(([key, values]) => 
      skill.includes(key) && values.some(v => candidateSkills.includes(v))
    )
  })
  
  const totalMatches = directMatches.length + semanticMatches.length
  return Math.min(totalMatches * 15, 100)
}

export function calculateFreshness(lastUpdate: string) {
  const daysSinceUpdate = (Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60 * 24)
  
  if (daysSinceUpdate < 7) return 100
  if (daysSinceUpdate < 30) return 80
  if (daysSinceUpdate < 90) return 60
  if (daysSinceUpdate < 180) return 40
  return 20
}

export function calculateRiskFlags(userDetails: any, repositories: any[]) {
  const flags = []
  
  if (!userDetails.email) flags.push('No public email')
  if (!userDetails.bio) flags.push('No bio')
  if (userDetails.public_repos < 3) flags.push('Few repositories')
  if (userDetails.followers < 5) flags.push('Low social proof')
  
  const hasRecentActivity = repositories.some(repo => 
    new Date(repo.updated_at) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  )
  if (!hasRecentActivity) flags.push('No recent activity')
  
  return flags
}
