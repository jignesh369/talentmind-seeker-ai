
import { LOCATION_VARIATIONS, SENIORITY_INDICATORS, ROLE_VARIATIONS } from './skill-mappings.ts';
import { CONTEXTUAL_ROLE_CLUSTERS } from './role-clusters.ts';

export function extractLocationWithVariations(query: string): string | undefined {
  const queryLower = query.toLowerCase();
  
  // Check primary locations
  for (const location of Object.keys(LOCATION_VARIATIONS)) {
    if (queryLower.includes(location)) {
      return location;
    }
  }
  
  // Check location variations
  for (const [primaryLocation, variations] of Object.entries(LOCATION_VARIATIONS)) {
    for (const variation of variations) {
      if (queryLower.includes(variation.toLowerCase())) {
        return primaryLocation;
      }
    }
  }
  
  return undefined;
}

export function extractSeniorityLevel(query: string): string {
  const queryLower = query.toLowerCase();
  
  for (const [level, indicators] of Object.entries(SENIORITY_INDICATORS)) {
    for (const indicator of indicators) {
      if (queryLower.includes(indicator.toLowerCase())) {
        return level;
      }
    }
  }
  
  return 'any';
}

export function extractRoleTypes(query: string): string[] {
  const queryLower = query.toLowerCase();
  const roles = new Set<string>();
  
  Object.entries(ROLE_VARIATIONS).forEach(([primaryRole, variations]) => {
    if (queryLower.includes(primaryRole)) {
      roles.add(primaryRole);
    }
    
    variations.forEach(variation => {
      if (queryLower.includes(variation.toLowerCase())) {
        roles.add(primaryRole);
      }
    });
  });
  
  return Array.from(roles);
}

export function extractExperience(query: string): { min?: number, max?: number } {
  const experienceRegex = /(\d+)(?:\+|\s*to\s*(\d+))?\s*years?/gi;
  const matches = Array.from(query.matchAll(experienceRegex));
  
  if (matches.length === 0) return {};
  
  const match = matches[0];
  const min = parseInt(match[1]);
  const max = match[2] ? parseInt(match[2]) : undefined;
  
  return { min, max };
}

export function categorizeSkills(skills: string[]): { must_have: string[], nice_to_have: string[] } {
  // Simple heuristic: first few skills are must-have, rest are nice-to-have
  const must_have = skills.slice(0, 3);
  const nice_to_have = skills.slice(3);
  
  return {
    must_have,
    nice_to_have
  };
}

export function extractIndustries(query: string): string[] {
  const industryKeywords = {
    'fintech': ['fintech', 'financial', 'banking', 'payments', 'crypto'],
    'healthtech': ['healthcare', 'medical', 'health tech', 'pharma'],
    'edtech': ['education', 'learning', 'edtech', 'teaching'],
    'ecommerce': ['e-commerce', 'retail', 'marketplace', 'shopping'],
    'gaming': ['gaming', 'game development', 'unity', 'unreal'],
    'ai/ml': ['artificial intelligence', 'machine learning', 'deep learning']
  };
  
  const queryLower = query.toLowerCase();
  const industries = [];
  
  Object.entries(industryKeywords).forEach(([industry, keywords]) => {
    if (keywords.some(keyword => queryLower.includes(keyword))) {
      industries.push(industry);
    }
  });
  
  return industries;
}

export function generateContextualKeywords(skills: string[], roleCluster: string[], intent: string): string[] {
  const contextualKeywords = new Set<string>();
  
  // Add role-specific keywords
  roleCluster.forEach(cluster => {
    const clusterKey = cluster.replace(' ', '_');
    const clusterData = CONTEXTUAL_ROLE_CLUSTERS[clusterKey];
    if (clusterData) {
      clusterData.tools?.forEach(tool => contextualKeywords.add(tool));
    }
  });
  
  // Add intent-specific keywords
  switch (intent) {
    case 'active_hiring':
      contextualKeywords.add('available');
      contextualKeywords.add('open to work');
      contextualKeywords.add('seeking opportunities');
      break;
    case 'skill_assessment':
      contextualKeywords.add('expert');
      contextualKeywords.add('advanced');
      contextualKeywords.add('certified');
      break;
  }
  
  return Array.from(contextualKeywords);
}
