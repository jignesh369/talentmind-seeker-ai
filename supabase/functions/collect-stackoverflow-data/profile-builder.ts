
import { StackOverflowUser, StackOverflowAnswer, StackOverflowQuestion } from './api-client.ts'

export interface EnhancedProfile {
  title: string
  summary: string
  skills: string[]
  estimatedExperience: number
  riskFlags: string[]
}

export function buildEnhancedProfile(
  user: StackOverflowUser,
  answers: StackOverflowAnswer[],
  questions: StackOverflowQuestion[],
  primaryTag: string
): EnhancedProfile {
  const skills = extractSkillsFromActivity(answers, questions, primaryTag)
  const experience = estimateExperience(user, answers, questions)
  const riskFlags = identifyRiskFlags(user, answers, questions)
  
  return {
    title: generateTitle(primaryTag, skills),
    summary: generateSummary(user, answers, questions, skills),
    skills,
    estimatedExperience: experience,
    riskFlags
  }
}

function extractSkillsFromActivity(
  answers: StackOverflowAnswer[],
  questions: StackOverflowQuestion[],
  primaryTag: string
): string[] {
  const skillMap = new Map<string, number>()
  
  // Add primary tag
  skillMap.set(primaryTag, 10)
  
  // Extract from answer tags
  answers.forEach(answer => {
    answer.tags?.forEach(tag => {
      if (isValidSkill(tag)) {
        skillMap.set(tag, (skillMap.get(tag) || 0) + 2)
      }
    })
  })
  
  // Extract from question tags
  questions.forEach(question => {
    question.tags?.forEach(tag => {
      if (isValidSkill(tag)) {
        skillMap.set(tag, (skillMap.get(tag) || 0) + 1)
      }
    })
  })
  
  // Sort by frequency and return top skills
  return Array.from(skillMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([skill]) => skill)
}

function isValidSkill(tag: string): boolean {
  const commonTags = [
    'javascript', 'python', 'java', 'c#', 'php', 'html', 'css', 'sql',
    'react', 'angular', 'vue.js', 'node.js', 'express', 'django', 'flask',
    'spring', 'laravel', 'ruby', 'go', 'rust', 'swift', 'kotlin',
    'typescript', 'jquery', 'bootstrap', 'sass', 'less',
    'mysql', 'postgresql', 'mongodb', 'redis', 'sqlite',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins',
    'git', 'github', 'gitlab', 'bitbucket',
    'linux', 'ubuntu', 'windows', 'macos',
    'android', 'ios', 'flutter', 'react-native',
    'machine-learning', 'artificial-intelligence', 'data-science',
    'tensorflow', 'pytorch', 'pandas', 'numpy'
  ]
  
  return commonTags.includes(tag.toLowerCase()) || tag.length <= 20
}

function generateTitle(primaryTag: string, skills: string[]): string {
  const titleMap: Record<string, string> = {
    'javascript': 'JavaScript Developer',
    'python': 'Python Developer',
    'java': 'Java Developer',
    'c#': 'C# Developer',
    'php': 'PHP Developer',
    'react': 'React Developer',
    'angular': 'Angular Developer',
    'vue.js': 'Vue.js Developer',
    'node.js': 'Node.js Developer',
    'machine-learning': 'Machine Learning Engineer',
    'data-science': 'Data Scientist',
    'android': 'Android Developer',
    'ios': 'iOS Developer'
  }
  
  return titleMap[primaryTag.toLowerCase()] || `${primaryTag} Developer`
}

function generateSummary(
  user: StackOverflowUser,
  answers: StackOverflowAnswer[],
  questions: StackOverflowQuestion[],
  skills: string[]
): string {
  let summary = `Stack Overflow contributor with ${user.reputation} reputation points`
  
  if (answers.length > 0) {
    const acceptedAnswers = answers.filter(a => a.is_accepted).length
    summary += `. Provided ${answers.length} answers`
    if (acceptedAnswers > 0) {
      summary += ` (${acceptedAnswers} accepted)`
    }
  }
  
  if (questions.length > 0) {
    summary += `. Asked ${questions.length} questions`
  }
  
  if (skills.length > 0) {
    summary += `. Expertise in ${skills.slice(0, 3).join(', ')}`
  }
  
  return summary
}

function estimateExperience(
  user: StackOverflowUser,
  answers: StackOverflowAnswer[],
  questions: StackOverflowQuestion[]
): number {
  // Base experience from account age
  const accountAge = (Date.now() / 1000 - user.creation_date) / (365 * 24 * 60 * 60)
  let experience = Math.min(accountAge, 8)
  
  // Bonus for reputation (indicates expertise)
  if (user.reputation > 10000) experience += 2
  else if (user.reputation > 5000) experience += 1.5
  else if (user.reputation > 1000) experience += 1
  
  // Bonus for answer quality
  const acceptedAnswers = answers.filter(a => a.is_accepted).length
  experience += Math.min(acceptedAnswers * 0.2, 2)
  
  // Bonus for high-scoring content
  const highScoreAnswers = answers.filter(a => a.score > 10).length
  experience += Math.min(highScoreAnswers * 0.1, 1)
  
  return Math.max(1, Math.min(experience, 15)) // 1-15 years
}

function identifyRiskFlags(
  user: StackOverflowUser,
  answers: StackOverflowAnswer[],
  questions: StackOverflowQuestion[]
): string[] {
  const flags: string[] = []
  
  if (user.reputation < 100) {
    flags.push('Low reputation')
  }
  
  if (answers.length === 0) {
    flags.push('No answers provided')
  }
  
  if (answers.length > 0) {
    const acceptanceRate = answers.filter(a => a.is_accepted).length / answers.length
    if (acceptanceRate < 0.1) {
      flags.push('Low answer acceptance rate')
    }
  }
  
  // Check for recent activity
  const sixMonthsAgo = Date.now() / 1000 - (6 * 30 * 24 * 60 * 60)
  const recentActivity = answers.some(a => a.creation_date > sixMonthsAgo) ||
                        questions.some(q => q.creation_date > sixMonthsAgo)
  
  if (!recentActivity && user.last_access_date < sixMonthsAgo) {
    flags.push('No recent activity')
  }
  
  return flags
}
