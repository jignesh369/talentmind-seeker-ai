
import { GoogleSearchResult } from './api-client.ts'

export function calculateRelevanceScore(result: GoogleSearchResult, query: string): number {
  let score = 0
  
  const queryTerms = query.toLowerCase().split(/\s+/)
  const titleLower = result.title.toLowerCase()
  const snippetLower = result.snippet.toLowerCase()
  const combinedText = `${titleLower} ${snippetLower}`
  
  // Title relevance (40% weight)
  let titleMatches = 0
  for (const term of queryTerms) {
    if (titleLower.includes(term)) {
      titleMatches++
    }
  }
  score += (titleMatches / queryTerms.length) * 40
  
  // Snippet relevance (30% weight)
  let snippetMatches = 0
  for (const term of queryTerms) {
    if (snippetLower.includes(term)) {
      snippetMatches++
    }
  }
  score += (snippetMatches / queryTerms.length) * 30
  
  // Professional keywords (20% weight)
  const professionalKeywords = [
    'developer', 'engineer', 'programmer', 'software', 'technical', 'senior', 'lead',
    'architect', 'full stack', 'frontend', 'backend', 'devops', 'data scientist'
  ]
  
  let professionalMatches = 0
  for (const keyword of professionalKeywords) {
    if (combinedText.includes(keyword)) {
      professionalMatches++
    }
  }
  score += (professionalMatches / professionalKeywords.length) * 20
  
  // Platform bonus (10% weight)
  if (result.link.includes('linkedin.com')) {
    score += 10
  } else if (result.link.includes('github.com')) {
    score += 8
  } else if (result.link.includes('stackoverflow.com')) {
    score += 6
  }
  
  return Math.min(Math.max(score, 0), 100)
}

export function calculateQualityScore(result: GoogleSearchResult): number {
  let score = 50 // Base score
  
  // URL quality indicators
  if (result.link.includes('linkedin.com/in/')) {
    score += 25 // LinkedIn profiles are high quality
  } else if (result.link.includes('github.com/') && !result.link.includes('/search')) {
    score += 20 // GitHub profiles are good quality
  } else if (result.link.includes('stackoverflow.com/users/')) {
    score += 15 // Stack Overflow profiles are decent quality
  }
  
  // Title quality
  if (result.title.length > 10 && result.title.length < 100) {
    score += 10 // Good title length
  }
  
  // Snippet quality
  if (result.snippet && result.snippet.length > 50) {
    score += 10 // Descriptive snippet
  }
  
  // Avoid job listings and company pages
  const lowQualityIndicators = ['jobs', 'hiring', 'careers', 'apply now', 'job opening']
  const textToCheck = `${result.title} ${result.snippet}`.toLowerCase()
  
  for (const indicator of lowQualityIndicators) {
    if (textToCheck.includes(indicator)) {
      score -= 15
    }
  }
  
  // Avoid search results and directory pages
  if (result.link.includes('/search') || result.link.includes('/directory')) {
    score -= 20
  }
  
  return Math.min(Math.max(score, 0), 100)
}
