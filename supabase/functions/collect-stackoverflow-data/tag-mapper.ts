
export interface EnhancedQuery {
  skills?: string[];
  keywords?: string[];
  experience_level?: string;
}

export function buildEnhancedTagMapping() {
  return {
    'javascript': 'javascript',
    'js': 'javascript',
    'python': 'python',
    'java': 'java',
    'c++': 'c++',
    'c#': 'c#',
    'typescript': 'typescript',
    'react': 'reactjs',
    'reactjs': 'reactjs',
    'angular': 'angular',
    'vue': 'vue.js',
    'vuejs': 'vue.js',
    'node.js': 'node.js',
    'nodejs': 'node.js',
    'machine learning': 'machine-learning',
    'machine-learning': 'machine-learning',
    'ml': 'machine-learning',
    'ai': 'artificial-intelligence',
    'django': 'django',
    'flask': 'flask',
    'spring': 'spring',
    'spring boot': 'spring-boot',
    'aws': 'amazon-web-services',
    'docker': 'docker',
    'kubernetes': 'kubernetes',
    'tensorflow': 'tensorflow',
    'pytorch': 'pytorch',
    'data science': 'data-science',
    'backend': 'backend',
    'frontend': 'frontend',
    'api': 'api',
    'rest': 'rest',
    'graphql': 'graphql'
  };
}

export function generatePrioritizedTags(enhancedQuery: EnhancedQuery | null): string[] {
  const enhancedTagMapping = buildEnhancedTagMapping();
  const skills = enhancedQuery?.skills || [];
  const keywords = enhancedQuery?.keywords || [];
  
  const searchTerms = [...skills, ...keywords].map(term => term.toLowerCase());
  const prioritizedTags = [];
  
  // Priority 1: Direct skill matches
  searchTerms.forEach(term => {
    if (enhancedTagMapping[term]) {
      prioritizedTags.push(enhancedTagMapping[term]);
    } else if (term.length > 2) {
      prioritizedTags.push(term.replace(/\s+/g, '-'));
    }
  });

  // Priority 2: Technology combinations
  const techCombinations = [
    ['python', 'django'], ['python', 'flask'], ['javascript', 'react'],
    ['javascript', 'node.js'], ['java', 'spring'], ['typescript', 'angular']
  ];
  
  techCombinations.forEach(combo => {
    if (combo.every(tech => searchTerms.includes(tech))) {
      prioritizedTags.push(...combo.map(tech => enhancedTagMapping[tech] || tech));
    }
  });

  // Fallback tags for broad searches
  if (prioritizedTags.length === 0) {
    prioritizedTags.push('javascript', 'python', 'java', 'backend', 'frontend');
  }

  // Remove duplicates and limit
  return [...new Set(prioritizedTags)].slice(0, 6);
}

export function getSemanticTagMatches(userTags: string[], searchTags: string[]): number {
  const semanticRelations = {
    'javascript': ['node.js', 'reactjs', 'angular', 'vue.js', 'frontend'],
    'python': ['django', 'flask', 'machine-learning', 'data-science'],
    'java': ['spring', 'spring-boot', 'android', 'backend'],
    'backend': ['api', 'rest', 'graphql', 'microservices'],
    'frontend': ['html', 'css', 'ui', 'ux', 'responsive-design'],
    'machine-learning': ['tensorflow', 'pytorch', 'data-science', 'ai']
  };
  
  let matches = 0;
  searchTags.forEach(searchTag => {
    const relatedTags = semanticRelations[searchTag] || [];
    if (relatedTags.some(related => userTags.includes(related))) {
      matches++;
    }
  });
  
  return matches;
}

export function generateUsernameVariations(displayName: string): string[] {
  if (!displayName) return [];
  
  const variations = [];
  const cleaned = displayName.replace(/[^a-zA-Z0-9\s]/g, '').toLowerCase();
  
  // Add original
  variations.push(displayName);
  
  // Add cleaned version
  if (cleaned !== displayName.toLowerCase()) {
    variations.push(cleaned);
  }
  
  // Add without spaces
  variations.push(cleaned.replace(/\s+/g, ''));
  
  // Add with dots
  variations.push(cleaned.replace(/\s+/g, '.'));
  
  // Add with underscores
  variations.push(cleaned.replace(/\s+/g, '_'));
  
  // Add with dashes
  variations.push(cleaned.replace(/\s+/g, '-'));
  
  return [...new Set(variations)].filter(v => v.length > 2);
}
