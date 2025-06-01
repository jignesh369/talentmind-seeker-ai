
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface MarketData {
  competition_level: string;
  salary_range: string;
  demand_score: number;
  success_probability: number;
  trending_skills: string[];
  location_insights: any;
}

export async function getMarketIntelligence(
  query: string,
  location: string,
  skills: string[]
): Promise<MarketData> {
  console.log('🧠 Gathering market intelligence...')
  
  // Analyze competition level based on skill demand
  const competitionLevel = analyzeCompetition(skills)
  
  // Calculate demand score based on trending technologies
  const demandScore = calculateDemandScore(skills)
  
  // Estimate salary range based on skills and location
  const salaryRange = estimateSalaryRange(skills, location)
  
  // Calculate success probability
  const successProbability = calculateSuccessProbability(skills, location, demandScore)
  
  // Get trending skills in the domain
  const trendingSkills = getTrendingSkills(skills)
  
  // Location-specific insights
  const locationInsights = getLocationInsights(location)
  
  return {
    competition_level: competitionLevel,
    salary_range: salaryRange,
    demand_score: demandScore,
    success_probability: successProbability,
    trending_skills: trendingSkills,
    location_insights: locationInsights
  }
}

function analyzeCompetition(skills: string[]): string {
  const highDemandSkills = ['python', 'javascript', 'react', 'aws', 'kubernetes', 'machine learning', 'ai']
  const matchCount = skills.filter(skill => 
    highDemandSkills.some(demand => skill.toLowerCase().includes(demand.toLowerCase()))
  ).length
  
  if (matchCount >= 4) return 'High'
  if (matchCount >= 2) return 'Medium'
  return 'Low'
}

function calculateDemandScore(skills: string[]): number {
  const skillWeights = {
    'python': 20,
    'javascript': 18,
    'typescript': 16,
    'react': 15,
    'aws': 14,
    'docker': 12,
    'kubernetes': 13,
    'machine learning': 19,
    'ai': 17,
    'golang': 11,
    'rust': 10,
    'nextjs': 14
  }
  
  let totalScore = 0
  skills.forEach(skill => {
    const weight = skillWeights[skill.toLowerCase()] || 5
    totalScore += weight
  })
  
  return Math.min(totalScore, 100)
}

function estimateSalaryRange(skills: string[], location: string): string {
  const baseRanges = {
    'san francisco': { min: 120000, max: 200000 },
    'new york': { min: 110000, max: 180000 },
    'seattle': { min: 105000, max: 175000 },
    'london': { min: 60000, max: 120000 },
    'berlin': { min: 55000, max: 110000 },
    'bangalore': { min: 25000, max: 60000 },
    'toronto': { min: 80000, max: 140000 }
  }
  
  const locationKey = location.toLowerCase()
  const range = baseRanges[locationKey] || { min: 70000, max: 130000 }
  
  // Adjust based on skills
  const skillMultiplier = calculateSkillMultiplier(skills)
  const adjustedMin = Math.round(range.min * skillMultiplier)
  const adjustedMax = Math.round(range.max * skillMultiplier)
  
  return `$${adjustedMin.toLocaleString()} - $${adjustedMax.toLocaleString()}`
}

function calculateSkillMultiplier(skills: string[]): number {
  const premiumSkills = ['machine learning', 'ai', 'blockchain', 'rust', 'golang', 'kubernetes']
  const premiumCount = skills.filter(skill => 
    premiumSkills.some(premium => skill.toLowerCase().includes(premium.toLowerCase()))
  ).length
  
  return 1 + (premiumCount * 0.1)
}

function calculateSuccessProbability(skills: string[], location: string, demandScore: number): number {
  let probability = 50 // Base probability
  
  // Adjust based on demand score
  probability += (demandScore - 50) * 0.5
  
  // Adjust based on location
  const techHubs = ['san francisco', 'new york', 'seattle', 'london', 'berlin']
  if (techHubs.some(hub => location.toLowerCase().includes(hub))) {
    probability += 15
  }
  
  // Adjust based on skill count
  probability += Math.min(skills.length * 2, 20)
  
  return Math.min(Math.max(Math.round(probability), 10), 95)
}

function getTrendingSkills(currentSkills: string[]): string[] {
  const trending2024 = [
    'AI/ML', 'TypeScript', 'Rust', 'WebAssembly', 'Edge Computing',
    'Serverless', 'GraphQL', 'Micro-frontends', 'JAMstack', 'DevSecOps'
  ]
  
  // Return trending skills not already possessed
  return trending2024.filter(skill => 
    !currentSkills.some(current => 
      current.toLowerCase().includes(skill.toLowerCase())
    )
  ).slice(0, 5)
}

function getLocationInsights(location: string): any {
  const insights = {
    'san francisco': {
      tech_companies: 'High concentration of tech giants and startups',
      cost_of_living: 'Very High',
      remote_friendly: 'High',
      visa_sponsorship: 'Common'
    },
    'new york': {
      tech_companies: 'Strong fintech and enterprise software presence',
      cost_of_living: 'Very High',
      remote_friendly: 'Medium',
      visa_sponsorship: 'Common'
    },
    'berlin': {
      tech_companies: 'Growing startup ecosystem',
      cost_of_living: 'Medium',
      remote_friendly: 'Very High',
      visa_sponsorship: 'EU Blue Card available'
    }
  }
  
  return insights[location.toLowerCase()] || {
    tech_companies: 'Mixed technology presence',
    cost_of_living: 'Variable',
    remote_friendly: 'Medium',
    visa_sponsorship: 'Case by case'
  }
}
