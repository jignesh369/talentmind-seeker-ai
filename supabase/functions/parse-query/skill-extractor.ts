
import { ADVANCED_SKILL_MAPPINGS } from './skill-mappings.ts';
import { CONTEXTUAL_ROLE_CLUSTERS, TECHNOLOGY_STACKS } from './role-clusters.ts';

export function extractAdvancedSkillsWithContext(query: string): {
  skills: string[];
  semantic_skills: string[];
  contextual_skills: string[];
  confidence_score: number;
  technology_stack: string[];
  role_cluster: string[];
} {
  const queryLower = query.toLowerCase();
  const extractedSkills = new Set<string>();
  const semanticSkills = new Set<string>();
  const contextualSkills = new Set<string>();
  const technologyStack = new Set<string>();
  const roleClusters = new Set<string>();
  let confidenceScore = 0;

  // Advanced skill matching with context awareness
  Object.entries(ADVANCED_SKILL_MAPPINGS).forEach(([primarySkill, skillData]) => {
    let skillFound = false;
    
    // Check primary skill
    if (queryLower.includes(primarySkill)) {
      extractedSkills.add(primarySkill);
      skillFound = true;
      confidenceScore += 10;
    }
    
    // Check variants
    skillData.variants?.forEach(variant => {
      if (queryLower.includes(variant.toLowerCase())) {
        extractedSkills.add(primarySkill);
        semanticSkills.add(variant);
        skillFound = true;
        confidenceScore += 8;
      }
    });
    
    if (skillFound) {
      // Add ecosystem skills
      skillData.ecosystem?.forEach(ecosystemSkill => {
        semanticSkills.add(ecosystemSkill);
        contextualSkills.add(ecosystemSkill);
      });
      
      // Add related skills
      skillData.related?.forEach(relatedSkill => {
        contextualSkills.add(relatedSkill);
      });
    }
  });

  // Identify technology stacks
  Object.entries(TECHNOLOGY_STACKS).forEach(([stackName, stackSkills]) => {
    const matchedSkills = stackSkills.filter(skill => 
      extractedSkills.has(skill) || semanticSkills.has(skill)
    );
    
    if (matchedSkills.length >= 2) {
      technologyStack.add(stackName);
      confidenceScore += 15;
    }
  });

  // Identify role clusters
  Object.entries(CONTEXTUAL_ROLE_CLUSTERS).forEach(([clusterName, clusterData]) => {
    const primaryMatches = clusterData.primary_skills.filter(skill => 
      extractedSkills.has(skill) || semanticSkills.has(skill)
    ).length;
    
    const secondaryMatches = clusterData.secondary_skills.filter(skill => 
      extractedSkills.has(skill) || semanticSkills.has(skill)
    ).length;
    
    if (primaryMatches >= 1 || (primaryMatches >= 1 && secondaryMatches >= 1)) {
      roleClusters.add(clusterName.replace('_', ' '));
      confidenceScore += 12;
    }
  });

  return {
    skills: Array.from(extractedSkills),
    semantic_skills: Array.from(semanticSkills),
    contextual_skills: Array.from(contextualSkills),
    confidence_score: Math.min(confidenceScore, 100),
    technology_stack: Array.from(technologyStack),
    role_cluster: Array.from(roleClusters)
  };
}
