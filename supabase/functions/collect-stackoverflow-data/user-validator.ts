
import { StackOverflowUser } from './api-client.ts'

export function validateStackOverflowUser(user: StackOverflowUser): boolean {
  // Must have minimum reputation
  if (user.reputation < 50) {
    return false
  }
  
  // Account must be at least 30 days old
  const accountAge = Date.now() / 1000 - user.creation_date
  const thirtyDays = 30 * 24 * 60 * 60
  if (accountAge < thirtyDays) {
    return false
  }
  
  // Must have some activity
  if (user.answer_count === 0 && user.question_count === 0) {
    return false
  }
  
  // Skip accounts with suspicious patterns
  if (user.reputation > 10000 && user.answer_count === 0) {
    return false // Reputation without answers is suspicious
  }
  
  return true
}

export function isQualityStackOverflowCandidate(user: StackOverflowUser): boolean {
  // Additional quality checks for premium candidates
  
  // Higher reputation threshold for quality
  if (user.reputation < 200) {
    return false
  }
  
  // Must have contributed answers or questions
  if (user.answer_count < 1 && user.question_count < 2) {
    return false
  }
  
  // Recent activity (accessed in last year)
  const oneYearAgo = Date.now() / 1000 - (365 * 24 * 60 * 60)
  if (user.last_access_date < oneYearAgo) {
    return false
  }
  
  // Good vote ratio
  const totalVotes = user.up_vote_count + user.down_vote_count
  if (totalVotes > 0 && user.down_vote_count / totalVotes > 0.3) {
    return false // Too many downvotes relative to upvotes
  }
  
  return true
}
