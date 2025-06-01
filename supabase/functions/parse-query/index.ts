import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ParsedCriteria {
  skills: string[];
  semantic_skills: string[];
  contextual_skills: string[];
  location?: string;
  experience_min?: number;
  experience_max?: number;
  job_titles: string[];
  keywords: string[];
  semantic_keywords: string[];
  contextual_keywords: string[];
  industries: string[];
  company_types: string[];
  role_types: string[];
  seniority_level: string;
  must_have_skills: string[];
  nice_to_have_skills: string[];
  search_intent: string;
  confidence_score: number;
  role_cluster: string[];
  technology_stack: string[];
}

// Enhanced skill recognition with deeper semantic mapping and contextual understanding
const ADVANCED_SKILL_MAPPINGS = {
  // Programming Languages with ecosystem
  'javascript': {
    variants: ['js', 'ecmascript', 'es6', 'es2015', 'es2020'],
    ecosystem: ['node.js', 'nodejs', 'react', 'vue', 'angular', 'typescript'],
    related: ['html', 'css', 'json', 'npm'],
    context: ['frontend', 'backend', 'fullstack'],
    seniority_indicators: ['vanilla js', 'modern javascript', 'es6+']
  },
  'typescript': {
    variants: ['ts'],
    ecosystem: ['javascript', 'node.js', 'react', 'angular', 'nest.js'],
    related: ['type safety', 'static typing'],
    context: ['frontend', 'backend', 'fullstack'],
    seniority_indicators: ['advanced typescript', 'type system', 'generics']
  },
  'python': {
    variants: ['py'],
    ecosystem: ['django', 'flask', 'fastapi', 'pandas', 'numpy', 'tensorflow', 'pytorch'],
    related: ['data science', 'machine learning', 'web development', 'automation'],
    context: ['backend', 'data', 'ai', 'automation'],
    seniority_indicators: ['pythonic', 'async/await', 'decorators']
  },
  'react': {
    variants: ['reactjs', 'react.js'],
    ecosystem: ['jsx', 'next.js', 'nextjs', 'redux', 'hooks', 'context'],
    related: ['javascript', 'typescript', 'html', 'css'],
    context: ['frontend', 'spa', 'ui'],
    seniority_indicators: ['react hooks', 'context api', 'performance optimization']
  },
  'node.js': {
    variants: ['nodejs', 'node'],
    ecosystem: ['express', 'nest.js', 'fastify', 'npm', 'yarn'],
    related: ['javascript', 'typescript', 'api', 'microservices'],
    context: ['backend', 'api', 'microservices'],
    seniority_indicators: ['event loop', 'streams', 'clustering']
  },
  
  // Cloud & DevOps with advanced understanding
  'aws': {
    variants: ['amazon web services'],
    ecosystem: ['ec2', 's3', 'lambda', 'ecs', 'eks', 'rds', 'cloudformation'],
    related: ['cloud', 'devops', 'serverless', 'microservices'],
    context: ['cloud', 'infrastructure', 'devops'],
    seniority_indicators: ['aws certified', 'multi-region', 'cost optimization']
  },
  'kubernetes': {
    variants: ['k8s'],
    ecosystem: ['docker', 'helm', 'istio', 'prometheus', 'grafana'],
    related: ['containerization', 'orchestration', 'microservices'],
    context: ['devops', 'infrastructure', 'scalability'],
    seniority_indicators: ['cluster management', 'service mesh', 'operators']
  },
  'docker': {
    variants: ['containerization'],
    ecosystem: ['kubernetes', 'docker-compose', 'dockerfile'],
    related: ['devops', 'microservices', 'deployment'],
    context: ['devops', 'deployment', 'infrastructure'],
    seniority_indicators: ['multi-stage builds', 'security scanning', 'optimization']
  }
};

const CONTEXTUAL_ROLE_CLUSTERS = {
  'frontend_developer': {
    primary_skills: ['javascript', 'typescript', 'react', 'vue', 'angular'],
    secondary_skills: ['html', 'css', 'sass', 'webpack', 'vite'],
    tools: ['figma', 'git', 'npm', 'yarn'],
    seniority_progression: ['junior frontend', 'frontend developer', 'senior frontend', 'lead frontend', 'frontend architect']
  },
  'backend_developer': {
    primary_skills: ['node.js', 'python', 'java', 'go', 'rust'],
    secondary_skills: ['sql', 'postgresql', 'mongodb', 'redis'],
    tools: ['docker', 'git', 'postman', 'swagger'],
    seniority_progression: ['junior backend', 'backend developer', 'senior backend', 'lead backend', 'backend architect']
  },
  'fullstack_developer': {
    primary_skills: ['javascript', 'typescript', 'react', 'node.js'],
    secondary_skills: ['sql', 'mongodb', 'aws', 'docker'],
    tools: ['git', 'docker', 'figma', 'postman'],
    seniority_progression: ['junior fullstack', 'fullstack developer', 'senior fullstack', 'lead fullstack', 'solution architect']
  },
  'devops_engineer': {
    primary_skills: ['aws', 'kubernetes', 'docker', 'terraform'],
    secondary_skills: ['python', 'bash', 'jenkins', 'gitlab'],
    tools: ['prometheus', 'grafana', 'ansible', 'helm'],
    seniority_progression: ['junior devops', 'devops engineer', 'senior devops', 'lead devops', 'platform architect']
  }
};

const TECHNOLOGY_STACKS = {
  'mern': ['mongodb', 'express', 'react', 'node.js'],
  'mean': ['mongodb', 'express', 'angular', 'node.js'],
  'lamp': ['linux', 'apache', 'mysql', 'php'],
  'django_stack': ['python', 'django', 'postgresql', 'redis'],
  'spring_stack': ['java', 'spring', 'mysql', 'maven'],
  'jamstack': ['javascript', 'api', 'markup', 'gatsby', 'next.js']
};

const SEARCH_INTENT_PATTERNS = {
  'active_hiring': ['hire', 'recruit', 'join', 'hiring', 'position', 'role', 'job'],
  'talent_research': ['research', 'market', 'talent pool', 'analysis', 'benchmark'],
  'competitive_intelligence': ['competitor', 'company', 'team', 'organization'],
  'skill_assessment': ['expert', 'specialist', 'advanced', 'proficient', 'experienced'],
  'location_specific': ['remote', 'onsite', 'hybrid', 'relocate', 'local'],
  'project_based': ['contract', 'freelance', 'project', 'consulting', 'temporary']
};

function extractAdvancedSkillsWithContext(query: string): {
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

function detectSearchIntent(query: string): string {
  const queryLower = query.toLowerCase();
  
  for (const [intent, patterns] of Object.entries(SEARCH_INTENT_PATTERNS)) {
    if (patterns.some(pattern => queryLower.includes(pattern))) {
      return intent;
    }
  }
  
  return 'general_talent_discovery';
}

function generateContextualKeywords(skills: string[], roleCluster: string[], intent: string): string[] {
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

function extractSkillsWithSemantics(query: string): { skills: string[], semantic_skills: string[] } {
  const queryLower = query.toLowerCase();
  const extractedSkills = new Set<string>();
  const semanticSkills = new Set<string>();
  
  // Direct skill matching
  Object.keys(SKILL_MAPPINGS).forEach(skill => {
    if (queryLower.includes(skill)) {
      extractedSkills.add(skill);
      // Add semantic variations
      SKILL_MAPPINGS[skill].forEach(semantic => semanticSkills.add(semantic));
    }
  });
  
  // Check for semantic matches
  Object.entries(SKILL_MAPPINGS).forEach(([primarySkill, variations]) => {
    variations.forEach(variation => {
      if (queryLower.includes(variation.toLowerCase())) {
        extractedSkills.add(primarySkill);
        semanticSkills.add(variation);
      }
    });
  });
  
  return {
    skills: Array.from(extractedSkills),
    semantic_skills: Array.from(semanticSkills)
  };
}

function extractLocationWithVariations(query: string): string | undefined {
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

function extractSeniorityLevel(query: string): string {
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

function extractRoleTypes(query: string): string[] {
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

function extractExperience(query: string): { min?: number, max?: number } {
  const experienceRegex = /(\d+)(?:\+|\s*to\s*(\d+))?\s*years?/gi;
  const matches = Array.from(query.matchAll(experienceRegex));
  
  if (matches.length === 0) return {};
  
  const match = matches[0];
  const min = parseInt(match[1]);
  const max = match[2] ? parseInt(match[2]) : undefined;
  
  return { min, max };
}

function categorizeSkills(skills: string[]): { must_have: string[], nice_to_have: string[] } {
  // Simple heuristic: first few skills are must-have, rest are nice-to-have
  const must_have = skills.slice(0, 3);
  const nice_to_have = skills.slice(3);
  
  return {
    must_have,
    nice_to_have
  };
}

function extractIndustries(query: string): string[] {
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query } = await req.json()

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Valid query string is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('🔍 Advanced semantic query parsing started:', query);

    // Advanced semantic parsing
    const skillAnalysis = extractAdvancedSkillsWithContext(query);
    const searchIntent = detectSearchIntent(query);
    const contextualKeywords = generateContextualKeywords(
      skillAnalysis.skills, 
      skillAnalysis.role_cluster, 
      searchIntent
    );

    // Enhanced parsing with existing functions
    const location = extractLocationWithVariations(query);
    const seniorityLevel = extractSeniorityLevel(query);
    const roleTypes = extractRoleTypes(query);
    const experience = extractExperience(query);
    const industries = extractIndustries(query);
    const { must_have, nice_to_have } = categorizeSkills(skillAnalysis.skills);

    const parsed: ParsedCriteria = {
      skills: skillAnalysis.skills,
      semantic_skills: skillAnalysis.semantic_skills,
      contextual_skills: skillAnalysis.contextual_skills,
      location,
      experience_min: experience.min,
      experience_max: experience.max,
      job_titles: roleTypes,
      keywords: query.split(' ').filter(word => word.length > 2),
      semantic_keywords: [...skillAnalysis.semantic_skills, ...roleTypes],
      contextual_keywords,
      industries,
      company_types: [],
      role_types: roleTypes,
      seniority_level: seniorityLevel,
      must_have_skills: must_have,
      nice_to_have_skills: nice_to_have,
      search_intent: searchIntent,
      confidence_score: skillAnalysis.confidence_score,
      role_cluster: skillAnalysis.role_cluster,
      technology_stack: skillAnalysis.technology_stack
    };

    console.log('✅ Advanced semantic parsing completed:', {
      originalQuery: query,
      extractedSkills: skillAnalysis.skills.length,
      semanticSkills: skillAnalysis.semantic_skills.length,
      contextualSkills: skillAnalysis.contextual_skills.length,
      confidenceScore: skillAnalysis.confidence_score,
      searchIntent,
      technologyStack: skillAnalysis.technology_stack.length,
      roleClusters: skillAnalysis.role_cluster.length
    });

    return new Response(
      JSON.stringify({ parsed_criteria: parsed }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Advanced semantic parsing error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to parse query with advanced semantic processing',
        fallback_parsing: true 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
