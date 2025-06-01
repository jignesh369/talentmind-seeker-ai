
export interface StackOverflowProfile {
  name: string
  title: string
  location: string
  summary: string
  skills: string[]
  estimatedExperience: number
  riskFlags: string[]
}

export function buildStackOverflowProfile(userDetails: any): StackOverflowProfile {
  const tags = userDetails.tags || []
  const skills = extractSkillsFromTags(tags)
  
  return {
    name: userDetails.display_name || 'Stack Overflow User',
    title: generateTitleFromTags(tags),
    location: userDetails.location || '',
    summary: generateSummary(userDetails),
    skills,
    estimatedExperience: estimateExperience(userDetails),
    riskFlags: identifyRiskFlags(userDetails)
  }
}

function extractSkillsFromTags(tags: any[]): string[] {
  const techTags = tags
    .filter(tag => tag.count > 5) // Only consider tags with meaningful usage
    .map(tag => tag.name)
    .slice(0, 10)
  
  return techTags
}

function generateTitleFromTags(tags: any[]): string {
  const topTag = tags[0]?.name
  if (!topTag) return 'Developer'
  
  const titleMap: Record<string, string> = {
    'javascript': 'JavaScript Developer',
    'python': 'Python Developer',
    'java': 'Java Developer',
    'react': 'React Developer',
    'angular': 'Angular Developer',
    'vue.js': 'Vue.js Developer',
    'node.js': 'Node.js Developer'
  }
  
  return titleMap[topTag] || `${topTag} Developer`
}

function generateSummary(userDetails: any): string {
  const reputation = userDetails.reputation || 0
  const answerCount = userDetails.answer_count || 0
  const questionCount = userDetails.question_count || 0
  
  return `Stack Overflow contributor with ${reputation} reputation, ${answerCount} answers, and ${questionCount} questions.`
}

function estimateExperience(userDetails: any): number {
  const reputation = userDetails.reputation || 0
  const accountAge = userDetails.creation_date ? 
    (Date.now() - new Date(userDetails.creation_date * 1000).getTime()) / (1000 * 60 * 60 * 24 * 365) : 1
  
  // Base experience from account age and reputation
  let experience = Math.min(accountAge, 8)
  
  if (reputation > 10000) experience += 2
  else if (reputation > 5000) experience += 1
  else if (reputation > 1000) experience += 0.5
  
  return Math.max(1, Math.min(experience, 15))
}

function identifyRiskFlags(userDetails: any): string[] {
  const flags: string[] = []
  
  if (!userDetails.location) flags.push('No location specified')
  if ((userDetails.reputation || 0) < 100) flags.push('Low reputation')
  if ((userDetails.answer_count || 0) === 0) flags.push('No answers provided')
  
  return flags
}
