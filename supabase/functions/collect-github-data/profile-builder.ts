
import { GitHubUser, GitHubRepo } from './api-client.ts'

export interface EnhancedProfile {
  title: string
  email: string | null
  summary: string
  skills: string[]
  estimatedExperience: number
  riskFlags: string[]
}

export function buildEnhancedProfile(user: GitHubUser, repos: GitHubRepo[]): EnhancedProfile {
  const skills = extractSkillsFromRepos(repos)
  const experience = estimateExperience(user, repos)
  const riskFlags = identifyRiskFlags(user, repos)
  
  return {
    title: generateTitle(user, skills),
    email: user.email || null,
    summary: generateSummary(user, repos, skills),
    skills,
    estimatedExperience: experience,
    riskFlags
  }
}

function extractSkillsFromRepos(repos: GitHubRepo[]): string[] {
  const skillMap = new Map<string, number>()
  
  repos.forEach(repo => {
    if (repo.language) {
      skillMap.set(repo.language, (skillMap.get(repo.language) || 0) + 1)
    }
    
    // Extract skills from topics
    repo.topics?.forEach(topic => {
      const normalizedTopic = topic.toLowerCase()
      if (isValidSkill(normalizedTopic)) {
        skillMap.set(normalizedTopic, (skillMap.get(normalizedTopic) || 0) + 1)
      }
    })
  })
  
  // Sort by frequency and return top skills
  return Array.from(skillMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([skill]) => skill)
}

function isValidSkill(topic: string): boolean {
  const validSkills = [
    'javascript', 'typescript', 'python', 'java', 'react', 'vue', 'angular',
    'nodejs', 'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'sql', 'mongodb',
    'postgresql', 'redis', 'graphql', 'rest', 'api', 'microservices', 'devops',
    'ci-cd', 'testing', 'jest', 'cypress', 'selenium', 'webpack', 'vite'
  ]
  return validSkills.includes(topic)
}

function generateTitle(user: GitHubUser, skills: string[]): string {
  const topSkill = skills[0]
  if (!topSkill) return 'Software Developer'
  
  const titleMap: Record<string, string> = {
    'javascript': 'JavaScript Developer',
    'typescript': 'TypeScript Developer',
    'python': 'Python Developer',
    'java': 'Java Developer',
    'react': 'React Developer',
    'vue': 'Vue.js Developer',
    'angular': 'Angular Developer',
    'nodejs': 'Node.js Developer'
  }
  
  return titleMap[topSkill.toLowerCase()] || `${topSkill} Developer`
}

function generateSummary(user: GitHubUser, repos: GitHubRepo[], skills: string[]): string {
  const totalStars = repos.reduce((sum, repo) => sum + repo.stargazers_count, 0)
  const activeRepos = repos.filter(repo => !repo.fork && !repo.archived).length
  
  let summary = `Developer with ${user.public_repos} public repositories`
  
  if (totalStars > 10) {
    summary += ` and ${totalStars} total stars`
  }
  
  if (skills.length > 0) {
    summary += `. Experienced in ${skills.slice(0, 3).join(', ')}`
  }
  
  if (user.bio) {
    summary += `. ${user.bio}`
  }
  
  return summary
}

function estimateExperience(user: GitHubUser, repos: GitHubRepo[]): number {
  const accountAge = (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24 * 365)
  const activeRepos = repos.filter(repo => !repo.fork && !repo.archived).length
  const totalStars = repos.reduce((sum, repo) => sum + repo.stargazers_count, 0)
  
  // Base experience from account age (max 5 years)
  let experience = Math.min(accountAge, 5)
  
  // Bonus for active repositories
  experience += Math.min(activeRepos * 0.1, 2)
  
  // Bonus for stars (indicates quality)
  experience += Math.min(totalStars * 0.01, 1)
  
  return Math.max(1, Math.min(experience, 10)) // 1-10 years
}

function identifyRiskFlags(user: GitHubUser, repos: GitHubRepo[]): string[] {
  const flags: string[] = []
  
  if (user.public_repos === 0) {
    flags.push('No public repositories')
  }
  
  const recentActivity = repos.some(repo => {
    const lastUpdate = new Date(repo.updated_at)
    const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000)
    return lastUpdate > sixMonthsAgo
  })
  
  if (!recentActivity) {
    flags.push('No recent activity')
  }
  
  if (!user.email && !user.blog) {
    flags.push('Limited contact information')
  }
  
  return flags
}
