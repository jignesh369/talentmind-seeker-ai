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
    const { candidate, platform, jobContext } = await req.json()

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log(`🤖 Enhancing candidate profile: ${candidate.name} from ${platform}`)

    let enhancedCandidate = { ...candidate }

    // Advanced LLM Enhancement with multiple AI features
    if (openaiApiKey && candidate.name && candidate.name !== 'Unknown') {
      try {
        console.log(`🧠 Using advanced AI to enhance ${candidate.name}'s profile`)
        
        // Enhanced prompt with market context and role-specific insights
        const enhancedPrompt = `Analyze this ${platform} profile and create a comprehensive professional enhancement:

Name: ${candidate.name}
Title: ${candidate.title || 'Not specified'}
Location: ${candidate.location || 'Not specified'}
Skills: ${candidate.skills?.join(', ') || 'Not specified'}
Bio/Summary: ${candidate.summary || candidate.bio || 'Not specified'}
Experience: ${candidate.experience_years || 0} years
Platform: ${platform}
Current Company: ${candidate.current_company || 'Not specified'}
Availability Signals: ${candidate.availability_analysis?.signals?.join(', ') || 'None detected'}

Create a comprehensive enhancement that includes:

1. PROFESSIONAL_SUMMARY: A compelling 2-3 sentence summary highlighting expertise, impact, and market position
2. ROLE_CLASSIFICATION: Primary role (e.g., "Senior Full-Stack Engineer", "Data Science Lead")
3. EXPERTISE_LEVEL: Technical expertise assessment (Expert/Advanced/Intermediate/Emerging)
4. MARKET_POSITIONING: How they compare in the current market
5. GROWTH_TRAJECTORY: Career development insights
6. COLLABORATION_STYLE: Working style and team fit assessment
7. IMPACT_POTENTIAL: Potential value to organizations

Return as JSON:
{
  "professional_summary": "...",
  "role_classification": "...",
  "expertise_level": "...",
  "market_positioning": "...",
  "growth_trajectory": "...",
  "collaboration_style": "...",
  "impact_potential": "...",
  "confidence_score": 85
}`

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
                content: 'You are an expert talent analyst and career consultant. Provide deep, actionable insights about technical professionals based on their profiles and market context.'
              },
              { role: 'user', content: enhancedPrompt }
            ],
            temperature: 0.3,
            max_tokens: 600
          }),
        })

        if (response.ok) {
          const data = await response.json()
          const aiContent = data.choices[0].message.content.trim()
          
          try {
            const aiAnalysis = JSON.parse(aiContent)
            
            // Apply comprehensive AI enhancements
            enhancedCandidate.summary = aiAnalysis.professional_summary
            enhancedCandidate.title = aiAnalysis.role_classification || enhancedCandidate.title
            enhancedCandidate.expertise_level = aiAnalysis.expertise_level
            enhancedCandidate.market_positioning = aiAnalysis.market_positioning
            enhancedCandidate.growth_trajectory = aiAnalysis.growth_trajectory
            enhancedCandidate.collaboration_style = aiAnalysis.collaboration_style
            enhancedCandidate.impact_potential = aiAnalysis.impact_potential
            enhancedCandidate.ai_confidence_score = aiAnalysis.confidence_score
            enhancedCandidate.ai_enhanced = true
            
            console.log(`✨ Advanced AI enhancement completed for ${candidate.name}`)
            
          } catch (parseError) {
            // Fallback to simple summary if JSON parsing fails
            enhancedCandidate.summary = aiContent.length > 50 ? aiContent : enhancedCandidate.summary
            enhancedCandidate.ai_enhanced = true
          }
        }

        // Generate personalized outreach if job context provided
        if (jobContext) {
          const outreachMessage = await generatePersonalizedOutreach(enhancedCandidate, jobContext, openaiApiKey)
          if (outreachMessage) {
            enhancedCandidate.personalized_outreach = outreachMessage
            console.log(`📧 Generated personalized outreach for ${candidate.name}`)
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
    enhancedCandidate.candidate_tier = assignAdvancedCandidateTier(enhancedCandidate)
    
    // Add enhancement metadata
    enhancedCandidate.enhancement_metadata = {
      ai_version: '2.0',
      features_applied: {
        advanced_ai_summary: !!enhancedCandidate.ai_enhanced,
        expertise_analysis: !!enhancedCandidate.expertise_level,
        market_positioning: !!enhancedCandidate.market_positioning,
        personalized_outreach: !!enhancedCandidate.personalized_outreach
      },
      enhancement_timestamp: new Date().toISOString()
    }

    console.log(`🎯 Advanced enhancement completed for ${candidate.name}: ${enhancedCandidate.candidate_tier} tier, Score: ${enhancedCandidate.overall_score}`)

    return new Response(
      JSON.stringify({ 
        enhanced_candidate: enhancedCandidate,
        enhancement_applied: true,
        ai_enhanced: enhancedCandidate.ai_enhanced || false,
        advanced_features: enhancedCandidate.enhancement_metadata.features_applied
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in advanced candidate enhancement:', error)
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

function assignAdvancedCandidateTier(candidate: any): string {
  const score = candidate.overall_score || 0
  const completeness = candidate.completeness_score || 0
  const skillCount = candidate.skills?.length || 0
  const semanticScore = candidate.semantic_similarity || 0
  const apolloScore = candidate.apollo_enrichment_score || 0
  const availabilityScore = candidate.availability_analysis?.availability_score || 0
  
  // Platinum tier: Exceptional candidates with multiple verification sources
  if (score >= 85 && completeness >= 90 && skillCount >= 10 && 
      semanticScore >= 80 && apolloScore >= 50) {
    return 'Platinum'
  }
  
  // Gold tier: High-quality candidates with strong profiles
  if (score >= 75 && completeness >= 80 && skillCount >= 8 && 
      (semanticScore >= 70 || apolloScore >= 30)) {
    return 'Gold'
  }
  
  // Silver tier: Good candidates with decent verification
  if (score >= 60 && completeness >= 60 && skillCount >= 5) {
    return 'Silver'
  }
  
  // Bronze tier: Basic candidates
  return 'Bronze'
}

async function generatePersonalizedOutreach(candidate: any, jobContext: any, openaiApiKey: string): Promise<string | null> {
  try {
    const prompt = `Create a personalized outreach message for this developer:

Candidate: ${candidate.name}
Title: ${candidate.title}
Skills: ${candidate.skills?.join(', ') || 'Not specified'}
Company: ${candidate.current_company || 'Unknown'}
Location: ${candidate.location || 'Unknown'}
Expertise Level: ${candidate.expertise_level || 'Not assessed'}
Availability Signals: ${candidate.availability_analysis?.signals?.join(', ') || 'None detected'}

Job Context:
${JSON.stringify(jobContext, null, 2)}

Create a personalized, professional outreach message that:
1. References their specific expertise and recent work
2. Explains why they're uniquely qualified for this opportunity
3. Highlights specific growth and impact opportunities
4. Includes a respectful, clear call-to-action
5. Demonstrates genuine interest in their career goals

Keep it under 200 words, professional but warm, and avoid generic templated language.`

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
            content: 'You are an expert recruiter who writes personalized, effective outreach messages that respect candidates and focus on mutual career benefit and growth opportunities.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 400
      }),
    })

    if (response.ok) {
      const data = await response.json()
      return data.choices[0].message.content.trim()
    }
    
    return null

  } catch (error) {
    console.error('Error generating personalized outreach:', error)
    return null
  }
}
