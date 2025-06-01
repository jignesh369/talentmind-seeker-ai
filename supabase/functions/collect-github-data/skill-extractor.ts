
export function extractEnhancedSkillsFromGitHub(userDetails: any, repositories: any[], enhancedQuery: any) {
  const skills = new Set()
  
  // Extract from bio with enhanced patterns
  const bio = (userDetails.bio || '').toLowerCase()
  const advancedSkills = [
    'python', 'javascript', 'typescript', 'java', 'c++', 'c#', 'go', 'rust', 'php', 'ruby', 'swift', 'kotlin',
    'react', 'vue', 'angular', 'node.js', 'django', 'flask', 'fastapi', 'spring', 'laravel', 'rails',
    'machine learning', 'ml', 'ai', 'data science', 'backend', 'frontend', 'full stack', 'fullstack',
    'devops', 'cloud', 'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform',
    'tensorflow', 'pytorch', 'scikit-learn', 'pandas', 'numpy'
  ]
  
  advancedSkills.forEach(skill => {
    const variations = [skill, skill.replace(/[.\s]/g, ''), skill.replace(/[.\s]/g, '-')]
    if (variations.some(variant => bio.includes(variant))) {
      skills.add(skill)
    }
  })
  
  // Enhanced repository language analysis
  const languageStats = {}
  repositories.forEach(repo => {
    if (repo.language) {
      const lang = repo.language.toLowerCase()
      languageStats[lang] = (languageStats[lang] || 0) + 1
      skills.add(lang)
    }
    
    // Extract skills from repo names and descriptions
    const repoText = `${repo.name} ${repo.description || ''}`.toLowerCase()
    advancedSkills.forEach(skill => {
      if (repoText.includes(skill.replace(/[.\s]/g, ''))) {
        skills.add(skill)
      }
    })
  })
  
  return Array.from(skills).slice(0, 12)
}

export function calculateLanguageStats(repositories: any[]) {
  const stats = {}
  repositories.forEach(repo => {
    if (repo.language) {
      stats[repo.language] = (stats[repo.language] || 0) + 1
    }
  })
  return stats
}
