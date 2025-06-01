
import { StackOverflowUser, StackOverflowAnswer, StackOverflowQuestion } from './api-client.ts'

export function calculateAnswerQualityScore(answers: StackOverflowAnswer[]): number {
  if (answers.length === 0) return 0
  
  let score = 0
  
  // Base score for having answers
  score += Math.min(answers.length * 5, 30)
  
  // Bonus for accepted answers
  const acceptedAnswers = answers.filter(a => a.is_accepted).length
  score += Math.min(acceptedAnswers * 15, 40)
  
  // Bonus for high-scoring answers
  const totalScore = answers.reduce((sum, a) => sum + Math.max(a.score, 0), 0)
  score += Math.min(totalScore * 0.5, 20)
  
  // Bonus for answer acceptance rate
  if (answers.length > 0) {
    const acceptanceRate = acceptedAnswers / answers.length
    score += acceptanceRate * 10
  }
  
  return Math.min(score, 100)
}

export function calculateExpertiseScore(
  user: StackOverflowUser,
  answers: StackOverflowAnswer[],
  relevantTags: string[]
): number {
  let score = 0
  
  // Reputation-based scoring
  if (user.reputation >= 25000) score += 40
  else if (user.reputation >= 10000) score += 35
  else if (user.reputation >= 5000) score += 30
  else if (user.reputation >= 1000) score += 25
  else if (user.reputation >= 500) score += 20
  else score += Math.min(user.reputation * 0.02, 15)
  
  // Tag relevance scoring
  const tagMatches = answers.filter(answer => 
    answer.tags?.some(tag => 
      relevantTags.some(relevantTag => 
        tag.toLowerCase().includes(relevantTag.toLowerCase()) ||
        relevantTag.toLowerCase().includes(tag.toLowerCase())
      )
    )
  ).length
  
  score += Math.min(tagMatches * 3, 25)
  
  // Answer quality bonus
  const highQualityAnswers = answers.filter(a => a.score > 5 || a.is_accepted).length
  score += Math.min(highQualityAnswers * 2, 20)
  
  // Activity consistency bonus
  if (answers.length > 10) score += 10
  if (user.answer_count > 50) score += 5
  
  return Math.min(score, 100)
}

export function calculateReputationScore(reputation: number): number {
  if (reputation >= 100000) return 100
  if (reputation >= 50000) return 95
  if (reputation >= 25000) return 90
  if (reputation >= 10000) return 85
  if (reputation >= 5000) return 75
  if (reputation >= 1000) return 65
  if (reputation >= 500) return 55
  if (reputation >= 200) return 45
  if (reputation >= 100) return 35
  if (reputation >= 50) return 25
  return Math.min(reputation * 0.3, 20)
}

export function calculateActivityScore(
  user: StackOverflowUser,
  answers: StackOverflowAnswer[],
  questions: StackOverflowQuestion[]
): number {
  let score = 0
  
  // Recent activity scoring
  const now = Date.now() / 1000
  const lastAccess = user.last_access_date || now
  const daysSinceLastAccess = (now - lastAccess) / (24 * 60 * 60)
  
  if (daysSinceLastAccess < 7) score += 30
  else if (daysSinceLastAccess < 30) score += 25
  else if (daysSinceLastAccess < 90) score += 20
  else if (daysSinceLastAccess < 180) score += 15
  else if (daysSinceLastAccess < 365) score += 10
  else score += 5
  
  // Content recency scoring
  const sixMonthsAgo = now - (6 * 30 * 24 * 60 * 60)
  const recentAnswers = answers.filter(a => a.creation_date > sixMonthsAgo).length
  const recentQuestions = questions.filter(q => q.creation_date > sixMonthsAgo).length
  
  score += Math.min(recentAnswers * 3, 25)
  score += Math.min(recentQuestions * 2, 15)
  
  // Overall activity level
  const totalActivity = user.answer_count + user.question_count
  if (totalActivity > 100) score += 15
  else if (totalActivity > 50) score += 10
  else if (totalActivity > 20) score += 5
  
  // Engagement quality
  const avgAnswerScore = answers.length > 0 ? 
    answers.reduce((sum, a) => sum + a.score, 0) / answers.length : 0
  score += Math.min(avgAnswerScore * 2, 15)
  
  return Math.min(score, 100)
}
