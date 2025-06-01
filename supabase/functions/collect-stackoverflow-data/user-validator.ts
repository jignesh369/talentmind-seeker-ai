
import { StackOverflowUser } from './api-client.ts'

export function validateStackOverflowUser(user: StackOverflowUser): boolean {
  console.log(`🔍 Validating user ${user.user_id}: reputation=${user.reputation}, answers=${user.answer_count}, questions=${user.question_count}`)
  
  // Significantly relaxed validation criteria
  
  // Must have minimum reputation (lowered from 50 to 25)
  if (user.reputation < 25) {
    console.log(`❌ User ${user.user_id} failed: Low reputation (${user.reputation})`)
    return false
  }
  
  // Account must be at least 7 days old (reduced from 30 days)
  const accountAge = Date.now() / 1000 - user.creation_date
  const sevenDays = 7 * 24 * 60 * 60
  if (accountAge < sevenDays) {
    console.log(`❌ User ${user.user_id} failed: Too new (${Math.round(accountAge / (24 * 60 * 60))} days)`)
    return false
  }
  
  // Must have some activity (more lenient)
  if (user.answer_count === 0 && user.question_count === 0) {
    console.log(`❌ User ${user.user_id} failed: No activity`)
    return false
  }
  
  // Remove suspicious pattern check - it was too strict
  
  console.log(`✅ User ${user.user_id} passed validation`)
  return true
}

export function isQualityStackOverflowCandidate(user: StackOverflowUser): boolean {
  // More lenient quality checks
  
  // Lower reputation threshold for quality (reduced from 200 to 100)
  if (user.reputation < 100) {
    return false
  }
  
  // Must have contributed something (more lenient)
  if (user.answer_count < 1 && user.question_count < 1) {
    return false
  }
  
  // Recent activity (accessed in last 2 years instead of 1)
  const twoYearsAgo = Date.now() / 1000 - (2 * 365 * 24 * 60 * 60)
  if (user.last_access_date < twoYearsAgo) {
    return false
  }
  
  // Remove vote ratio check - it was too restrictive
  
  return true
}
