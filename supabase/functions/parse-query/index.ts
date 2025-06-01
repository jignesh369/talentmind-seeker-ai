
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ParsedCriteria {
  skills: string[];
  location?: string;
  experience_min?: number;
  experience_max?: number;
  job_titles: string[];
  keywords: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query } = await req.json()

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Simple parsing logic (can be enhanced with OpenAI later)
    const parsed: ParsedCriteria = {
      skills: [],
      job_titles: [],
      keywords: []
    }

    // Extract common programming languages and technologies
    const skillKeywords = [
      'python', 'javascript', 'typescript', 'java', 'c++', 'go', 'rust',
      'react', 'vue', 'angular', 'node.js', 'django', 'flask', 'fastapi',
      'docker', 'kubernetes', 'aws', 'gcp', 'azure', 'tensorflow', 'pytorch',
      'machine learning', 'ml', 'ai', 'data science', 'backend', 'frontend',
      'fullstack', 'devops', 'mlops'
    ]

    const locationKeywords = ['remote', 'london', 'new york', 'san francisco', 'berlin', 'india', 'usa', 'uk']
    const titleKeywords = ['engineer', 'developer', 'scientist', 'architect', 'lead', 'senior', 'junior', 'principal']

    const queryLower = query.toLowerCase()

    // Extract skills
    skillKeywords.forEach(skill => {
      if (queryLower.includes(skill)) {
        parsed.skills.push(skill)
      }
    })

    // Extract location
    locationKeywords.forEach(location => {
      if (queryLower.includes(location)) {
        parsed.location = location
      }
    })

    // Extract job titles
    titleKeywords.forEach(title => {
      if (queryLower.includes(title)) {
        parsed.job_titles.push(title)
      }
    })

    // Extract experience years
    const experienceMatch = queryLower.match(/(\d+)\+?\s*years?/)
    if (experienceMatch) {
      parsed.experience_min = parseInt(experienceMatch[1])
    }

    // Add all words as keywords for general matching
    parsed.keywords = query.split(' ').filter(word => word.length > 2)

    console.log('Parsed query:', { query, parsed })

    return new Response(
      JSON.stringify({ parsed_criteria: parsed }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error parsing query:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to parse query' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
