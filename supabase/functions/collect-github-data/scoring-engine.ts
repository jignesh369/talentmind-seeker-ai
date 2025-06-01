
import { GitHubUser, GitHubRepo } from './api-client.ts'

export function calculateRepoScore(repos: GitHubRepo[]): number {
  if (!repos || repos.length === 0) return 0
  
  const activeRepos = repos.filter(repo => !repo.fork && !repo.archived)
  const totalStars = repos.reduce((sum, repo) => sum + repo.stargazers_count, 0)
  const totalForks = repos.reduce((sum, repo) => sum + repo.forks_count, 0)
  
  // Score based on repository quality and engagement
  let score = 0
  
  // Active repositories (max 30 points)
  score += Math.min(activeRepos.length * 3, 30)
  
  // Stars (max 40 points)
  score += Math.min(totalStars * 0.5, 40)
  
  // Forks (max 20 points)
  score += Math.min(totalForks * 0.3, 20)
  
  // Recent activity bonus (max 10 points)
  const recentRepos = repos.filter(repo => {
    const lastUpdate = new Date(repo.updated_at)
    const threeMonthsAgo = new Date(Date.now() - 3 * 30 * 24 * 60 * 60 * 1000)
    return lastUpdate > threeMonthsAgo
  })
  score += Math.min(recentRepos.length * 2, 10)
  
  return Math.min(score, 100)
}

export function calculateContributionScore(user: GitHubUser): number {
  let score = 0
  
  // Followers (max 30 points)
  score += Math.min(user.followers * 0.5, 30)
  
  // Following ratio (healthy if following < followers * 2)
  const followingRatio = user.following / Math.max(user.followers, 1)
  if (followingRatio < 2) {
    score += 10
  }
  
  // Public repositories (max 25 points)
  score += Math.min(user.public_repos * 0.8, 25)
  
  // Account age (max 20 points)
  const accountAge = (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24 * 365)
  score += Math.min(accountAge * 5, 20)
  
  // Profile completeness (max 15 points)
  let completeness = 0
  if (user.name) completeness += 3
  if (user.bio) completeness += 3
  if (user.email) completeness += 3
  if (user.blog) completeness += 3
  if (user.location) completeness += 3
  score += completeness
  
  return Math.min(score, 100)
}

export function calculateSkillScore(user: GitHubUser, repos: GitHubRepo[], targetSkills: string[]): number {
  if (!targetSkills || targetSkills.length === 0) return 50 // Default score if no skills specified
  
  const userSkills = new Set<string>()
  
  // Extract skills from repositories
  repos.forEach(repo => {
    if (repo.language) {
      userSkills.add(repo.language.toLowerCase())
    }
    repo.topics?.forEach(topic => {
      userSkills.add(topic.toLowerCase())
    })
  })
  
  // Extract skills from bio
  if (user.bio) {
    const bioLower = user.bio.toLowerCase()
    targetSkills.forEach(skill => {
      if (bioLower.includes(skill.toLowerCase())) {
        userSkills.add(skill.toLowerCase())
      }
    })
  }
  
  // Calculate match percentage
  const targetSkillsLower = targetSkills.map(skill => skill.toLowerCase())
  const matchingSkills = targetSkillsLower.filter(skill => userSkills.has(skill))
  
  const matchPercentage = (matchingSkills.length / targetSkillsLower.length) * 100
  
  // Bonus for having additional relevant skills
  const bonusSkills = ['git', 'docker', 'kubernetes', 'aws', 'ci/cd', 'testing']
  const bonusMatches = bonusSkills.filter(skill => userSkills.has(skill)).length
  const bonus = Math.min(bonusMatches * 5, 20)
  
  return Math.min(matchPercentage + bonus, 100)
}

export function calculateActivityScore(user: GitHubUser, repos: GitHubRepo[]): number {
  let score = 0
  
  // Recent activity (max 40 points)
  const now = Date.now()
  const recentActivity = repos.filter(repo => {
    const lastUpdate = new Date(repo.updated_at).getTime()
    const daysSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60 * 24)
    return daysSinceUpdate < 30
  }).length
  
  score += Math.min(recentActivity * 8, 40)
  
  // Consistent activity (max 30 points)
  const monthlyActivity = new Map<string, number>()
  repos.forEach(repo => {
    const month = new Date(repo.updated_at).toISOString().slice(0, 7)
    monthlyActivity.set(month, (monthlyActivity.get(month) || 0) + 1)
  })
  
  const activeMonths = monthlyActivity.size
  score += Math.min(activeMonths * 2, 30)
  
  // Profile freshness (max 20 points)
  const profileAge = (now - new Date(user.updated_at).getTime()) / (1000 * 60 * 60 * 24)
  if (profileAge < 30) score += 20
  else if (profileAge < 90) score += 15
  else if (profileAge < 180) score += 10
  else if (profileAge < 365) score += 5
  
  // Engagement (max 10 points)
  const avgStarsPerRepo = repos.length > 0 ? 
    repos.reduce((sum, repo) => sum + repo.stargazers_count, 0) / repos.length : 0
  score += Math.min(avgStarsPerRepo, 10)
  
  return Math.min(score, 100)
}
