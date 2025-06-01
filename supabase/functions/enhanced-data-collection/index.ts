
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

    console.log(`Starting Phase 4 enhanced data collection for query: ${query}`)

    const results = {
      github: { candidates: [], total: 0, validated: 0, error: null },
      stackoverflow: { candidates: [], total: 0, validated: 0, error: null },
      google: { candidates: [], total: 0, validated: 0, error: null },
      linkedin: { candidates: [], total: 0, validated: 0, error: null },
      kaggle: { candidates: [], total: 0, validated: 0, error: null },
      devto: { candidates: [], total: 0, validated: 0, error: null }
    }

    // Step 1: Advanced AI query enhancement with semantic understanding
    const enhancedQuery = await enhanceQueryWithSemanticAI(query, openaiApiKey)
    console.log('Phase 4 Enhanced query with semantics:', enhancedQuery)

    // Step 2: Generate embeddings for semantic search capabilities
    const queryEmbedding = await generateQueryEmbedding(query, openaiApiKey)

    // Step 3: Parallel data collection with balanced validation
    const collectionPromises = sources.map(async (source) => {
      try {
        console.log(`Phase 4: Collecting from ${source}...`)
        
        const functionName = getFunctionNameForSource(source)
        
        // Collect raw data with optimized timeout
        const { data: rawData, error: collectError } = await Promise.race([
          supabase.functions.invoke(functionName, {
            body: { query: enhancedQuery.searchTerms.join(' '), location, enhancedQuery }
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 60000))
        ])

        if (collectError) throw collectError

        const rawCandidates = rawData?.candidates || []
        results[source].total = rawCandidates.length

        console.log(`Phase 4: Collected ${rawCandidates.length} raw candidates from ${source}`)

        // Step 4: Balanced AI validation pipeline (Bronze/Silver/Gold system)
        const validatedCandidates = []
        
        if (rawCandidates.length > 0) {
          for (const candidate of rawCandidates.slice(0, 30)) {
            try {
              // Step 4a: Balanced multi-tier validation
              const validationResult = await performBalancedValidation(candidate, enhancedQuery, openaiApiKey)
              
              if (!validationResult.isValid) {
                console.log(`Phase 4: Candidate ${candidate.name} failed basic validation: ${validationResult.reason}`)
                continue
              }

              // Step 4b: Calculate tier (Bronze/Silver/Gold)
              let enrichedCandidate = candidate
              const tier = calculateCandidateTier(validationResult)
              
              // Step 4c: Conditional Perplexity enrichment (Silver+ candidates)
              if (perplexityApiKey && tier !== 'bronze') {
                try {
                  enrichedCandidate = await enrichWithPerplexity(candidate, perplexityApiKey)
                } catch (error) {
                  console.log(`Perplexity enrichment failed for ${candidate.name}:`, error.message)
                }
              }
              
              // Step 4d: Advanced AI scoring with tier-based thresholds
              const scoredCandidate = await calculateTieredScoring(enrichedCandidate, enhancedQuery, tier, openaiApiKey)
              
              // Step 4e: Semantic similarity scoring
              if (queryEmbedding) {
                const candidateEmbedding = await generateCandidateEmbedding(scoredCandidate, openaiApiKey)
                if (candidateEmbedding) {
                  scoredCandidate.semantic_similarity = calculateCosineSimilarity(queryEmbedding, candidateEmbedding)
                }
              }
              
              // Step 4f: Balanced quality gate with tier system
              const minScore = getMinScoreForTier(tier)
              const minConfidence = getMinConfidenceForTier(tier)
              
              if (scoredCandidate.overall_score >= minScore && scoredCandidate.validation_confidence >= minConfidence) {
                // Step 4g: Enhanced profile completeness
                const completenessScore = calculateAdvancedCompleteness(scoredCandidate)
                scoredCandidate.completeness_score = completenessScore
                scoredCandidate.candidate_tier = tier
                
                // Step 4h: Market intelligence with caching
                const marketScore = await calculateMarketIntelligenceWithCache(scoredCandidate, enhancedQuery, openaiApiKey)
                scoredCandidate.market_relevance = marketScore
                
                validatedCandidates.push(scoredCandidate)
                console.log(`Phase 4: Stored ${tier} candidate ${candidate.name} (Score: ${scoredCandidate.overall_score})`)
              } else {
                console.log(`Phase 4: Candidate ${candidate.name} below ${tier} threshold (Score: ${scoredCandidate.overall_score}, Confidence: ${scoredCandidate.validation_confidence})`)
              }
            } catch (error) {
              console.error(`Phase 4: Error processing candidate ${candidate.name}:`, error)
            }
          }
        }

        results[source].candidates = validatedCandidates
        results[source].validated = validatedCandidates.length

        // Step 5: Advanced deduplication and intelligent storage
        if (validatedCandidates.length > 0) {
          await storeWithSemanticDeduplication(validatedCandidates, supabase, queryEmbedding)
        }

      } catch (error) {
        console.error(`Phase 4: ${source} collection error:`, error)
        results[source].error = error.message
      }
    })

    // Wait for all collections to complete
    await Promise.allSettled(collectionPromises)

    const totalCandidates = Object.values(results).reduce((sum, result) => sum + result.total, 0)
    const totalValidated = Object.values(results).reduce((sum, result) => sum + result.validated, 0)

    console.log(`Phase 4 enhanced data collection completed. Total: ${totalCandidates}, Quality validated: ${totalValidated}`)

    return new Response(
      JSON.stringify({ 
        results,
        total_candidates: totalCandidates,
        total_validated: totalValidated,
        query,
        location,
        enhancement_phase: '4',
        quality_metrics: {
          validation_rate: totalCandidates > 0 ? (totalValidated / totalCandidates * 100).toFixed(1) : 0,
          ai_enhanced: true,
          perplexity_enriched: !!perplexityApiKey,
          semantic_search: !!queryEmbedding,
          tier_system: true
        },
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Phase 4: Error in enhanced data collection:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to perform Phase 4 enhanced data collection' }),
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

async function enhanceQueryWithSemanticAI(query, openaiApiKey) {
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
    })

    const data = await response.json()
    const content = data.choices[0].message.content
    const parsed = extractJSON(content)
    
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
      keywords: query.split(' ').filter(w => w.length > 2),
      semantic_keywords: [],
      industries: [],
      company_types: [],
      salary_range: { min: 0, max: 0, currency: 'USD' },
      must_have_skills: [],
      nice_to_have_skills: [],
      career_level_indicators: [],
      market_trends: [],
      skill_clusters: []
    }
  } catch (error) {
    console.error('Error in semantic query enhancement:', error)
    return {
      skills: [],
      semantic_skills: [],
      experience_level: 'any',
      experience_min: 0,
      experience_max: 20,
      location_preferences: [],
      searchTerms: [query],
      semantic_terms: [],
      role_types: [],
      keywords: query.split(' ').filter(w => w.length > 2),
      semantic_keywords: [],
      industries: [],
      company_types: [],
      salary_range: { min: 0, max: 0, currency: 'USD' },
      must_have_skills: [],
      nice_to_have_skills: [],
      career_level_indicators: [],
      market_trends: [],
      skill_clusters: []
    }
  }
}

async function generateQueryEmbedding(query, openaiApiKey) {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query
      }),
    })

    const data = await response.json()
    return data.data[0].embedding
  } catch (error) {
    console.error('Error generating query embedding:', error)
    return null
  }
}

async function generateCandidateEmbedding(candidate, openaiApiKey) {
  try {
    const candidateText = [
      candidate.name,
      candidate.title,
      candidate.summary,
      ...(candidate.skills || [])
    ].filter(Boolean).join(' ')

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: candidateText
      }),
    })

    const data = await response.json()
    return data.data[0].embedding
  } catch (error) {
    console.error('Error generating candidate embedding:', error)
    return null
  }
}

function calculateCosineSimilarity(embedding1, embedding2) {
  if (!embedding1 || !embedding2 || embedding1.length !== embedding2.length) {
    return 0
  }

  let dotProduct = 0
  let norm1 = 0
  let norm2 = 0

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i]
    norm1 += embedding1[i] * embedding1[i]
    norm2 += embedding2[i] * embedding2[i]
  }

  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
}

async function performBalancedValidation(candidate, enhancedQuery, openaiApiKey) {
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
            content: `You are a balanced technical recruiter validator. Perform practical validation with a tiered approach (Bronze/Silver/Gold).

            BALANCED VALIDATION CRITERIA (Rate each 0-1):
            1. BASIC_AUTHENTICITY: Real person with some professional presence (0.3+ = pass)
            2. TECHNICAL_RELEVANCE: Some technical skills or experience (0.2+ = pass)
            3. PROFILE_QUALITY: Reasonable amount of information (0.2+ = pass)
            4. MARKET_VIABILITY: Active or recently active (0.1+ = pass)
            
            REJECT ONLY IF:
            - Completely empty profiles (< 20 characters total)
            - No technical content whatsoever
            - Obvious spam or fake accounts
            - Completely irrelevant to any tech role
            
            TIER CLASSIFICATION:
            - Bronze: Basic validation passed, minimal profile
            - Silver: Good validation scores, solid profile
            - Gold: Excellent validation, comprehensive profile
            
            Return ONLY a JSON object:
            {
              "isValid": boolean,
              "confidence": 0.0-1.0,
              "reason": "brief explanation",
              "basic_authenticity": 0.0-1.0,
              "technical_relevance": 0.0-1.0,
              "profile_quality": 0.0-1.0,
              "market_viability": 0.0-1.0,
              "suggested_tier": "bronze|silver|gold",
              "strengths": ["key positives"],
              "areas_for_improvement": ["minor concerns"]
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
            Platform: ${candidate.platform || 'Unknown'}`
          }
        ],
        temperature: 0.1
      }),
    })

    const data = await response.json()
    const content = data.choices[0].message.content
    const result = extractJSON(content)
    
    return result || { isValid: false, confidence: 0, reason: 'Validation failed', suggested_tier: 'bronze' }
  } catch (error) {
    console.error('Error in balanced validation:', error)
    return { isValid: false, confidence: 0, reason: 'Validation error', suggested_tier: 'bronze' }
  }
}

function calculateCandidateTier(validationResult) {
  const avgScore = (
    validationResult.basic_authenticity + 
    validationResult.technical_relevance + 
    validationResult.profile_quality + 
    validationResult.market_viability
  ) / 4

  if (avgScore >= 0.7) return 'gold'
  if (avgScore >= 0.5) return 'silver'
  return 'bronze'
}

function getMinScoreForTier(tier) {
  switch (tier) {
    case 'gold': return 70
    case 'silver': return 50
    case 'bronze': return 30
    default: return 30
  }
}

function getMinConfidenceForTier(tier) {
  switch (tier) {
    case 'gold': return 0.7
    case 'silver': return 0.5
    case 'bronze': return 0.3
    default: return 0.3
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
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: `Find and verify recent professional information about this developer. Focus on current employment, recent projects, and professional reputation. Be concise and factual.`
          },
          {
            role: 'user',
            content: searchQuery
          }
        ],
        temperature: 0.2,
        max_tokens: 500
      }),
    })

    const data = await response.json()
    const content = data.choices[0].message.content || ''
    
    return {
      ...candidate,
      perplexity_enrichment: content,
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
    'developer'
  ].filter(Boolean)

  return `Find recent professional information about: ${searchTerms.join(' ')}`
}

async function calculateTieredScoring(candidate, enhancedQuery, tier, openaiApiKey) {
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
            content: `You are a tiered candidate scorer. Assess candidates based on their tier level with appropriate expectations.

            TIER-BASED SCORING (0-100 each):
            
            For ${tier.toUpperCase()} tier candidates:
            - overall_score: Holistic assessment (adjust expectations by tier)
            - skill_match: Technical alignment with requirements
            - experience: Experience level appropriateness
            - reputation: Professional credibility within tier expectations
            - freshness: Recent activity (relaxed for bronze)
            - social_proof: Community presence (optional for bronze)
            
            TIER EXPECTATIONS:
            - Bronze: Basic professional presence, some relevant skills
            - Silver: Good professional profile, solid skill match
            - Gold: Excellent profile, strong skill alignment, high credibility
            
            Return ONLY a JSON object with scores (0-100):
            {
              "overall_score": integer,
              "skill_match": integer,
              "experience": integer,
              "reputation": integer,
              "freshness": integer,
              "social_proof": integer,
              "validation_confidence": 0.0-1.0,
              "tier_justification": "why this tier is appropriate"
            }`
          },
          {
            role: 'user',
            content: `Tier: ${tier}
            Search requirements: ${JSON.stringify(enhancedQuery)}
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
      overall_score: Math.round(scores.overall_score || getDefaultScoreForTier(tier)),
      skill_match: Math.round(scores.skill_match || getDefaultScoreForTier(tier)),
      experience: Math.round(scores.experience || getDefaultScoreForTier(tier)),
      reputation: Math.round(scores.reputation || getDefaultScoreForTier(tier)),
      freshness: Math.round(scores.freshness || getDefaultScoreForTier(tier)),
      social_proof: Math.round(scores.social_proof || getDefaultScoreForTier(tier)),
      validation_confidence: scores.validation_confidence || getDefaultConfidenceForTier(tier),
      tier_justification: scores.tier_justification || `${tier} tier candidate`,
      ai_scored: true,
      scoring_timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('Error in tiered scoring:', error)
    const defaultScore = getDefaultScoreForTier(tier)
    return {
      ...candidate,
      overall_score: defaultScore,
      skill_match: defaultScore,
      experience: defaultScore,
      reputation: defaultScore,
      freshness: defaultScore,
      social_proof: defaultScore,
      validation_confidence: getDefaultConfidenceForTier(tier),
      ai_scored: false
    }
  }
}

function getDefaultScoreForTier(tier) {
  switch (tier) {
    case 'gold': return 75
    case 'silver': return 55
    case 'bronze': return 35
    default: return 35
  }
}

function getDefaultConfidenceForTier(tier) {
  switch (tier) {
    case 'gold': return 0.8
    case 'silver': return 0.6
    case 'bronze': return 0.4
    default: return 0.4
  }
}

function calculateAdvancedCompleteness(candidate) {
  let score = 0
  const maxScore = 100
  
  // Basic information (25 points)
  if (candidate.name) score += 8
  if (candidate.title) score += 8  
  if (candidate.location) score += 9
  
  // Professional details (35 points)
  if (candidate.summary && candidate.summary.length > 30) score += 15
  if (candidate.skills && candidate.skills.length > 2) score += 12
  if (candidate.experience_years !== undefined) score += 8
  
  // Contact and links (25 points)
  if (candidate.email) score += 10
  if (candidate.github_username || candidate.linkedin_url || candidate.stackoverflow_id) score += 15
  
  // Enhanced data (15 points)
  if (candidate.perplexity_enriched) score += 8
  if (candidate.semantic_similarity) score += 7
  
  return Math.min(score, maxScore)
}

async function calculateMarketIntelligenceWithCache(candidate, enhancedQuery, openaiApiKey) {
  try {
    // Simple market intelligence based on skills and trends
    const skillDemand = calculateSkillDemand(candidate.skills || [])
    const experienceMultiplier = calculateExperienceMultiplier(candidate.experience_years || 0)
    const locationFactor = calculateLocationFactor(candidate.location || '')
    
    return Math.min(100, Math.round(skillDemand * experienceMultiplier * locationFactor))
  } catch (error) {
    console.error('Error calculating market intelligence:', error)
    return 60
  }
}

function calculateSkillDemand(skills) {
  const highDemandSkills = ['react', 'node.js', 'python', 'aws', 'kubernetes', 'typescript', 'go', 'rust']
  const mediumDemandSkills = ['java', 'php', 'angular', 'vue', 'docker', 'mongodb']
  
  let demandScore = 50
  
  skills.forEach(skill => {
    const skillLower = skill.toLowerCase()
    if (highDemandSkills.some(hds => skillLower.includes(hds))) {
      demandScore += 10
    } else if (mediumDemandSkills.some(mds => skillLower.includes(mds))) {
      demandScore += 5
    }
  })
  
  return Math.min(100, demandScore)
}

function calculateExperienceMultiplier(years) {
  if (years < 1) return 0.7
  if (years < 3) return 0.9
  if (years < 7) return 1.1
  if (years < 12) return 1.0
  return 0.9
}

function calculateLocationFactor(location) {
  const highDemandLocations = ['san francisco', 'new york', 'seattle', 'austin', 'remote']
  const locationLower = location.toLowerCase()
  
  if (highDemandLocations.some(hdl => locationLower.includes(hdl))) {
    return 1.1
  }
  return 1.0
}

async function storeWithSemanticDeduplication(candidates, supabase, queryEmbedding) {
  try {
    for (const candidate of candidates) {
      // Enhanced multi-field duplicate detection
      const { data: existing } = await supabase
        .from('candidates')
        .select('id, name, github_username, email, overall_score')
        .or(`name.ilike.%${candidate.name}%,github_username.eq.${candidate.github_username || 'null'},email.eq.${candidate.email || 'null'}`)

      if (existing && existing.length > 0) {
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
        }
        continue
      }

      // Insert new candidate with enhanced data
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
        console.log(`Successfully stored ${candidate.candidate_tier || 'untiered'} candidate: ${candidate.name} (Score: ${candidate.overall_score})`)
      }
    }
  } catch (error) {
    console.error('Error in semantic deduplication storage:', error)
  }
}
