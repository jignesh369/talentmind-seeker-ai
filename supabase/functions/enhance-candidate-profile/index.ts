
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { candidate, platform } = await req.json()

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log(`🤖 Enhancing candidate profile: ${candidate.name} from ${platform}`)

    let enhancedCandidate = { ...candidate }

    // LLM Enhancement if OpenAI is available
    if (openaiApiKey && candidate.name && candidate.name !== 'Unknown') {
      try {
        console.log(`🧠 Using AI to enhance ${candidate.name}'s profile`)
        
        const prompt = `Analyze this ${platform} profile and create a professional summary:

Name: ${candidate.name}
Title: ${candidate.title || 'Not specified'}
Location: ${candidate.location || 'Not specified'}
Skills: ${candidate.skills?.join(', ') || 'Not specified'}
Bio/Summary: ${candidate.summary || candidate.bio || 'Not specified'}
Experience: ${candidate.experience_years || 0} years
Platform: ${platform}

Create a 2-3 sentence professional summary that:
1. Highlights their expertise and key skills
2. Mentions their experience level appropriately
3. Sounds professional and engaging for recruiters
4. Is specific to their actual background, not generic

Return only the summary text, no additional formatting.`

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'You are an expert recruiter and talent analyst. Create concise, professional candidate summaries based on their profile data.'
              },
              { role: 'user', content: prompt }
            ],
            temperature: 0.3,
            max_tokens: 200
          }),
        })

        if (response.ok) {
          const data = await response.json()
          const aiSummary = data.choices[0].message.content.trim()
          
          if (aiSummary && aiSummary.length > 50) {
            enhancedCandidate.summary = aiSummary
            enhancedCandidate.ai_enhanced = true
            console.log(`✨ AI enhanced summary for ${candidate.name}`)
          }
        }
      } catch (error) {
        console.error(`AI enhancement failed for ${candidate.name}:`, error)
      }
    }

    // Enhanced Skill Extraction and Classification
    const extractedSkills = extractEnhancedSkills(enhancedCandidate, platform)
    enhancedCandidate.skills = extractedSkills.skills
    enhancedCandidate.skill_categories = extractedSkills.categories
    enhancedCandidate.seniority_level = determineSeniorityLevel(enhancedCandidate)

    // Enhanced Title Generation
    if (!enhancedCandidate.title || enhancedCandidate.title === 'Software Professional') {
      enhancedCandidate.title = generateBetterTitle(enhancedCandidate, platform)
    }

    // Calculate Enhanced Scores
    enhancedCandidate.overall_score = calculateEnhancedOverallScore(enhancedCandidate, platform)
    enhancedCandidate.skill_match = calculateSkillRelevanceScore(enhancedCandidate.skills)
    enhancedCandidate.market_relevance = calculateMarketRelevance(enhancedCandidate)
    enhancedCandidate.completeness_score = calculateProfileCompleteness(enhancedCandidate)

    // Assign Candidate Tier
    enhancedCandidate.candidate_tier = assignCandidateTier(enhancedCandidate)

    console.log(`🎯 Enhanced ${candidate.name}: ${enhancedCandidate.candidate_tier} tier, Score: ${enhancedCandidate.overall_score}`)

    return new Response(
      JSON.stringify({ 
        enhanced_candidate: enhancedCandidate,
        enhancement_applied: true,
        ai_enhanced: enhancedCandidate.ai_enhanced || false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error enhancing candidate profile:', error)
    return new Response(
      JSON.stringify({ 
        enhanced_candidate: candidate,
        enhancement_applied: false,
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function extractEnhancedSkills(candidate: any, platform: string) {
  const allSkills = new Set<string>()
  const categories = {
    programming_languages: [],
    frameworks: [],
    tools: [],
    databases: [],
    cloud: [],
    soft_skills: []
  }

  // Base skills from candidate
  if (candidate.skills) {
    candidate.skills.forEach(skill => allSkills.add(skill.toLowerCase()))
  }

  // Platform-specific extraction
  const text = `${candidate.summary || ''} ${candidate.bio || ''} ${candidate.title || ''}`.toLowerCase()
  
  // Programming Languages
  const languages = ['python', 'javascript', 'typescript', 'java', 'go', 'rust', 'php', 'ruby', 'c++', 'c#', 'swift', 'kotlin', 'scala', 'r']
  languages.forEach(lang => {
    if (text.includes(lang)) {
      allSkills.add(lang)
      categories.programming_languages.push(lang)
    }
  })

  // Frameworks
  const frameworks = ['react', 'vue', 'angular', 'django', 'flask', 'spring', 'laravel', 'rails', 'express', 'fastapi']
  frameworks.forEach(fw => {
    if (text.includes(fw)) {
      allSkills.add(fw)
      categories.frameworks.push(fw)
    }
  })

  // Cloud & Tools
  const cloudTools = ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'jenkins', 'git']
  cloudTools.forEach(tool => {
    if (text.includes(tool)) {
      allSkills.add(tool)
      if (['aws', 'azure', 'gcp'].includes(tool)) {
        categories.cloud.push(tool)
      } else {
        categories.tools.push(tool)
      }
    }
  })

  return {
    skills: Array.from(allSkills).slice(0, 15), // Limit to top 15 skills
    categories
  }
}

function determineSeniorityLevel(candidate: any): string {
  const experience = candidate.experience_years || 0
  const skills = candidate.skills?.length || 0
  const score = candidate.overall_score || 0

  if (experience >= 8 || (score >= 80 && skills >= 10)) return 'Senior'
  if (experience >= 4 || (score >= 60 && skills >= 6)) return 'Mid-level'
  if (experience >= 2 || (score >= 40 && skills >= 3)) return 'Junior'
  return 'Entry-level'
}

function generateBetterTitle(candidate: any, platform: string): string {
  const skills = candidate.skills || []
  const name = candidate.name || ''
  
  // Platform-specific title generation
  if (platform === 'github') {
    if (skills.some(s => ['python', 'machine learning', 'data science'].includes(s.toLowerCase()))) {
      return 'Data Scientist'
    }
    if (skills.some(s => ['react', 'vue', 'angular'].includes(s.toLowerCase()))) {
      return 'Frontend Developer'
    }
    if (skills.some(s => ['django', 'flask', 'spring'].includes(s.toLowerCase()))) {
      return 'Backend Developer'
    }
    if (skills.some(s => ['docker', 'kubernetes', 'aws'].includes(s.toLowerCase()))) {
      return 'DevOps Engineer'
    }
  }
  
  if (platform === 'stackoverflow') {
    return 'Software Engineer' // StackOverflow users are typically engineers
  }

  // Default based on seniority
  const seniority = candidate.seniority_level || 'Mid-level'
  return `${seniority} Developer`
}

function calculateEnhancedOverallScore(candidate: any, platform: string): number {
  let score = 50 // Base score

  // Platform-specific bonuses
  if (platform === 'github') {
    score += Math.min((candidate.github_followers || 0) * 2, 20)
    score += Math.min((candidate.public_repos || 0), 15)
  }
  
  if (platform === 'stackoverflow') {
    score += Math.min((candidate.reputation || 0) / 100, 25)
  }

  // Skills bonus
  score += Math.min((candidate.skills?.length || 0) * 3, 20)

  // Experience bonus
  score += Math.min((candidate.experience_years || 0) * 2, 15)

  // Profile completeness bonus
  if (candidate.email) score += 10
  if (candidate.location) score += 5
  if (candidate.summary && candidate.summary.length > 100) score += 10

  return Math.min(Math.round(score), 100)
}

function calculateSkillRelevanceScore(skills: string[]): number {
  const demandSkills = ['python', 'javascript', 'react', 'aws', 'docker', 'kubernetes', 'machine learning']
  const matches = skills?.filter(skill => 
    demandSkills.some(demand => skill.toLowerCase().includes(demand.toLowerCase()))
  ).length || 0
  
  return Math.min((matches / demandSkills.length) * 100, 100)
}

function calculateMarketRelevance(candidate: any): number {
  const trendingSkills = ['ai', 'machine learning', 'cloud', 'kubernetes', 'typescript', 'react']
  const matches = candidate.skills?.filter(skill => 
    trendingSkills.some(trend => skill.toLowerCase().includes(trend.toLowerCase()))
  ).length || 0
  
  return Math.min((matches / trendingSkills.length) * 100, 100)
}

function calculateProfileCompleteness(candidate: any): number {
  let completeness = 0
  const fields = ['name', 'title', 'email', 'location', 'summary', 'skills']
  
  fields.forEach(field => {
    if (candidate[field]) {
      if (field === 'skills' && Array.isArray(candidate[field])) {
        completeness += candidate[field].length > 0 ? 20 : 0
      } else if (field === 'summary') {
        completeness += candidate[field].length > 50 ? 20 : 10
      } else {
        completeness += 15
      }
    }
  })
  
  return Math.min(completeness, 100)
}

function assignCandidateTier(candidate: any): string {
  const score = candidate.overall_score || 0
  const completeness = candidate.completeness_score || 0
  const skillCount = candidate.skills?.length || 0
  
  // Gold tier: High score, complete profile, many skills
  if (score >= 75 && completeness >= 80 && skillCount >= 8) return 'Gold'
  
  // Silver tier: Good score, decent profile
  if (score >= 60 && completeness >= 60 && skillCount >= 5) return 'Silver'
  
  // Bronze tier: Basic requirements met
  return 'Bronze'
}
