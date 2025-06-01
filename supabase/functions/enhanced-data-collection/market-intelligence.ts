
export async function calculateMarketIntelligenceWithCache(candidate: any, enhancedQuery: any, openaiApiKey: string): Promise<number> {
  try {
    // Simple market intelligence based on skills and trends
    const skillDemand = calculateSkillDemand(candidate.skills || [])
    const experienceMultiplier = calculateExperienceMultiplier(candidate.experience_years || 0)
    const locationFactor = calculateLocationFactor(candidate.location || '')
    
    return Math.min(100, Math.round(skillDemand * experienceMultiplier * locationFactor))
  } catch (error) {
    console.error('Error calculating market intelligence:', error)
    return 60
  }
}

function calculateSkillDemand(skills: string[]): number {
  const highDemandSkills = ['react', 'node.js', 'python', 'aws', 'kubernetes', 'typescript', 'go', 'rust']
  const mediumDemandSkills = ['java', 'php', 'angular', 'vue', 'docker', 'mongodb']
  
  let demandScore = 50
  
  skills.forEach(skill => {
    const skillLower = skill.toLowerCase()
    if (highDemandSkills.some(hds => skillLower.includes(hds))) {
      demandScore += 10
    } else if (mediumDemandSkills.some(mds => skillLower.includes(mds))) {
      demandScore += 5
    }
  })
  
  return Math.min(100, demandScore)
}

function calculateExperienceMultiplier(years: number): number {
  if (years < 1) return 0.7
  if (years < 3) return 0.9
  if (years < 7) return 1.1
  if (years < 12) return 1.0
  return 0.9
}

function calculateLocationFactor(location: string): number {
  const highDemandLocations = ['san francisco', 'new york', 'seattle', 'austin', 'remote']
  const locationLower = location.toLowerCase()
  
  if (highDemandLocations.some(hdl => locationLower.includes(hdl))) {
    return 1.1
  }
  return 1.0
}
