
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { enhanceQueryWithSemanticAI } from './query-enhancement.ts'
import { generateQueryEmbedding, generateCandidateEmbedding, calculateCosineSimilarity } from './embedding-service.ts'
import { performEnhancedValidation, calculateEnhancedCandidateTier } from './validation-engine.ts'
import { 
  calculateEnhancedTieredScoring, 
  getEnhancedMinScoreForTier, 
  getEnhancedMinConfidenceForTier,
  applyPlatformSpecificBonuses,
  calculateAdvancedCompleteness
} from './scoring-system.ts'
import { enrichWithPerplexity } from './perplexity-enrichment.ts'
import { calculateMarketIntelligenceWithCache } from './market-intelligence.ts'
import { storeWithEnhancedDeduplication, enrichWithApollo } from './storage-manager.ts'
import { performEnhancedGoogleSearch } from './google-search-enhancement.ts'
import { getFunctionNameForSource } from './utils.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to create timeout promise
function createTimeout(ms: number, errorMessage: string) {
  return new Promise((_, reject) => 
    setTimeout(() => reject(new Error(errorMessage)), ms)
  )
}

// Helper function to invoke function with retry logic
async function invokeWithRetry(supabase: any, functionName: string, body: any, maxRetries = 2) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await Promise.race([
        supabase.functions.invoke(functionName, { body }),
        createTimeout(60000, `Timeout: ${functionName} took too long`)
      ])
      
      if (result.error) {
        throw new Error(result.error.message || `${functionName} failed`)
      }
      
      return result
    } catch (error) {
      console.log(`${functionName} attempt ${attempt + 1} failed:`, error.message)
      
      if (attempt === maxRetries - 1) {
        throw error
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
    }
  }
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
    const apolloApiKey = Deno.env.get('APOLLO_API_KEY') // New Apollo integration
    const googleApiKey = Deno.env.get('GOOGLE_API_KEY')!
    const searchEngineId = Deno.env.get('GOOGLE_SEARCH_ENGINE_ID')!
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
    let enhancedQuery
    try {
      enhancedQuery = await enhanceQueryWithSemanticAI(query, openaiApiKey)
      console.log('Phase 2.5 Enhanced query with advanced semantics:', enhancedQuery)
    } catch (error) {
      console.error('Query enhancement failed:', error)
      // Fallback to basic query structure
      enhancedQuery = {
        searchTerms: [query],
        skills: [],
        experienceLevel: 'any',
        locations: location ? [location] : []
      }
    }

    // Step 2: Generate embeddings for semantic search
    let queryEmbedding = null
    try {
      queryEmbedding = await generateQueryEmbedding(query, openaiApiKey)
    } catch (error) {
      console.error('Query embedding generation failed:', error)
    }

    // Step 3: Enhanced Google search integration
    if (sources.includes('google')) {
      try {
        console.log('Phase 2.5: Starting enhanced Google search with targeted queries...')
        const googleCandidates = await performEnhancedGoogleSearch(query, location, googleApiKey, searchEngineId, openaiApiKey)
        
        results.google.total = googleCandidates.length
        console.log(`Phase 2.5: Enhanced Google search found ${googleCandidates.length} candidates`)
        
        // Process Google candidates with enhanced validation
        const validatedGoogleCandidates = []
        for (const candidate of googleCandidates.slice(0, 15)) {
          try {
            // Apollo enrichment for Google candidates
            let enrichedCandidate = candidate
            if (apolloApiKey) {
              enrichedCandidate = await enrichWithApollo(candidate, apolloApiKey)
            }
            
            // Enhanced validation
            const validationResult = await performEnhancedValidation(enrichedCandidate, enhancedQuery, 'google', openaiApiKey)
            if (validationResult.isValid) {
              const tier = calculateEnhancedCandidateTier(validationResult, 'google')
              const scoredCandidate = await calculateEnhancedTieredScoring(enrichedCandidate, enhancedQuery, tier, 'google', openaiApiKey)
              
              const minScore = getEnhancedMinScoreForTier(tier, 'google')
              const minConfidence = getEnhancedMinConfidenceForTier(tier, 'google')
              
              if (scoredCandidate.overall_score >= minScore && scoredCandidate.validation_confidence >= minConfidence) {
                scoredCandidate.candidate_tier = tier
                scoredCandidate.apollo_enriched = !!enrichedCandidate.apollo_enriched
                validatedGoogleCandidates.push(scoredCandidate)
                console.log(`Phase 2.5: Validated ${tier} candidate ${candidate.name} from Google search (Score: ${scoredCandidate.overall_score})`)
              }
            }
          } catch (error) {
            console.error(`Error processing Google candidate ${candidate.name}:`, error)
            continue
          }
        }
        
        results.google.candidates = validatedGoogleCandidates
        results.google.validated = validatedGoogleCandidates.length
        
        // Store Google candidates
        if (validatedGoogleCandidates.length > 0) {
          await storeWithEnhancedDeduplication(validatedGoogleCandidates, supabase, queryEmbedding, 'google')
        }
        
      } catch (error) {
        console.error('Enhanced Google search error:', error)
        results.google.error = error.message
      }
    }

    // Step 4: Enhanced parallel data collection with improved strategies
    const collectionPromises = sources.filter(s => s !== 'google').map(async (source) => {
      try {
        console.log(`Phase 2.5: Enhanced collection from ${source}...`)
        
        const functionName = getFunctionNameForSource(source)
        let rawData, collectError
        
        // Use enhanced functions with retry logic
        if (source === 'github') {
          const result = await invokeWithRetry(supabase, 'collect-github-data', {
            query: enhancedQuery.searchTerms.join(' '), 
            location, 
            enhancedQuery
          })
          rawData = result.data
          collectError = result.error
        }
        else if (source === 'stackoverflow') {
          const result = await invokeWithRetry(supabase, 'collect-stackoverflow-data', {
            query: enhancedQuery.searchTerms.join(' '), 
            location, 
            enhancedQuery
          })
          rawData = result.data
          collectError = result.error
        }
        else {
          const result = await invokeWithRetry(supabase, functionName, {
            query: enhancedQuery.searchTerms.join(' '), 
            location, 
            enhancedQuery
          })
          rawData = result.data
          collectError = result.error
        }

        if (collectError) throw collectError

        const rawCandidates = rawData?.candidates || []
        results[source].total = rawCandidates.length

        console.log(`Phase 2.5: Collected ${rawCandidates.length} enhanced candidates from ${source}`)

        // Enhanced statistics logging
        if (rawData?.enhancement_stats) {
          console.log(`${source} enhancement stats:`, rawData.enhancement_stats)
        }

        // Step 5: Enhanced AI validation with Apollo enrichment - REDUCED LOAD
        const validatedCandidates = []
        
        if (rawCandidates.length > 0) {
          // Reduced from 35 to 20 to lower processing load
          const candidatesToProcess = rawCandidates.slice(0, 20)
          
          for (const candidate of candidatesToProcess) {
            try {
              // Apollo enrichment for missing emails
              let enrichedCandidate = candidate
              if (apolloApiKey && !candidate.email) {
                enrichedCandidate = await enrichWithApollo(candidate, apolloApiKey)
              }
              
              // Enhanced validation with platform-specific adjustments
              const validationResult = await performEnhancedValidation(enrichedCandidate, enhancedQuery, source, openaiApiKey)
              
              if (!validationResult.isValid) {
                console.log(`Phase 2.5: Candidate ${enrichedCandidate.name} failed enhanced validation: ${validationResult.reason}`)
                continue
              }

              // Enhanced tier calculation with platform weighting
              const tier = calculateEnhancedCandidateTier(validationResult, source)
              
              // Selective Perplexity enrichment for high-value candidates only
              if (perplexityApiKey && tier === 'gold') { // Only gold tier to reduce load
                try {
                  enrichedCandidate = await enrichWithPerplexity(enrichedCandidate, perplexityApiKey)
                } catch (error) {
                  console.log(`Perplexity enrichment failed for ${enrichedCandidate.name}:`, error.message)
                }
              }
              
              // Enhanced scoring with platform and discovery method bonuses
              let scoredCandidate = await calculateEnhancedTieredScoring(enrichedCandidate, enhancedQuery, tier, source, openaiApiKey)
              
              // Enhanced semantic similarity - only if embedding was successful
              if (queryEmbedding) {
                try {
                  const candidateEmbedding = await generateCandidateEmbedding(scoredCandidate, openaiApiKey)
                  if (candidateEmbedding) {
                    scoredCandidate.semantic_similarity = calculateCosineSimilarity(queryEmbedding, candidateEmbedding)
                  }
                } catch (error) {
                  console.log(`Semantic similarity calculation failed for ${enrichedCandidate.name}:`, error.message)
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
                scoredCandidate.apollo_enriched = !!enrichedCandidate.apollo_enriched
                
                // Platform-specific bonuses
                scoredCandidate = applyPlatformSpecificBonuses(scoredCandidate, source, rawData)
                
                // Enhanced market intelligence with error handling
                try {
                  const marketScore = await calculateMarketIntelligenceWithCache(scoredCandidate, enhancedQuery, openaiApiKey)
                  scoredCandidate.market_relevance = marketScore
                } catch (error) {
                  console.log(`Market intelligence calculation failed for ${enrichedCandidate.name}:`, error.message)
                  scoredCandidate.market_relevance = 60 // Default value
                }
                
                validatedCandidates.push(scoredCandidate)
                console.log(`Phase 2.5: Validated ${tier} candidate ${enrichedCandidate.name} from ${source} (Score: ${scoredCandidate.overall_score}) ${enrichedCandidate.apollo_enriched ? '[Apollo Enhanced]' : ''}`)
              } else {
                console.log(`Phase 2.5: Candidate ${enrichedCandidate.name} below enhanced ${tier} threshold (Score: ${scoredCandidate.overall_score}, Confidence: ${scoredCandidate.validation_confidence})`)
              }
            } catch (error) {
              console.error(`Phase 2.5: Error processing candidate ${candidate.name}:`, error)
              continue
            }
          }
        }

        results[source].candidates = validatedCandidates
        results[source].validated = validatedCandidates.length

        // Enhanced storage with cross-platform correlation
        if (validatedCandidates.length > 0) {
          try {
            await storeWithEnhancedDeduplication(validatedCandidates, supabase, queryEmbedding, source)
          } catch (error) {
            console.error(`Storage failed for ${source}:`, error)
          }
        }

      } catch (error) {
        console.error(`Phase 2.5: ${source} collection error:`, error)
        results[source].error = error.message
      }
    })

    // Step 6: Add LinkedIn cross-platform discovery as separate process with timeout
    const crossPlatformPromise = (async () => {
      try {
        console.log('Phase 2.5: Starting LinkedIn cross-platform discovery...')
        
        const result = await Promise.race([
          supabase.functions.invoke('collect-linkedin-cross-platform', {
            body: { query: enhancedQuery.searchTerms.join(' '), location, enhancedQuery, crossPlatformData: true }
          }),
          createTimeout(90000, 'LinkedIn cross-platform discovery timeout')
        ])

        if (result.error) throw result.error

        const crossPlatformCandidates = result.data?.candidates || []
        results['linkedin-cross-platform'].total = crossPlatformCandidates.length
        results['linkedin-cross-platform'].candidates = crossPlatformCandidates
        results['linkedin-cross-platform'].validated = crossPlatformCandidates.length

        console.log(`Phase 2.5: Cross-platform LinkedIn discovery found ${crossPlatformCandidates.length} candidates`)

        if (result.data?.discovery_stats) {
          console.log('Cross-platform discovery stats:', result.data.discovery_stats)
        }

      } catch (error) {
        console.error('Phase 2.5: LinkedIn cross-platform discovery error:', error)
        results['linkedin-cross-platform'].error = error.message
      }
    })()

    // Wait for all collections to complete with better error handling
    await Promise.allSettled([...collectionPromises, crossPlatformPromise])

    const totalCandidates = Object.values(results).reduce((sum, result) => sum + result.total, 0)
    const totalValidated = Object.values(results).reduce((sum, result) => sum + result.validated, 0)

    console.log(`Phase 2.5 enhanced collection completed. Total: ${totalCandidates}, Quality validated: ${totalValidated}`)

    // Enhanced statistics
    const apolloEnrichedCount = Object.values(results)
      .flatMap(r => r.candidates)
      .filter(c => c.apollo_enriched).length

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
          apollo_enriched: !!apolloApiKey,
          github_readme_crawling: results.github.candidates.filter(c => c.readme_email_found).length > 0,
          stackoverflow_expertise_focus: results.stackoverflow.candidates.filter(c => c.expertise_score > 70).length > 0,
          linkedin_cross_platform: results['linkedin-cross-platform'].validated > 0,
          enhanced_google_search: results.google.validated > 0
        },
        enhancement_stats: {
          platform_specific_bonuses_applied: totalValidated,
          cross_platform_correlations: results['linkedin-cross-platform'].validated,
          readme_emails_found: results.github.candidates.filter(c => c.readme_email_found).length,
          apollo_enriched_candidates: apolloEnrichedCount,
          enhanced_google_discoveries: results.google.validated,
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
      JSON.stringify({ error: 'Failed to perform Phase 2.5 enhanced data collection', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
