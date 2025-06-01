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

    console.log(`Starting Phase 2.5 enhanced multi-source data collection for query: ${query}`)

    const results = {
      github: { candidates: [], total: 0, validated: 0, error: null },
      stackoverflow: { candidates: [], total: 0, validated: 0, error: null },
      google: { candidates: [], total: 0, validated: 0, error: null },
      linkedin: { candidates: [], total: 0, validated: 0, error: null },
      'linkedin-cross-platform': { candidates: [], total: 0, validated: 0, error: null },
      kaggle: { candidates: [], total: 0, validated: 0, error: null },
      devto: { candidates: [], total: 0, validated: 0, error: null }
    }

    // Step 1: Enhanced semantic query analysis
    const enhancedQuery = await enhanceQueryWithSemanticAI(query, openaiApiKey)
    console.log('Phase 2.5 Enhanced query with advanced semantics:', enhancedQuery)

    // Step 2: Generate embeddings for semantic search
    const queryEmbedding = await generateQueryEmbedding(query, openaiApiKey)

    // Step 3: Enhanced parallel data collection with improved strategies
    const collectionPromises = sources.map(async (source) => {
      try {
        console.log(`Phase 2.5: Enhanced collection from ${source}...`)
        
        let functionName = getFunctionNameForSource(source)
        let rawData, collectError
        
        // Use enhanced GitHub function
        if (source === 'github') {
          ({ data: rawData, error: collectError } = await Promise.race([
            supabase.functions.invoke('collect-github-data', {
              body: { query: enhancedQuery.searchTerms.join(' '), location, enhancedQuery }
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 90000))
          ]))
        }
        // Use enhanced Stack Overflow function  
        else if (source === 'stackoverflow') {
          ({ data: rawData, error: collectError } = await Promise.race([
            supabase.functions.invoke('collect-stackoverflow-data', {
              body: { query: enhancedQuery.searchTerms.join(' '), location, enhancedQuery }
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 75000))
          ]))
        }
        // Standard collection for other sources
        else {
          ({ data: rawData, error: collectError } = await Promise.race([
            supabase.functions.invoke(functionName, {
              body: { query: enhancedQuery.searchTerms.join(' '), location, enhancedQuery }
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 60000))
          ]))
        }

        if (collectError) throw collectError

        const rawCandidates = rawData?.candidates || []
        results[source].total = rawCandidates.length

        console.log(`Phase 2.5: Collected ${rawCandidates.length} enhanced candidates from ${source}`)

        // Enhanced statistics logging
        if (rawData?.enhancement_stats) {
          console.log(`${source} enhancement stats:`, rawData.enhancement_stats)
        }

        // Step 4: Enhanced AI validation with improved efficiency
        const validatedCandidates = []
        
        if (rawCandidates.length > 0) {
          for (const candidate of rawCandidates.slice(0, 35)) { // Increased limit for better results
            try {
              // Enhanced validation with platform-specific adjustments
              const validationResult = await performEnhancedValidation(candidate, enhancedQuery, source, openaiApiKey)
              
              if (!validationResult.isValid) {
                console.log(`Phase 2.5: Candidate ${candidate.name} failed enhanced validation: ${validationResult.reason}`)
                continue
              }

              // Enhanced tier calculation with platform weighting
              let enrichedCandidate = candidate
              const tier = calculateEnhancedCandidateTier(validationResult, source)
              
              // Selective Perplexity enrichment for high-value candidates
              if (perplexityApiKey && (tier === 'gold' || (tier === 'silver' && Math.random() > 0.5))) {
                try {
                  enrichedCandidate = await enrichWithPerplexity(candidate, perplexityApiKey)
                } catch (error) {
                  console.log(`Perplexity enrichment failed for ${candidate.name}:`, error.message)
                }
              }
              
              // Enhanced scoring with platform and discovery method bonuses
              const scoredCandidate = await calculateEnhancedTieredScoring(enrichedCandidate, enhancedQuery, tier, source, openaiApiKey)
              
              // Enhanced semantic similarity
              if (queryEmbedding) {
                const candidateEmbedding = await generateCandidateEmbedding(scoredCandidate, openaiApiKey)
                if (candidateEmbedding) {
                  scoredCandidate.semantic_similarity = calculateCosineSimilarity(queryEmbedding, candidateEmbedding)
                }
              }
              
              // Enhanced quality gates with platform-specific thresholds
              const minScore = getEnhancedMinScoreForTier(tier, source)
              const minConfidence = getEnhancedMinConfidenceForTier(tier, source)
              
              if (scoredCandidate.overall_score >= minScore && scoredCandidate.validation_confidence >= minConfidence) {
                // Enhanced profile completeness
                const completenessScore = calculateAdvancedCompleteness(scoredCandidate)
                scoredCandidate.completeness_score = completenessScore
                scoredCandidate.candidate_tier = tier
                scoredCandidate.collection_phase = '2.5'
                
                // Platform-specific bonuses
                scoredCandidate = applyPlatformSpecificBonuses(scoredCandidate, source, rawData)
                
                // Enhanced market intelligence
                const marketScore = await calculateMarketIntelligenceWithCache(scoredCandidate, enhancedQuery, openaiApiKey)
                scoredCandidate.market_relevance = marketScore
                
                validatedCandidates.push(scoredCandidate)
                console.log(`Phase 2.5: Validated ${tier} candidate ${candidate.name} from ${source} (Score: ${scoredCandidate.overall_score})`)
              } else {
                console.log(`Phase 2.5: Candidate ${candidate.name} below enhanced ${tier} threshold (Score: ${scoredCandidate.overall_score}, Confidence: ${scoredCandidate.validation_confidence})`)
              }
            } catch (error) {
              console.error(`Phase 2.5: Error processing candidate ${candidate.name}:`, error)
            }
          }
        }

        results[source].candidates = validatedCandidates
        results[source].validated = validatedCandidates.length

        // Enhanced storage with cross-platform correlation
        if (validatedCandidates.length > 0) {
          await storeWithEnhancedDeduplication(validatedCandidates, supabase, queryEmbedding, source)
        }

      } catch (error) {
        console.error(`Phase 2.5: ${source} collection error:`, error)
        results[source].error = error.message
      }
    })

    // Step 4: Add LinkedIn cross-platform discovery as separate process
    const crossPlatformPromise = (async () => {
      try {
        console.log('Phase 2.5: Starting LinkedIn cross-platform discovery...')
        
        const { data: crossPlatformData, error: crossPlatformError } = await Promise.race([
          supabase.functions.invoke('collect-linkedin-cross-platform', {
            body: { query: enhancedQuery.searchTerms.join(' '), location, enhancedQuery, crossPlatformData: true }
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 120000))
        ])

        if (crossPlatformError) throw crossPlatformError

        const crossPlatformCandidates = crossPlatformData?.candidates || []
        results['linkedin-cross-platform'].total = crossPlatformCandidates.length
        results['linkedin-cross-platform'].candidates = crossPlatformCandidates
        results['linkedin-cross-platform'].validated = crossPlatformCandidates.length

        console.log(`Phase 2.5: Cross-platform LinkedIn discovery found ${crossPlatformCandidates.length} candidates`)

        if (crossPlatformData?.discovery_stats) {
          console.log('Cross-platform discovery stats:', crossPlatformData.discovery_stats)
        }

      } catch (error) {
        console.error('Phase 2.5: LinkedIn cross-platform discovery error:', error)
        results['linkedin-cross-platform'].error = error.message
      }
    })()

    // Wait for all collections to complete
    await Promise.allSettled([...collectionPromises, crossPlatformPromise])

    const totalCandidates = Object.values(results).reduce((sum, result) => sum + result.total, 0)
    const totalValidated = Object.values(results).reduce((sum, result) => sum + result.validated, 0)

    console.log(`Phase 2.5 enhanced collection completed. Total: ${totalCandidates}, Quality validated: ${totalValidated}`)

    return new Response(
      JSON.stringify({ 
        results,
        total_candidates: totalCandidates,
        total_validated: totalValidated,
        query,
        location,
        enhancement_phase: '2.5',
        quality_metrics: {
          validation_rate: totalCandidates > 0 ? (totalValidated / totalCandidates * 100).toFixed(1) : 0,
          ai_enhanced: true,
          perplexity_enriched: !!perplexityApiKey,
          semantic_search: !!queryEmbedding,
          tier_system: true,
          github_readme_crawling: results.github.candidates.filter(c => c.readme_email_found).length > 0,
          stackoverflow_expertise_focus: results.stackoverflow.candidates.filter(c => c.expertise_score > 70).length > 0,
          linkedin_cross_platform: results['linkedin-cross-platform'].validated > 0
        },
        enhancement_stats: {
          platform_specific_bonuses_applied: totalValidated,
          cross_platform_correlations: results['linkedin-cross-platform'].validated,
          readme_emails_found: results.github.candidates.filter(c => c.readme_email_found).length,
          expertise_level_candidates: Object.values(results)
            .flatMap(r => r.candidates)
            .filter(c => c.expertise_score > 70 || c.language_expertise > 70).length
        },
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Phase 2.5: Error in enhanced multi-source data collection:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to perform Phase 2.5 enhanced data collection' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

// Enhanced validation with platform-specific considerations
async function performEnhancedValidation(candidate, enhancedQuery, platform, openaiApiKey) {
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
            content: `You are an enhanced technical recruiter validator specialized in ${platform} profiles. Perform platform-aware validation with enhanced criteria.

            ENHANCED VALIDATION CRITERIA for ${platform.toUpperCase()}:
            1. BASIC_AUTHENTICITY: Real person with professional presence (0.2+ = pass)
            2. TECHNICAL_RELEVANCE: Technical skills and experience (0.3+ = pass) 
            3. PROFILE_QUALITY: Information depth and completeness (0.3+ = pass)
            4. PLATFORM_ACTIVITY: Recent and meaningful activity (0.2+ = pass)
            
            PLATFORM-SPECIFIC BONUSES:
            - GitHub: Repository quality, language expertise, README emails
            - Stack Overflow: Answer quality, reputation, expertise scores
            - LinkedIn: Professional completeness, cross-platform correlation
            
            Enhanced TIER CLASSIFICATION:
            - Bronze: Basic validation passed, shows promise (lower bar for emerging talent)
            - Silver: Good validation scores, solid professional profile
            - Gold: Excellent validation, comprehensive expertise demonstration
            
            Return ONLY a JSON object:
            {
              "isValid": boolean,
              "confidence": 0.0-1.0,
              "reason": "brief explanation",
              "basic_authenticity": 0.0-1.0,
              "technical_relevance": 0.0-1.0,
              "profile_quality": 0.0-1.0,
              "platform_activity": 0.0-1.0,
              "suggested_tier": "bronze|silver|gold",
              "platform_specific_bonus": 0.0-0.2,
              "strengths": ["key positives"],
              "enhancement_potential": ["growth areas"]
            }`
          },
          {
            role: 'user',
            content: `Platform: ${platform}
            Search criteria: ${JSON.stringify(enhancedQuery)}
            
            Candidate profile:
            Name: ${candidate.name}
            Title: ${candidate.title || 'N/A'}
            Summary: ${candidate.summary || 'N/A'}
            Skills: ${JSON.stringify(candidate.skills || [])}
            Experience: ${candidate.experience_years || 'N/A'} years
            Location: ${candidate.location || 'N/A'}
            
            Platform-specific data:
            ${platform === 'github' ? `Repositories: ${candidate.github_username ? 'Yes' : 'No'}, README email: ${candidate.readme_email_found ? 'Found' : 'Not found'}` : ''}
            ${platform === 'stackoverflow' ? `Reputation: ${candidate.reputation || 'N/A'}, Expertise score: ${candidate.expertise_score || 'N/A'}` : ''}
            ${platform === 'linkedin' ? `Cross-platform match: ${candidate.cross_platform_match ? 'Yes' : 'No'}, Discovery method: ${candidate.discovery_method || 'N/A'}` : ''}
            `
          }
        ],
        temperature: 0.1
      }),
    })

    const data = await response.json()
    const content = data.choices[0].message.content
    const result = extractJSON(content)
    
    return result || { isValid: false, confidence: 0, reason: 'Enhanced validation failed', suggested_tier: 'bronze' }
  } catch (error) {
    console.error('Error in enhanced validation:', error)
    return { isValid: false, confidence: 0, reason: 'Enhanced validation error', suggested_tier: 'bronze' }
  }
}

// Enhanced tier calculation with platform considerations
function calculateEnhancedCandidateTier(validationResult, platform) {
  let baseScore = (
    validationResult.basic_authenticity + 
    validationResult.technical_relevance + 
    validationResult.profile_quality + 
    validationResult.platform_activity
  ) / 4
  
  // Add platform-specific bonus
  baseScore += (validationResult.platform_specific_bonus || 0)
  
  // Platform-specific adjustments
  if (platform === 'github' && baseScore >= 0.6) return 'gold'
  if (platform === 'stackoverflow' && baseScore >= 0.65) return 'gold'
  if (platform === 'linkedin' && baseScore >= 0.7) return 'gold'
  
  if (baseScore >= 0.6) return 'gold'
  if (baseScore >= 0.45) return 'silver'
  return 'bronze'
}

// Enhanced scoring with platform and discovery bonuses
async function calculateEnhancedTieredScoring(candidate, enhancedQuery, tier, platform, openaiApiKey) {
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
            content: `You are an enhanced tiered candidate scorer for ${platform}. Apply tier-appropriate expectations with platform-specific bonuses.

            ENHANCED SCORING for ${tier.toUpperCase()} tier on ${platform.toUpperCase()} (0-100 each):
            
            Base Scores:
            - overall_score: Holistic assessment with platform context
            - skill_match: Technical alignment (boosted for ${platform} specific skills)
            - experience: Experience appropriateness with platform validation
            - reputation: Professional credibility with platform authority
            - freshness: Recent activity (platform-specific interpretation)
            - social_proof: Community presence (platform network effects)
            
            Platform Bonuses:
            - GitHub: Repository quality, language expertise, contribution patterns
            - Stack Overflow: Answer quality, expertise depth, community impact  
            - LinkedIn: Professional completeness, cross-platform verification
            
            TIER EXPECTATIONS:
            - Bronze: Promising candidate with growth potential, lower barriers
            - Silver: Solid professional with good platform presence
            - Gold: Exceptional candidate with strong platform authority
            
            Return ONLY a JSON object with enhanced scores (0-100):
            {
              "overall_score": integer,
              "skill_match": integer,
              "experience": integer,
              "reputation": integer,
              "freshness": integer,
              "social_proof": integer,
              "validation_confidence": 0.0-1.0,
              "platform_bonus": 0-15,
              "tier_justification": "why this tier is appropriate"
            }`
          },
          {
            role: 'user',
            content: `Platform: ${platform}
            Tier: ${tier}
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
      overall_score: Math.round(scores.overall_score || getEnhancedDefaultScoreForTier(tier, platform)),
      skill_match: Math.round(scores.skill_match || getEnhancedDefaultScoreForTier(tier, platform)),
      experience: Math.round(scores.experience || getEnhancedDefaultScoreForTier(tier, platform)),
      reputation: Math.round(scores.reputation || getEnhancedDefaultScoreForTier(tier, platform)),
      freshness: Math.round(scores.freshness || getEnhancedDefaultScoreForTier(tier, platform)),
      social_proof: Math.round(scores.social_proof || getEnhancedDefaultScoreForTier(tier, platform)),
      validation_confidence: scores.validation_confidence || getEnhancedDefaultConfidenceForTier(tier, platform),
      platform_bonus: Math.round(scores.platform_bonus || 0),
      tier_justification: scores.tier_justification || `Enhanced ${tier} tier candidate from ${platform}`,
      ai_scored: true,
      enhanced_scoring: true,
      scoring_timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('Error in enhanced tiered scoring:', error)
    const defaultScore = getEnhancedDefaultScoreForTier(tier, platform)
    return {
      ...candidate,
      overall_score: defaultScore,
      skill_match: defaultScore,
      experience: defaultScore,
      reputation: defaultScore,
      freshness: defaultScore,
      social_proof: defaultScore,
      validation_confidence: getEnhancedDefaultConfidenceForTier(tier, platform),
      ai_scored: false,
      enhanced_scoring: false
    }
  }
}

// Enhanced minimum scores with platform consideration
function getEnhancedMinScoreForTier(tier, platform) {
  const baseScores = {
    'gold': 70,
    'silver': 50, 
    'bronze': 30
  }
  
  // Platform adjustments (GitHub and SO get slight bonus for technical validation)
  const platformBonus = ['github', 'stackoverflow'].includes(platform) ? 5 : 0
  
  return (baseScores[tier] || 30) - platformBonus
}

function getEnhancedMinConfidenceForTier(tier, platform) {
  const baseConfidence = {
    'gold': 0.7,
    'silver': 0.5,
    'bronze': 0.3
  }
  
  return baseConfidence[tier] || 0.3
}

function getEnhancedDefaultScoreForTier(tier, platform) {
  const baseScores = {
    'gold': 75,
    'silver': 55,
    'bronze': 35
  }
  
  const platformBonus = ['github', 'stackoverflow'].includes(platform) ? 5 : 0
  return (baseScores[tier] || 35) + platformBonus
}

function getEnhancedDefaultConfidenceForTier(tier, platform) {
  const baseConfidence = {
    'gold': 0.8,
    'silver': 0.6,
    'bronze': 0.4
  }
  
  return baseConfidence[tier] || 0.4
}

// Apply platform-specific bonuses
function applyPlatformSpecificBonuses(candidate, platform, rawData) {
  if (platform === 'github') {
    // GitHub-specific bonuses
    if (candidate.readme_email_found) {
      candidate.overall_score += 3
      candidate.contact_discovery_bonus = 3
    }
    if (candidate.language_expertise > 70) {
      candidate.overall_score += 5
      candidate.language_expertise_bonus = 5
    }
  } else if (platform === 'stackoverflow') {
    // Stack Overflow-specific bonuses
    if (candidate.expertise_score > 70) {
      candidate.overall_score += 5
      candidate.expertise_bonus = 5
    }
    if (candidate.answer_quality_score > 70) {
      candidate.overall_score += 3
      candidate.answer_quality_bonus = 3
    }
  } else if (platform === 'linkedin-cross-platform') {
    // LinkedIn cross-platform bonuses
    if (candidate.cross_platform_match) {
      candidate.overall_score += 8
      candidate.cross_platform_bonus = 8
    }
    if (candidate.source_correlation_score > 60) {
      candidate.overall_score += 5
      candidate.correlation_bonus = 5
    }
  }
  
  return candidate
}

// Enhanced storage with cross-platform correlation
async function storeWithEnhancedDeduplication(candidates, supabase, queryEmbedding, platform) {
  try {
    for (const candidate of candidates) {
      // Enhanced multi-field duplicate detection with platform awareness
      const { data: existing } = await supabase
        .from('candidates')
        .select('id, name, github_username, email, overall_score, linkedin_url')
        .or(`name.ilike.%${candidate.name}%,github_username.eq.${candidate.github_username || 'null'},email.eq.${candidate.email || 'null'},linkedin_url.eq.${candidate.linkedin_url || 'null'}`)

      if (existing && existing.length > 0) {
        const existingCandidate = existing[0]
        const shouldUpdate = candidate.overall_score > (existingCandidate.overall_score || 0) + 5 // Higher threshold for updates
        
        if (shouldUpdate) {
          console.log(`Updating existing candidate: ${candidate.name} with enhanced data from ${platform}`)
          const { error } = await supabase
            .from('candidates')
            .update({
              ...candidate,
              enhanced_by_platform: platform,
              last_enhanced: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingCandidate.id)
            
          if (error) {
            console.error('Error updating enhanced candidate:', error)
          }
        }
        continue
      }

      // Insert new enhanced candidate
      const candidateData = {
        name: candidate.name,
        title: candidate.title,
        location: candidate.location,
        avatar_url: candidate.avatar_url,
        email: candidate.email,
        github_username: candidate.github_username,
        stackoverflow_id: candidate.stackoverflow_id,
        linkedin_url: candidate.linkedin_url,
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
        console.error('Error storing enhanced candidate:', error)
      } else {
        console.log(`Successfully stored enhanced ${candidate.candidate_tier || 'untiered'} candidate: ${candidate.name} from ${platform} (Score: ${candidate.overall_score})`)
      }
    }
  } catch (error) {
    console.error('Error in enhanced deduplication storage:', error)
  }
}

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
