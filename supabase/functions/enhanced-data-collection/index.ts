
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
    const { query, location, sources = ['github', 'stackoverflow', 'google', 'linkedin', 'kaggle', 'devto'] } = await req.json()

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log(`Starting Phase 3 enhanced data collection for query: ${query}`)

    const results = {
      github: { candidates: [], total: 0, validated: 0, error: null },
      stackoverflow: { candidates: [], total: 0, validated: 0, error: null },
      google: { candidates: [], total: 0, validated: 0, error: null },
      linkedin: { candidates: [], total: 0, validated: 0, error: null },
      kaggle: { candidates: [], total: 0, validated: 0, error: null },
      devto: { candidates: [], total: 0, validated: 0, error: null }
    }

    // Step 1: Advanced AI query enhancement
    const enhancedQuery = await enhanceQueryWithAdvancedAI(query, openaiApiKey)
    console.log('Phase 3 Enhanced query:', enhancedQuery)

    // Step 2: Parallel data collection with advanced validation
    const collectionPromises = sources.map(async (source) => {
      try {
        console.log(`Phase 3: Collecting from ${source}...`)
        
        const functionName = getFunctionNameForSource(source)
        
        // Collect raw data with extended timeout for quality
        const { data: rawData, error: collectError } = await Promise.race([
          supabase.functions.invoke(functionName, {
            body: { query: enhancedQuery.searchTerms.join(' '), location, enhancedQuery }
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 90000))
        ])

        if (collectError) throw collectError

        const rawCandidates = rawData?.candidates || []
        results[source].total = rawCandidates.length

        console.log(`Phase 3: Collected ${rawCandidates.length} raw candidates from ${source}`)

        // Step 3: Advanced AI validation pipeline
        const validatedCandidates = []
        
        if (rawCandidates.length > 0) {
          for (const candidate of rawCandidates.slice(0, 25)) {
            try {
              // Step 3a: Multi-tier AI validation
              const validationResult = await performAdvancedValidation(candidate, enhancedQuery, openaiApiKey)
              
              if (!validationResult.isValid) {
                console.log(`Phase 3: Candidate ${candidate.name} failed advanced validation: ${validationResult.reason}`)
                continue
              }

              // Step 3b: Perplexity-powered profile enrichment
              let enrichedCandidate = candidate
              if (perplexityApiKey && validationResult.confidence > 0.7) {
                enrichedCandidate = await enrichWithPerplexity(candidate, perplexityApiKey)
              }
              
              // Step 3c: Advanced AI scoring with multiple factors
              const scoredCandidate = await calculateAdvancedScoring(enrichedCandidate, enhancedQuery, openaiApiKey)
              
              // Step 3d: Quality gate with higher standards
              if (scoredCandidate.overall_score >= 60 && scoredCandidate.validation_confidence >= 0.6) {
                // Step 3e: Real-time profile completeness assessment
                const completenessScore = calculateProfileCompleteness(scoredCandidate)
                scoredCandidate.completeness_score = completenessScore
                
                // Step 3f: Market intelligence scoring
                const marketScore = await calculateMarketIntelligence(scoredCandidate, enhancedQuery, openaiApiKey)
                scoredCandidate.market_relevance = marketScore
                
                validatedCandidates.push(scoredCandidate)
              }
            } catch (error) {
              console.error(`Phase 3: Error processing candidate ${candidate.name}:`, error)
            }
          }
        }

        results[source].candidates = validatedCandidates
        results[source].validated = validatedCandidates.length

        // Step 4: Advanced deduplication and storage
        if (validatedCandidates.length > 0) {
          await storeWithAdvancedDeduplication(validatedCandidates, supabase)
        }

      } catch (error) {
        console.error(`Phase 3: ${source} collection error:`, error)
        results[source].error = error.message
      }
    })

    // Wait for all collections to complete
    await Promise.allSettled(collectionPromises)

    const totalCandidates = Object.values(results).reduce((sum, result) => sum + result.total, 0)
    const totalValidated = Object.values(results).reduce((sum, result) => sum + result.validated, 0)

    console.log(`Phase 3 enhanced data collection completed. Total: ${totalCandidates}, High-quality validated: ${totalValidated}`)

    return new Response(
      JSON.stringify({ 
        results,
        total_candidates: totalCandidates,
        total_validated: totalValidated,
        query,
        location,
        enhancement_phase: '3',
        quality_metrics: {
          validation_rate: totalCandidates > 0 ? (totalValidated / totalCandidates * 100).toFixed(1) : 0,
          ai_enhanced: true,
          perplexity_enriched: !!perplexityApiKey
        },
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Phase 3: Error in enhanced data collection:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to perform Phase 3 enhanced data collection' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function getFunctionNameForSource(source) {
  const functionMap = {
    'github': 'collect-github-data',
    'stackoverflow': 'collect-stackoverflow-data',
    'google': 'collect-google-search-data',
    'linkedin': 'collect-linkedin-data',
    'kaggle': 'collect-kaggle-data',
    'devto': 'collect-devto-data'
  }
  
  return functionMap[source] || `collect-${source}-data`
}

function extractJSON(text) {
  try {
    return JSON.parse(text)
  } catch {
    const cleanText = text
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim()
    
    try {
      return JSON.parse(cleanText)
    } catch {
      const start = text.indexOf('{')
      const end = text.lastIndexOf('}')
      if (start !== -1 && end !== -1 && end > start) {
        try {
          return JSON.parse(text.substring(start, end + 1))
        } catch {
          console.error('Failed to parse JSON from text:', text)
          return null
        }
      }
      return null
    }
  }
}

async function enhanceQueryWithAdvancedAI(query, openaiApiKey) {
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
            content: `You are an expert talent acquisition AI with deep knowledge of the tech industry. Parse the user's query and extract comprehensive structured information for advanced candidate search.
            
            Return ONLY a valid JSON object with:
            - skills: array of technical skills (include variations, synonyms)
            - experience_level: junior/mid/senior/lead/principal
            - experience_min: minimum years of experience
            - experience_max: maximum years of experience  
            - location_preferences: array of locations
            - searchTerms: array of optimized search terms for each platform
            - role_types: array of job titles/roles
            - keywords: array of validation keywords
            - industries: array of relevant industries
            - company_types: startup/enterprise/consultancy/remote-first
            - salary_range: estimated salary range object {min, max, currency}
            - must_have_skills: critical skills that are non-negotiable
            - nice_to_have_skills: preferred but optional skills
            - career_level_indicators: words that indicate seniority level`
          },
          { role: 'user', content: query }
        ],
        temperature: 0.2
      }),
    })

    const data = await response.json()
    const content = data.choices[0].message.content
    const parsed = extractJSON(content)
    
    return parsed || {
      skills: [],
      experience_level: 'any',
      experience_min: 0,
      experience_max: 20,
      location_preferences: [],
      searchTerms: [query],
      role_types: [],
      keywords: query.split(' ').filter(w => w.length > 2),
      industries: [],
      company_types: [],
      salary_range: { min: 0, max: 0, currency: 'USD' },
      must_have_skills: [],
      nice_to_have_skills: [],
      career_level_indicators: []
    }
  } catch (error) {
    console.error('Error in advanced query enhancement:', error)
    return {
      skills: [],
      experience_level: 'any',
      experience_min: 0,
      experience_max: 20,
      location_preferences: [],
      searchTerms: [query],
      role_types: [],
      keywords: query.split(' ').filter(w => w.length > 2),
      industries: [],
      company_types: [],
      salary_range: { min: 0, max: 0, currency: 'USD' },
      must_have_skills: [],
      nice_to_have_skills: [],
      career_level_indicators: []
    }
  }
}

async function performAdvancedValidation(candidate, enhancedQuery, openaiApiKey) {
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
            content: `You are a senior technical recruiter and AI validation expert. Perform comprehensive validation of developer profiles against search criteria.

            VALIDATION CRITERIA (Rate each 0-1):
            1. TECHNICAL_RELEVANCE: Skills match and technical depth
            2. PROFILE_AUTHENTICITY: Real professional with substantial profile
            3. EXPERIENCE_ALIGNMENT: Experience level matches requirements  
            4. MARKET_VIABILITY: Currently active and hireable
            5. QUALITY_INDICATORS: Professional achievements and contributions
            6. CULTURAL_FIT: Alignment with role and company culture indicators
            
            STRICT REJECTION CRITERIA:
            - Empty or minimal profiles (< 50 characters total content)
            - No technical skills demonstrated
            - Spam or auto-generated content
            - Completely irrelevant to search criteria
            - Inactive for > 2 years
            - Student-only profiles (unless specifically searching for students)
            
            Return ONLY a JSON object:
            {
              "isValid": boolean,
              "confidence": 0.0-1.0,
              "reason": "detailed explanation",
              "technical_relevance": 0.0-1.0,
              "profile_authenticity": 0.0-1.0,
              "experience_alignment": 0.0-1.0,
              "market_viability": 0.0-1.0,
              "quality_indicators": 0.0-1.0,
              "cultural_fit": 0.0-1.0,
              "red_flags": ["array of concerns"],
              "strengths": ["array of positive indicators"]
            }`
          },
          {
            role: 'user',
            content: `Search criteria: ${JSON.stringify(enhancedQuery)}
            
            Candidate profile:
            Name: ${candidate.name}
            Title: ${candidate.title || 'N/A'}
            Summary: ${candidate.summary || 'N/A'}
            Skills: ${JSON.stringify(candidate.skills || [])}
            Experience: ${candidate.experience_years || 'N/A'} years
            Location: ${candidate.location || 'N/A'}
            Platform: ${candidate.platform || 'Unknown'}
            Last Active: ${candidate.last_active || 'N/A'}
            
            Additional context: ${JSON.stringify({
              github_username: candidate.github_username,
              kaggle_tier: candidate.kaggle_tier,
              linkedin_url: candidate.linkedin_url,
              devto_username: candidate.devto_username,
              stackoverflow_id: candidate.stackoverflow_id
            })}`
          }
        ],
        temperature: 0.1
      }),
    })

    const data = await response.json()
    const content = data.choices[0].message.content
    const result = extractJSON(content)
    
    return result || { isValid: false, confidence: 0, reason: 'Validation failed' }
  } catch (error) {
    console.error('Error in advanced validation:', error)
    return { isValid: false, confidence: 0, reason: 'Validation error' }
  }
}

async function enrichWithPerplexity(candidate, perplexityApiKey) {
  try {
    const searchQuery = buildPerplexityQuery(candidate)
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          {
            role: 'system',
            content: `You are a professional talent researcher. Find and verify additional information about this developer. Focus on recent achievements, current employment, notable projects, and professional reputation. Return only factual, verifiable information in JSON format:
            
            {
              "verified_employment": "current company if found",
              "recent_achievements": ["array of recent accomplishments"],
              "notable_projects": ["array of significant projects"],
              "professional_reputation": "reputation summary",
              "additional_skills": ["verified skills not in original profile"],
              "education": "educational background if found",
              "certifications": ["professional certifications"],
              "speaking_engagements": ["conferences, talks, etc."],
              "publications": ["articles, papers, blog posts"],
              "open_source_contributions": ["major OSS contributions"],
              "verification_confidence": 0.0-1.0,
              "last_verified": "ISO timestamp"
            }`
          },
          {
            role: 'user',
            content: searchQuery
          }
        ],
        temperature: 0.2,
        max_tokens: 1000
      }),
    })

    const data = await response.json()
    const content = data.choices[0].message.content || '{}'
    const enrichmentData = extractJSON(content) || {}
    
    return {
      ...candidate,
      // Merge enriched data
      verified_employment: enrichmentData.verified_employment,
      recent_achievements: enrichmentData.recent_achievements || [],
      notable_projects: enrichmentData.notable_projects || [],
      professional_reputation: enrichmentData.professional_reputation,
      additional_skills: enrichmentData.additional_skills || [],
      education: enrichmentData.education,
      certifications: enrichmentData.certifications || [],
      speaking_engagements: enrichmentData.speaking_engagements || [],
      publications: enrichmentData.publications || [],
      open_source_contributions: enrichmentData.open_source_contributions || [],
      verification_confidence: enrichmentData.verification_confidence || 0.5,
      perplexity_enriched: true,
      last_enriched: new Date().toISOString()
    }
  } catch (error) {
    console.error('Error enriching with Perplexity:', error)
    return { ...candidate, perplexity_enriched: false }
  }
}

function buildPerplexityQuery(candidate) {
  const searchTerms = [
    candidate.name,
    candidate.github_username,
    candidate.title,
    'developer',
    'engineer',
    'programmer'
  ].filter(Boolean)

  return `Find recent professional information about: ${searchTerms.join(' ')} - current employment, recent projects, achievements, reputation in tech community`
}

async function calculateAdvancedScoring(candidate, enhancedQuery, openaiApiKey) {
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
            content: `You are an expert technical recruiter with AI-powered candidate assessment capabilities. Analyze candidates comprehensively across multiple dimensions.

            SCORING FRAMEWORK (0-100 each):
            
            CORE SCORES:
            - overall_score: Holistic assessment (min 50 for valid candidates)
            - skill_match: Technical skills alignment with requirements
            - experience: Experience appropriateness and depth
            - reputation: Professional standing and credibility
            - freshness: Recent activity and market relevance
            - social_proof: Community engagement and recognition
            
            ADVANCED SCORES:
            - technical_depth: Complexity and sophistication of work
            - leadership_potential: Indicators of leadership capability
            - innovation_factor: Creative problem-solving and innovation
            - communication_skills: Writing, speaking, community engagement
            - growth_trajectory: Career progression and learning curve
            - cultural_alignment: Fit with modern development practices
            - market_demand: How in-demand their skills are
            - hiring_probability: Likelihood of successful recruitment
            
            PLATFORM-SPECIFIC BONUSES:
            - GitHub: Repository quality, contribution frequency, code reviews
            - LinkedIn: Professional network, endorsements, company reputation  
            - Kaggle: Competition rankings, dataset quality, community standing
            - Dev.to: Article quality, engagement, technical depth
            - Stack Overflow: Answer quality, reputation, helpful contributions
            
            Return ONLY a JSON object with all scores (0-100) and arrays:
            {
              "overall_score": integer,
              "skill_match": integer,
              "experience": integer,
              "reputation": integer,
              "freshness": integer,
              "social_proof": integer,
              "technical_depth": integer,
              "leadership_potential": integer,
              "innovation_factor": integer,
              "communication_skills": integer,
              "growth_trajectory": integer,
              "cultural_alignment": integer,
              "market_demand": integer,
              "hiring_probability": integer,
              "validation_confidence": 0.0-1.0,
              "risk_flags": ["array of concerns"],
              "strength_indicators": ["array of strengths"],
              "improvement_areas": ["areas for development"],
              "unique_value_props": ["what makes them stand out"]
            }`
          },
          {
            role: 'user',
            content: `Search requirements: ${JSON.stringify(enhancedQuery)}
            
            Candidate profile: ${JSON.stringify(candidate)}`
          }
        ],
        temperature: 0.2
      }),
    })

    const data = await response.json()
    const content = data.choices[0].message.content
    const scores = extractJSON(content) || {}
    
    return {
      ...candidate,
      // Core scores
      overall_score: Math.round(scores.overall_score || 50),
      skill_match: Math.round(scores.skill_match || 50),
      experience: Math.round(scores.experience || 50),
      reputation: Math.round(scores.reputation || 50),
      freshness: Math.round(scores.freshness || 50),
      social_proof: Math.round(scores.social_proof || 50),
      
      // Advanced scores
      technical_depth: Math.round(scores.technical_depth || 50),
      leadership_potential: Math.round(scores.leadership_potential || 50),
      innovation_factor: Math.round(scores.innovation_factor || 50),
      communication_skills: Math.round(scores.communication_skills || 50),
      growth_trajectory: Math.round(scores.growth_trajectory || 50),
      cultural_alignment: Math.round(scores.cultural_alignment || 50),
      market_demand: Math.round(scores.market_demand || 50),
      hiring_probability: Math.round(scores.hiring_probability || 50),
      
      // Validation and insights
      validation_confidence: scores.validation_confidence || 0.5,
      risk_flags: scores.risk_flags || [],
      strength_indicators: scores.strength_indicators || [],
      improvement_areas: scores.improvement_areas || [],
      unique_value_props: scores.unique_value_props || [],
      
      // Metadata
      ai_scored: true,
      scoring_timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('Error in advanced scoring:', error)
    return {
      ...candidate,
      overall_score: 50,
      skill_match: 50,
      experience: 50,
      reputation: 50,
      freshness: 50,
      social_proof: 50,
      technical_depth: 50,
      leadership_potential: 50,
      innovation_factor: 50,
      communication_skills: 50,
      growth_trajectory: 50,
      cultural_alignment: 50,
      market_demand: 50,
      hiring_probability: 50,
      validation_confidence: 0.3,
      risk_flags: ['scoring_error'],
      ai_scored: false
    }
  }
}

function calculateProfileCompleteness(candidate) {
  let score = 0
  const maxScore = 100
  
  // Basic information (30 points)
  if (candidate.name) score += 10
  if (candidate.title) score += 10  
  if (candidate.location) score += 10
  
  // Professional details (40 points)
  if (candidate.summary && candidate.summary.length > 50) score += 15
  if (candidate.skills && candidate.skills.length > 3) score += 15
  if (candidate.experience_years && candidate.experience_years > 0) score += 10
  
  // Contact and links (20 points)
  if (candidate.email) score += 10
  if (candidate.github_username || candidate.linkedin_url || candidate.stackoverflow_id) score += 10
  
  // Additional credibility (10 points)
  if (candidate.verified_employment) score += 5
  if (candidate.certifications && candidate.certifications.length > 0) score += 5
  
  return Math.min(score, maxScore)
}

async function calculateMarketIntelligence(candidate, enhancedQuery, openaiApiKey) {
  try {
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
            content: `Analyze market relevance and demand for this candidate profile. Consider current tech trends, skill demand, geographic factors, and industry needs. Return a score 0-100 and brief analysis.`
          },
          {
            role: 'user',
            content: `Candidate: ${JSON.stringify(candidate)}\nMarket context: ${JSON.stringify(enhancedQuery)}`
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      }),
    })

    const data = await response.json()
    const content = data.choices[0].message.content
    
    // Extract numeric score from response
    const scoreMatch = content.match(/(\d+)/)
    return scoreMatch ? Math.min(parseInt(scoreMatch[1]), 100) : 70
  } catch (error) {
    console.error('Error calculating market intelligence:', error)
    return 70
  }
}

async function storeWithAdvancedDeduplication(candidates, supabase) {
  try {
    for (const candidate of candidates) {
      // Advanced multi-field duplicate detection
      const { data: existing } = await supabase
        .from('candidates')
        .select('id, name, github_username, email, linkedin_url')
        .or(`name.ilike.%${candidate.name}%,github_username.eq.${candidate.github_username || 'null'},email.eq.${candidate.email || 'null'}`)

      if (existing && existing.length > 0) {
        // Update existing record with better data
        const existingCandidate = existing[0]
        const shouldUpdate = candidate.overall_score > (existingCandidate.overall_score || 0)
        
        if (shouldUpdate) {
          console.log(`Updating existing candidate: ${candidate.name} with better data`)
          const { error } = await supabase
            .from('candidates')
            .update({
              ...candidate,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingCandidate.id)
            
          if (error) {
            console.error('Error updating candidate:', error)
          }
        } else {
          console.log(`Skipping duplicate candidate: ${candidate.name}`)
        }
        continue
      }

      // Insert new high-quality candidate
      const candidateData = {
        name: candidate.name,
        title: candidate.title,
        location: candidate.location,
        avatar_url: candidate.avatar_url,
        email: candidate.email,
        github_username: candidate.github_username,
        stackoverflow_id: candidate.stackoverflow_id,
        reddit_username: candidate.reddit_username,
        summary: candidate.summary,
        skills: candidate.skills || [],
        experience_years: candidate.experience_years || 0,
        last_active: candidate.last_active,
        
        // Enhanced scoring data
        overall_score: Math.round(candidate.overall_score || 0),
        skill_match: Math.round(candidate.skill_match || 0),
        experience: Math.round(candidate.experience || 0),
        reputation: Math.round(candidate.reputation || 0),
        freshness: Math.round(candidate.freshness || 0),
        social_proof: Math.round(candidate.social_proof || 0),
        risk_flags: candidate.risk_flags || []
      }

      const { error } = await supabase
        .from('candidates')
        .insert(candidateData)

      if (error) {
        console.error('Error storing candidate:', error)
      } else {
        console.log(`Successfully stored high-quality candidate: ${candidate.name} (Score: ${candidate.overall_score})`)
      }
    }
  } catch (error) {
    console.error('Error in advanced deduplication storage:', error)
  }
}
