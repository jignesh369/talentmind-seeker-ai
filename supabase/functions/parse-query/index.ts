
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ParsedCriteria {
  skills: string[];
  semantic_skills: string[];
  location?: string;
  experience_min?: number;
  experience_max?: number;
  job_titles: string[];
  keywords: string[];
  semantic_keywords: string[];
  industries: string[];
  company_types: string[];
  role_types: string[];
  seniority_level: string;
  must_have_skills: string[];
  nice_to_have_skills: string[];
}

// Enhanced skill recognition with semantic mapping
const SKILL_MAPPINGS = {
  // Programming Languages
  'javascript': ['js', 'ecmascript', 'node.js', 'nodejs', 'react', 'vue', 'angular'],
  'typescript': ['ts', 'javascript', 'js'],
  'python': ['py', 'django', 'flask', 'fastapi', 'pandas', 'numpy', 'tensorflow'],
  'java': ['spring', 'hibernate', 'maven', 'gradle'],
  'go': ['golang'],
  'c++': ['cpp', 'c plus plus'],
  'c#': ['csharp', 'dotnet', '.net'],
  
  // Frameworks & Libraries
  'react': ['reactjs', 'jsx', 'next.js', 'nextjs'],
  'vue': ['vuejs', 'nuxt'],
  'angular': ['angularjs'],
  'django': ['python'],
  'flask': ['python'],
  'spring': ['java'],
  'express': ['node.js', 'javascript'],
  
  // Databases
  'postgresql': ['postgres', 'psql'],
  'mysql': ['sql'],
  'mongodb': ['mongo', 'nosql'],
  'redis': ['cache', 'caching'],
  
  // Cloud & DevOps
  'aws': ['amazon web services', 'ec2', 's3', 'lambda'],
  'azure': ['microsoft azure'],
  'gcp': ['google cloud platform', 'google cloud'],
  'docker': ['containerization', 'containers'],
  'kubernetes': ['k8s', 'container orchestration'],
  'terraform': ['infrastructure as code', 'iac'],
  
  // Data & AI
  'machine learning': ['ml', 'ai', 'artificial intelligence'],
  'data science': ['data analysis', 'analytics'],
  'tensorflow': ['deep learning', 'neural networks'],
  'pytorch': ['deep learning']
};

const LOCATION_VARIATIONS = {
  'remote': ['work from home', 'distributed', 'anywhere', 'wfh'],
  'san francisco': ['sf', 'bay area', 'silicon valley'],
  'new york': ['nyc', 'manhattan'],
  'london': ['uk', 'united kingdom'],
  'berlin': ['germany'],
  'bangalore': ['bengaluru', 'blr'],
  'hyderabad': ['hyd'],
  'mumbai': ['bombay']
};

const SENIORITY_INDICATORS = {
  'junior': ['entry level', 'graduate', 'junior', 'jr', '0-2 years', 'associate'],
  'mid': ['mid level', 'intermediate', '2-5 years', 'mid-level'],
  'senior': ['senior', 'sr', '5+ years', 'experienced', 'lead'],
  'principal': ['principal', 'staff', 'distinguished', 'architect', 'expert'],
  'lead': ['tech lead', 'team lead', 'engineering lead', 'lead engineer']
};

const ROLE_VARIATIONS = {
  'software engineer': ['developer', 'programmer', 'coder', 'swe'],
  'frontend developer': ['frontend engineer', 'ui developer', 'web developer'],
  'backend developer': ['backend engineer', 'server developer', 'api developer'],
  'full stack developer': ['fullstack developer', 'full-stack engineer'],
  'devops engineer': ['site reliability engineer', 'sre', 'platform engineer'],
  'data scientist': ['data analyst', 'machine learning engineer', 'ml engineer'],
  'product manager': ['pm', 'product owner', 'po']
};

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

    console.log('🔍 Enhanced query parsing started:', query);

    // Enhanced parsing with semantic understanding
    const { skills, semantic_skills } = extractSkillsWithSemantics(query);
    const location = extractLocationWithVariations(query);
    const seniorityLevel = extractSeniorityLevel(query);
    const roleTypes = extractRoleTypes(query);
    const experience = extractExperience(query);
    const industries = extractIndustries(query);
    const { must_have, nice_to_have } = categorizeSkills(skills);

    const parsed: ParsedCriteria = {
      skills,
      semantic_skills,
      location,
      experience_min: experience.min,
      experience_max: experience.max,
      job_titles: roleTypes,
      keywords: query.split(' ').filter(word => word.length > 2),
      semantic_keywords: [...semantic_skills, ...roleTypes],
      industries,
      company_types: [],
      role_types: roleTypes,
      seniority_level: seniorityLevel,
      must_have_skills: must_have,
      nice_to_have_skills: nice_to_have
    };

    console.log('✅ Enhanced parsing completed:', {
      originalQuery: query,
      extractedSkills: skills.length,
      semanticSkills: semantic_skills.length,
      location,
      seniorityLevel,
      roleTypes: roleTypes.length,
      industries: industries.length
    });

    return new Response(
      JSON.stringify({ parsed_criteria: parsed }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Enhanced query parsing error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to parse query with enhanced processing',
        fallback_parsing: true 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
