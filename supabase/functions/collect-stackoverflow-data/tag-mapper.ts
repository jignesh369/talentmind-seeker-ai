
export function mapSkillsToTags(skills: string[]): string[] {
  const tagMap: Record<string, string[]> = {
    'javascript': ['javascript', 'js', 'node.js', 'typescript'],
    'python': ['python', 'django', 'flask', 'pandas', 'numpy'],
    'java': ['java', 'spring', 'spring-boot', 'hibernate'],
    'react': ['reactjs', 'react', 'react-native'],
    'angular': ['angular', 'angularjs', 'typescript'],
    'vue': ['vue.js', 'vuejs', 'vue'],
    'php': ['php', 'laravel', 'symfony', 'wordpress'],
    'c#': ['c#', '.net', 'asp.net', 'entity-framework'],
    'go': ['go', 'golang'],
    'rust': ['rust'],
    'swift': ['swift', 'ios'],
    'kotlin': ['kotlin', 'android'],
    'sql': ['sql', 'mysql', 'postgresql', 'sqlite'],
    'mongodb': ['mongodb', 'mongoose'],
    'aws': ['amazon-web-services', 'aws', 'ec2', 's3'],
    'docker': ['docker', 'containers'],
    'kubernetes': ['kubernetes', 'k8s'],
    'machine learning': ['machine-learning', 'tensorflow', 'pytorch', 'scikit-learn'],
    'data science': ['data-science', 'pandas', 'numpy', 'matplotlib'],
    'frontend': ['html', 'css', 'javascript', 'reactjs', 'vue.js', 'angular'],
    'backend': ['node.js', 'python', 'java', 'php', 'go', 'rust'],
    'fullstack': ['javascript', 'node.js', 'reactjs', 'python', 'java'],
    'mobile': ['android', 'ios', 'react-native', 'flutter'],
    'devops': ['docker', 'kubernetes', 'aws', 'jenkins', 'ci-cd']
  }
  
  const mappedTags = new Set<string>()
  
  skills.forEach(skill => {
    const normalizedSkill = skill.toLowerCase()
    
    // Direct mapping
    if (tagMap[normalizedSkill]) {
      tagMap[normalizedSkill].forEach(tag => mappedTags.add(tag))
    }
    
    // Fuzzy matching
    Object.entries(tagMap).forEach(([key, tags]) => {
      if (normalizedSkill.includes(key) || key.includes(normalizedSkill)) {
        tags.forEach(tag => mappedTags.add(tag))
      }
    })
    
    // Add the skill itself if it looks like a valid tag
    if (isValidTag(normalizedSkill)) {
      mappedTags.add(normalizedSkill)
    }
  })
  
  return Array.from(mappedTags).slice(0, 10) // Limit to avoid too many API calls
}

export function getRelevantTags(skills: string[]): string[] {
  if (skills.length === 0) {
    return ['javascript', 'python', 'java', 'react', 'node.js']
  }
  
  const mapped = mapSkillsToTags(skills)
  
  // Add some high-value tags if not present
  const essentialTags = ['javascript', 'python', 'java', 'react']
  essentialTags.forEach(tag => {
    if (!mapped.includes(tag) && mapped.length < 8) {
      mapped.push(tag)
    }
  })
  
  return mapped
}

function isValidTag(tag: string): boolean {
  // Check if it looks like a programming-related tag
  const programmingPatterns = [
    /^[a-z]+(-[a-z]+)*$/, // kebab-case
    /^[a-z]+(\.[a-z]+)?$/, // with dots like vue.js
    /^[a-z]+[0-9]*$/, // with numbers
  ]
  
  const invalidWords = ['the', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']
  
  return tag.length >= 2 && 
         tag.length <= 30 && 
         !invalidWords.includes(tag) &&
         programmingPatterns.some(pattern => pattern.test(tag))
}
