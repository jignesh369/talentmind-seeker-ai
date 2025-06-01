
import { GitHubUser } from './api-client.ts'

export function validateGitHubUser(user: GitHubUser): boolean {
  // Skip bots and organizations
  if (user.type !== 'User') {
    return false
  }
  
  // Skip site admins (GitHub employees)
  if (user.site_admin) {
    return false
  }
  
  // Must have at least 1 public repository
  if (user.public_repos === 0) {
    return false
  }
  
  // Account must be at least 30 days old
  const accountAge = Date.now() - new Date(user.created_at).getTime()
  const thirtyDays = 30 * 24 * 60 * 60 * 1000
  if (accountAge < thirtyDays) {
    return false
  }
  
  // Skip accounts with suspicious follower patterns
  if (user.followers > 1000 && user.public_repos < 5) {
    return false
  }
  
  // Skip accounts following too many people (potential spam)
  if (user.following > 2000 && user.followers < 100) {
    return false
  }
  
  return true
}

export function isQualityCandidate(user: GitHubUser): boolean {
  // Additional quality checks for premium candidates
  
  // Has meaningful engagement
  if (user.followers === 0 && user.public_repos < 3) {
    return false
  }
  
  // Has some form of contact information
  if (!user.email && !user.blog && !user.bio) {
    return false
  }
  
  // Recent activity (updated profile in last year)
  const lastUpdate = new Date(user.updated_at).getTime()
  const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000)
  if (lastUpdate < oneYearAgo) {
    return false
  }
  
  return true
}
