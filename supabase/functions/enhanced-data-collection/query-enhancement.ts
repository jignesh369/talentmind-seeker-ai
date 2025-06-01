
export async function enhanceQueryWithSemanticAI(query: string, openaiApiKey: string) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert talent acquisition AI with semantic understanding. Parse the query and extract comprehensive structured information for advanced candidate search with semantic expansion.
            
            Return ONLY a valid JSON object with:
            - skills: array of technical skills (include variations, synonyms, related technologies)
            - semantic_skills: array of semantically related skills and technologies
            - experience_level: junior/mid/senior/lead/principal/expert
            - experience_min: minimum years of experience
            - experience_max: maximum years of experience  
            - location_preferences: array of locations
            - searchTerms: array of optimized search terms for each platform
            - semantic_terms: array of semantically similar search terms
            - role_types: array of job titles/roles with variations
            - keywords: array of validation keywords
            - semantic_keywords: array of contextually related keywords
            - industries: array of relevant industries
            - company_types: startup/enterprise/consultancy/remote-first
            - salary_range: estimated salary range object {min, max, currency}
            - must_have_skills: critical skills that are non-negotiable
            - nice_to_have_skills: preferred but optional skills
            - career_level_indicators: words that indicate seniority level
            - market_trends: current trends in this field
            - skill_clusters: grouped related skills`
          },
          { role: 'user', content: query }
        ],
        temperature: 0.2
      }),
    });

    const data = await response.json();
    const content = data.choices[0].message.content;
    const parsed = extractJSON(content);
    
    return parsed || {
      skills: [],
      semantic_skills: [],
      experience_level: 'any',
      experience_min: 0,
      experience_max: 20,
      location_preferences: [],
      searchTerms: [query],
      semantic_terms: [],
      role_types: [],
      keywords: [],
      semantic_keywords: [],
      industries: [],
      company_types: [],
      salary_range: null,
      must_have_skills: [],
      nice_to_have_skills: [],
      career_level_indicators: [],
      market_trends: [],
      skill_clusters: []
    };
  } catch (error) {
    console.error('AI query enhancement failed:', error);
    // Return fallback structure
    return {
      query,
      skills: extractSkillsFromQuery(query),
      semantic_skills: [],
      experience_level: 'any',
      experience_min: 0,
      experience_max: 20,
      location_preferences: [],
      searchTerms: [query],
      semantic_terms: [],
      role_types: extractRolesFromQuery(query),
      keywords: query.split(' ').filter(word => word.length > 2),
      semantic_keywords: [],
      industries: [],
      company_types: [],
      salary_range: null,
      must_have_skills: [],
      nice_to_have_skills: [],
      career_level_indicators: [],
      market_trends: [],
      skill_clusters: []
    };
  }
}

function extractJSON(text: string): any {
  try {
    // Try to find JSON in the text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(text);
  } catch (error) {
    console.error('Failed to parse JSON from AI response:', error);
    return null;
  }
}

function extractSkillsFromQuery(query: string): string[] {
  const techSkills = [
    'python', 'javascript', 'typescript', 'java', 'go', 'rust', 'php', 'ruby', 'c++',
    'react', 'vue', 'angular', 'node.js', 'django', 'flask', 'spring', 'laravel',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'jenkins',
    'machine learning', 'ai', 'data science', 'devops', 'frontend', 'backend'
  ];
  
  const queryLower = query.toLowerCase();
  return techSkills.filter(skill => queryLower.includes(skill));
}

function extractRolesFromQuery(query: string): string[] {
  const roles = [
    'software engineer', 'developer', 'devops engineer', 'data scientist',
    'frontend developer', 'backend developer', 'full stack developer',
    'machine learning engineer', 'site reliability engineer', 'platform engineer'
  ];
  
  const queryLower = query.toLowerCase();
  return roles.filter(role => queryLower.includes(role));
}
