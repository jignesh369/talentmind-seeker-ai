
export function calculateGoogleScore(candidate: any, searchTerms: string[]): number {
  let score = 50 // Base score
  
  // URL credibility scoring
  if (candidate.url?.includes('linkedin.com')) score += 20
  else if (candidate.url?.includes('github.com')) score += 15
  else if (candidate.url?.includes('stackoverflow.com')) score += 10
  
  // Content relevance scoring
  const content = `${candidate.title} ${candidate.summary}`.toLowerCase()
  const matchingTerms = searchTerms.filter(term => 
    content.includes(term.toLowerCase())
  )
  score += (matchingTerms.length / searchTerms.length) * 30
  
  // Profile completeness
  if (candidate.name && candidate.name !== 'Unknown') score += 10
  if (candidate.location) score += 5
  if (candidate.skills?.length > 0) score += 10
  if (candidate.summary?.length > 50) score += 5
  
  return Math.min(Math.max(score, 20), 100)
}

export function enhanceGoogleCandidate(candidate: any, query: string): any {
  return {
    ...candidate,
    platform: 'google_search',
    search_query: query,
    confidence_score: calculateConfidenceScore(candidate),
    data_completeness: calculateDataCompleteness(candidate)
  }
}

function calculateConfidenceScore(candidate: any): number {
  let confidence = 0.5 // Base confidence
  
  // Higher confidence for known platforms
  if (candidate.url?.includes('linkedin.com')) confidence += 0.3
  else if (candidate.url?.includes('github.com')) confidence += 0.25
  else if (candidate.url?.includes('stackoverflow.com')) confidence += 0.2
  
  // Profile data quality
  if (candidate.name && candidate.name !== 'Unknown') confidence += 0.1
  if (candidate.summary?.length > 100) confidence += 0.1
  if (candidate.skills?.length > 2) confidence += 0.1
  
  return Math.min(confidence, 1.0)
}

function calculateDataCompleteness(candidate: any): number {
  const fields = [
    candidate.name && candidate.name !== 'Unknown',
    candidate.title,
    candidate.location,
    candidate.summary && candidate.summary.length > 30,
    candidate.skills && candidate.skills.length > 0,
    candidate.url
  ]
  
  const completedFields = fields.filter(Boolean).length
  return Math.round((completedFields / fields.length) * 100)
}
