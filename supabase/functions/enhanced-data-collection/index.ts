
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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Optimized timeout with better error messages
function createTimeout(ms: number, source: string) {
  return new Promise((_, reject) => 
    setTimeout(() => reject(new Error(`Timeout: ${source} exceeded ${ms}ms limit`)), ms)
  )
}

// Improved function invocation with circuit breaker pattern
async function invokeWithRetry(supabase: any, functionName: string, body: any, maxRetries = 2) {
  console.log(`Starting ${functionName} with ${maxRetries} retry attempts`)
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`${functionName} attempt ${attempt + 1}/${maxRetries}`)
      
      // Reduced timeout for better responsiveness
      const result = await Promise.race([
        supabase.functions.invoke(functionName, { body }),
        createTimeout(60000, functionName) // Reduced to 1 minute
      ])
      
      if (result.error) {
        console.error(`${functionName} returned error:`, result.error)
        throw new Error(`${functionName} failed: ${result.error.message || 'Unknown error'}`)
      }
      
      console.log(`${functionName} completed successfully`)
      return result
    } catch (error) {
      console.error(`${functionName} attempt ${attempt + 1} failed:`, error.message)
      
      if (attempt === maxRetries - 1) {
        console.error(`${functionName} failed all ${maxRetries} attempts`)
        throw new Error(`${functionName} failed after ${maxRetries} attempts: ${error.message}`)
      }
      
      // Progressive delay between retries
      const delay = 1000 * (attempt + 1)
      console.log(`Waiting ${delay}ms before retry...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}

serve(async (req) => {
  // Enhanced CORS handling
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('=== OPTIMIZED ENHANCED DATA COLLECTION STARTED ===')

  try {
    const { query, location, sources = ['github', 'stackoverflow', 'google', 'linkedin', 'kaggle', 'devto'] } = await req.json()

    if (!query) {
      console.error('Missing required query parameter')
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Environment validation with detailed logging
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY')
    const apolloApiKey = Deno.env.get('APOLLO_API_KEY')
    const googleApiKey = Deno.env.get('GOOGLE_API_KEY')
    const searchEngineId = Deno.env.get('GOOGLE_SEARCH_ENGINE_ID')

    console.log('Environment check:')
    console.log('- SUPABASE_URL:', !!supabaseUrl)
    console.log('- SUPABASE_SERVICE_ROLE_KEY:', !!supabaseKey)
    console.log('- OPENAI_API_KEY:', !!openaiApiKey)
    console.log('- PERPLEXITY_API_KEY:', !!perplexityApiKey)
    console.log('- APOLLO_API_KEY:', !!apolloApiKey)
    console.log('- GOOGLE_API_KEY:', !!googleApiKey)
    console.log('- GOOGLE_SEARCH_ENGINE_ID:', !!searchEngineId)

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing critical Supabase environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error: Missing Supabase credentials' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    console.log('Supabase client initialized')

    console.log(`Starting optimized enhanced data collection for query: "${query}"`)

    // Initialize results structure with error tracking
    const results = {
      github: { candidates: [], total: 0, validated: 0, error: null },
      stackoverflow: { candidates: [], total: 0, validated: 0, error: null },
      google: { candidates: [], total: 0, validated: 0, error: null },
      linkedin: { candidates: [], total: 0, validated: 0, error: null },
      'linkedin-cross-platform': { candidates: [], total: 0, validated: 0, error: null },
      kaggle: { candidates: [], total: 0, validated: 0, error: null },
      devto: { candidates: [], total: 0, validated: 0, error: null }
    }

    // Step 1: Enhanced semantic query analysis with fallback
    let enhancedQuery
    try {
      console.log('Starting query enhancement...')
      if (openaiApiKey) {
        enhancedQuery = await enhanceQueryWithSemanticAI(query, openaiApiKey)
        console.log('Query enhanced successfully:', enhancedQuery)
      } else {
        console.log('OpenAI API key not available, using fallback query structure')
        enhancedQuery = {
          searchTerms: [query],
          skills: [],
          experienceLevel: 'any',
          locations: location ? [location] : []
        }
      }
    } catch (error) {
      console.error('Query enhancement failed, using fallback:', error.message)
      enhancedQuery = {
        searchTerms: [query],
        skills: [],
        experienceLevel: 'any',
        locations: location ? [location] : []
      }
    }

    // Step 2: Generate embeddings for semantic search with error handling
    let queryEmbedding = null
    try {
      if (openaiApiKey) {
        console.log('Generating query embedding...')
        queryEmbedding = await generateQueryEmbedding(query, openaiApiKey)
        console.log('Query embedding generated successfully')
      } else {
        console.log('OpenAI API key not available, skipping embeddings')
      }
    } catch (error) {
      console.error('Query embedding generation failed:', error.message)
    }

    // Step 3: Enhanced Google search integration with comprehensive error handling
    if (sources.includes('google')) {
      try {
        console.log('=== STARTING ENHANCED GOOGLE SEARCH ===')
        if (!googleApiKey || !searchEngineId) {
          console.log('Google Search API credentials not configured, skipping Google search')
          results.google.error = 'Google Search API not configured'
        } else {
          const googleCandidates = await performEnhancedGoogleSearch(query, location, googleApiKey, searchEngineId, openaiApiKey)
          
          results.google.total = googleCandidates.length
          console.log(`Enhanced Google search found ${googleCandidates.length} candidates`)
          
          // Process Google candidates with enhanced validation - OPTIMIZED FOR PERFORMANCE
          const validatedGoogleCandidates = []
          for (const candidate of googleCandidates.slice(0, 8)) { // Reduced to 8 for performance
            try {
              // Apollo enrichment for Google candidates with timeout
              let enrichedCandidate = candidate
              if (apolloApiKey) {
                console.log(`Enriching Google candidate ${candidate.name} with Apollo.io`)
                enrichedCandidate = await enrichWithApollo(candidate, apolloApiKey)
              }
              
              // Enhanced validation with fallback
              if (openaiApiKey) {
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
                    console.log(`Validated ${tier} candidate ${candidate.name} from Google search (Score: ${scoredCandidate.overall_score})`)
                  }
                }
              } else {
                // Fallback: accept all Google candidates with basic scoring
                enrichedCandidate.overall_score = 70
                enrichedCandidate.candidate_tier = 'bronze'
                enrichedCandidate.apollo_enriched = !!enrichedCandidate.apollo_enriched
                validatedGoogleCandidates.push(enrichedCandidate)
                console.log(`Added Google candidate ${candidate.name} (fallback mode)`)
              }
            } catch (error) {
              console.error(`Error processing Google candidate ${candidate.name}:`, error.message)
              continue
            }
          }
          
          results.google.candidates = validatedGoogleCandidates
          results.google.validated = validatedGoogleCandidates.length
          
          // Store Google candidates with error handling
          if (validatedGoogleCandidates.length > 0) {
            try {
              await storeWithEnhancedDeduplication(validatedGoogleCandidates, supabase, queryEmbedding, 'google')
              console.log(`Stored ${validatedGoogleCandidates.length} Google candidates`)
            } catch (error) {
              console.error('Failed to store Google candidates:', error.message)
            }
          }
        }
      } catch (error) {
        console.error('Enhanced Google search error:', error.message)
        results.google.error = error.message
      }
    }

    // Step 4: Enhanced parallel data collection with better error isolation - OPTIMIZED
    const collectionPromises = sources.filter(s => s !== 'google').map(async (source) => {
      try {
        console.log(`=== STARTING ${source.toUpperCase()} COLLECTION ===`)
        
        const functionMap = {
          'github': 'collect-github-data',
          'stackoverflow': 'collect-stackoverflow-data',
          'linkedin': 'collect-linkedin-data',
          'kaggle': 'collect-kaggle-data',
          'devto': 'collect-devto-data'
        }
        
        const functionName = functionMap[source]
        if (!functionName) {
          throw new Error(`Unknown source: ${source}`)
        }

        const result = await invokeWithRetry(supabase, functionName, {
          query: enhancedQuery.searchTerms.join(' '), 
          location, 
          enhancedQuery
        })

        const rawCandidates = result.data?.candidates || []
        results[source].total = rawCandidates.length

        console.log(`Collected ${rawCandidates.length} candidates from ${source}`)

        // Enhanced statistics logging
        if (result.data?.enhancement_stats) {
          console.log(`${source} enhancement stats:`, result.data.enhancement_stats)
        }

        // Step 5: Enhanced AI validation with Apollo enrichment - OPTIMIZED FOR PERFORMANCE
        const validatedCandidates = []
        
        if (rawCandidates.length > 0) {
          // Process limited candidates for performance - REDUCED LOAD
          const candidatesToProcess = rawCandidates.slice(0, 10) // Reduced from 15 to 10
          
          for (const candidate of candidatesToProcess) {
            try {
              // Apollo enrichment for missing emails - WITH TIMEOUT
              let enrichedCandidate = candidate
              if (apolloApiKey && !candidate.email) {
                console.log(`Enriching ${candidate.name} with Apollo.io`)
                enrichedCandidate = await enrichWithApollo(candidate, apolloApiKey)
              }
              
              // Enhanced validation with fallback
              if (openaiApiKey) {
                const validationResult = await performEnhancedValidation(enrichedCandidate, enhancedQuery, source, openaiApiKey)
                
                if (!validationResult.isValid) {
                  console.log(`Candidate ${enrichedCandidate.name} failed validation: ${validationResult.reason}`)
                  continue
                }

                const tier = calculateEnhancedCandidateTier(validationResult, source)
                
                // Selective Perplexity enrichment for high-value candidates only
                if (perplexityApiKey && tier === 'gold') {
                  try {
                    enrichedCandidate = await enrichWithPerplexity(enrichedCandidate, perplexityApiKey)
                  } catch (error) {
                    console.log(`Perplexity enrichment failed for ${enrichedCandidate.name}:`, error.message)
                  }
                }
                
                // Enhanced scoring
                let scoredCandidate = await calculateEnhancedTieredScoring(enrichedCandidate, enhancedQuery, tier, source, openaiApiKey)
                
                // Enhanced semantic similarity
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
                
                // Enhanced quality gates
                const minScore = getEnhancedMinScoreForTier(tier, source)
                const minConfidence = getEnhancedMinConfidenceForTier(tier, source)
                
                if (scoredCandidate.overall_score >= minScore && scoredCandidate.validation_confidence >= minConfidence) {
                  scoredCandidate.completeness_score = calculateAdvancedCompleteness(scoredCandidate)
                  scoredCandidate.candidate_tier = tier
                  scoredCandidate.collection_phase = '2.5'
                  scoredCandidate.apollo_enriched = !!enrichedCandidate.apollo_enriched
                  
                  // Platform-specific bonuses
                  scoredCandidate = applyPlatformSpecificBonuses(scoredCandidate, source, result.data)
                  
                  // Enhanced market intelligence with error handling
                  try {
                    const marketScore = await calculateMarketIntelligenceWithCache(scoredCandidate, enhancedQuery, openaiApiKey)
                    scoredCandidate.market_relevance = marketScore
                  } catch (error) {
                    console.log(`Market intelligence calculation failed for ${enrichedCandidate.name}:`, error.message)
                    scoredCandidate.market_relevance = 60
                  }
                  
                  validatedCandidates.push(scoredCandidate)
                  console.log(`Validated ${tier} candidate ${enrichedCandidate.name} from ${source} (Score: ${scoredCandidate.overall_score}) ${enrichedCandidate.apollo_enriched ? '[Apollo Enhanced]' : ''}`)
                } else {
                  console.log(`Candidate ${enrichedCandidate.name} below ${tier} threshold (Score: ${scoredCandidate.overall_score}, Confidence: ${scoredCandidate.validation_confidence})`)
                }
              } else {
                // Fallback: accept candidates with basic scoring when OpenAI is not available
                enrichedCandidate.overall_score = Math.max(candidate.overall_score || 60, 60)
                enrichedCandidate.candidate_tier = 'bronze'
                enrichedCandidate.collection_phase = '2.5'
                enrichedCandidate.apollo_enriched = !!enrichedCandidate.apollo_enriched
                enrichedCandidate.market_relevance = 60
                validatedCandidates.push(enrichedCandidate)
                console.log(`Added candidate ${enrichedCandidate.name} from ${source} (fallback mode)`)
              }
            } catch (error) {
              console.error(`Error processing candidate ${candidate.name}:`, error.message)
              continue
            }
          }
        }

        results[source].candidates = validatedCandidates
        results[source].validated = validatedCandidates.length

        // Enhanced storage with error handling
        if (validatedCandidates.length > 0) {
          try {
            await storeWithEnhancedDeduplication(validatedCandidates, supabase, queryEmbedding, source)
            console.log(`Stored ${validatedCandidates.length} candidates from ${source}`)
          } catch (error) {
            console.error(`Storage failed for ${source}:`, error.message)
          }
        }

      } catch (error) {
        console.error(`${source} collection error:`, error.message)
        results[source].error = error.message
      }
    })

    // Step 6: LinkedIn cross-platform discovery with timeout and error handling - OPTIMIZED
    const crossPlatformPromise = (async () => {
      if (!sources.includes('linkedin-cross-platform')) {
        return
      }
      
      try {
        console.log('=== STARTING LINKEDIN CROSS-PLATFORM DISCOVERY ===')
        
        const result = await Promise.race([
          supabase.functions.invoke('collect-linkedin-cross-platform', {
            body: { query: enhancedQuery.searchTerms.join(' '), location, enhancedQuery, crossPlatformData: true }
          }),
          createTimeout(60000, 'LinkedIn cross-platform discovery') // Reduced timeout
        ])

        if (result.error) throw result.error

        const crossPlatformCandidates = result.data?.candidates || []
        results['linkedin-cross-platform'].total = crossPlatformCandidates.length
        results['linkedin-cross-platform'].candidates = crossPlatformCandidates
        results['linkedin-cross-platform'].validated = crossPlatformCandidates.length

        console.log(`Cross-platform LinkedIn discovery found ${crossPlatformCandidates.length} candidates`)

        if (result.data?.discovery_stats) {
          console.log('Cross-platform discovery stats:', result.data.discovery_stats)
        }

      } catch (error) {
        console.error('LinkedIn cross-platform discovery error:', error.message)
        results['linkedin-cross-platform'].error = error.message
      }
    })()

    // Wait for all collections to complete with better error handling - OPTIMIZED TIMEOUT
    console.log('Waiting for all collection promises to complete...')
    const allPromises = [...collectionPromises, crossPlatformPromise]
    await Promise.allSettled(allPromises)
    console.log('All collection promises completed')

    const totalCandidates = Object.values(results).reduce((sum, result) => sum + result.total, 0)
    const totalValidated = Object.values(results).reduce((sum, result) => sum + result.validated, 0)

    console.log(`Optimized enhanced collection completed. Total: ${totalCandidates}, Quality validated: ${totalValidated}`)

    // Enhanced statistics with error tracking
    const apolloEnrichedCount = Object.values(results)
      .flatMap(r => r.candidates)
      .filter(c => c.apollo_enriched).length

    const errors = Object.entries(results)
      .filter(([_, result]) => result.error)
      .map(([source, result]) => ({ source, error: result.error }))

    if (errors.length > 0) {
      console.log('Collection errors occurred:', errors)
    }

    console.log('=== OPTIMIZED ENHANCED DATA COLLECTION COMPLETED ===')

    return new Response(
      JSON.stringify({ 
        results,
        total_candidates: totalCandidates,
        total_validated: totalValidated,
        query,
        location,
        enhancement_phase: '2.5-optimized',
        quality_metrics: {
          validation_rate: totalCandidates > 0 ? (totalValidated / totalCandidates * 100).toFixed(1) : '0',
          ai_enhanced: !!openaiApiKey,
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
        errors: errors.length > 0 ? errors : undefined,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('=== CRITICAL ERROR IN ENHANCED DATA COLLECTION ===')
    console.error('Error details:', error)
    console.error('Stack trace:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to perform optimized enhanced data collection', 
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
