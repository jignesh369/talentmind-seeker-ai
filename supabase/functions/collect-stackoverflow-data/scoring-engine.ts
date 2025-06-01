
export interface StackOverflowScores {
  overall: number
  skillMatch: number
  experience: number
  reputation: number
  freshness: number
  socialProof: number
}

export function calculateStackOverflowScore(userDetails: any): StackOverflowScores {
  const reputationScore = calculateReputationScore(userDetails.reputation || 0)
  const activityScore = calculateActivityScore(userDetails)
  const expertiseScore = calculateExpertiseScore(userDetails)
  const freshnessScore = calculateFreshnessScore(userDetails.last_access_date)
  
  const overall = Math.round((reputationScore + activityScore + expertiseScore + freshnessScore) / 4)
  
  return {
    overall,
    skillMatch: expertiseScore,
    experience: Math.min(Math.round((userDetails.answer_count || 0) / 10), 100),
    reputation: reputationScore,
    freshness: freshnessScore,
    socialProof: Math.min(Math.round((userDetails.up_vote_count || 0) / 100), 100)
  }
}

function calculateReputationScore(reputation: number): number {
  if (reputation >= 100000) return 100
  if (reputation >= 50000) return 90
  if (reputation >= 25000) return 80
  if (reputation >= 10000) return 70
  if (reputation >= 5000) return 60
  if (reputation >= 1000) return 50
  if (reputation >= 500) return 40
  return Math.max(reputation / 12.5, 10) // Minimum 10 points
}

function calculateActivityScore(userDetails: any): number {
  const answers = userDetails.answer_count || 0
  const questions = userDetails.question_count || 0
  const upVotes = userDetails.up_vote_count || 0
  
  let score = 0
  score += Math.min(answers * 2, 40) // Max 40 points from answers
  score += Math.min(questions, 20) // Max 20 points from questions
  score += Math.min(upVotes / 10, 40) // Max 40 points from upvotes
  
  return Math.min(score, 100)
}

function calculateExpertiseScore(userDetails: any): number {
  const badges = userDetails.badge_counts || { bronze: 0, silver: 0, gold: 0 }
  const tags = userDetails.tags || []
  
  let score = 0
  score += badges.gold * 15 // Gold badges are valuable
  score += badges.silver * 8 
  score += badges.bronze * 2
  score += Math.min(tags.length * 5, 30) // Diversity of skills
  
  return Math.min(score, 100)
}

function calculateFreshnessScore(lastAccessDate: number): number {
  if (!lastAccessDate) return 0
  
  const daysSinceAccess = (Date.now() - (lastAccessDate * 1000)) / (1000 * 60 * 60 * 24)
  
  if (daysSinceAccess < 7) return 100
  if (daysSinceAccess < 30) return 80
  if (daysSinceAccess < 90) return 60
  if (daysSinceAccess < 180) return 40
  if (daysSinceAccess < 365) return 20
  return 0
}
