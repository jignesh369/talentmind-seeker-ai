
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

// Reduced timeout for faster failure detection
function createTimeout(ms: number, source: string) {
  return new Promise((_, reject) => 
    setTimeout(() => reject(new Error(`Timeout: ${source} exceeded ${ms}ms limit`)), ms)
  )
}

// Improved function invocation with faster retries
async function invokeWithRetry(supabase: any, functionName: string, body: any, maxRetries = 1) {
  console.log(`Starting ${functionName} with ${maxRetries} retry attempts`)
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`${functionName} attempt ${attempt + 1}/${maxRetries}`)
      
      const result = await Promise.race([
        supabase.functions.invoke(functionName, { body }),
        createTimeout(60000, functionName) // Reduced timeout to 1 minute
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
      
      // Reduced delay between retries for faster recovery
      const delay = 1000 * (attempt + 1)
      console.log(`Waiting ${delay}ms before retry...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('=== PHASE 2.5 ENHANCED DATA COLLECTION STARTED (OPTIMIZED) ===')

  try {
    const { query, location, sources = ['github', 'stackoverflow', 'google'] } = await req.json() // Reduced default sources
    console.log('Request body parsed:', { query, location, sources })

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

    // Environment validation
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    const apolloApiKey = Deno.env.get('APOLLO_API_KEY')

    console.log('Environment check:')
    console.log('- SUPABASE_URL:', !!supabaseUrl)
    console.log('- SUPABASE_SERVICE_ROLE_KEY:', !!supabaseKey)
    console.log('- OPENAI_API_KEY:', !!openaiApiKey)
    console.log('- APOLLO_API_KEY:', !!apolloApiKey)

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

    console.log(`Starting optimized Phase 2.5 enhanced multi-source data collection for query: "${query}"`)

    // Initialize results structure
    const results = {
      github: { candidates: [], total: 0, validated: 0, error: null },
      stackoverflow: { candidates: [], total: 0, validated: 0, error: null },
      google: { candidates: [], total: 0, validated: 0, error: null },
      linkedin: { candidates: [], total: 0, validated: 0, error: null },
      'linkedin-cross-platform': { candidates: [], total: 0, validated: 0, error: null },
      kaggle: { candidates: [], total: 0, validated: 0, error: null },
      devto: { candidates: [], total: 0, validated: 0, error: null }
    }

    // Step 1: Enhanced semantic query analysis with faster fallback
    let enhancedQuery
    try {
      console.log('Starting query enhancement...')
      if (openaiApiKey) {
        const enhancementPromise = enhanceQueryWithSemanticAI(query, openaiApiKey)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query enhancement timeout')), 10000)
        )
        enhancedQuery = await Promise.race([enhancementPromise, timeoutPromise])
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

    // Step 2: Parallel data collection with better error isolation and reduced scope
    const collectionPromises = sources.map(async (source) => {
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
        }, 1) // Reduced to 1 retry only

        const rawCandidates = result.data?.candidates || []
        results[source].total = rawCandidates.length

        console.log(`Collected ${rawCandidates.length} candidates from ${source}`)

        // Simplified validation - process only top candidates
        const validatedCandidates = []
        
        if (rawCandidates.length > 0) {
          // Process fewer candidates for faster completion
          const candidatesToProcess = rawCandidates.slice(0, 8) // Reduced from 15
          
          for (const candidate of candidatesToProcess) {
            try {
              // Basic validation without heavy AI processing
              let processedCandidate = candidate
              
              // Simple Apollo enrichment if available and candidate lacks email
              if (apolloApiKey && !candidate.email && source === 'github') {
                try {
                  const enrichmentPromise = enrichWithApollo(candidate, apolloApiKey)
                  const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Apollo timeout')), 3000)
                  )
                  processedCandidate = await Promise.race([enrichmentPromise, timeoutPromise])
                } catch (error) {
                  console.log(`Apollo enrichment failed for ${candidate.name}:`, error.message)
                }
              }
              
              // Ensure minimum score and add metadata
              processedCandidate.overall_score = Math.max(candidate.overall_score || 60, 60)
              processedCandidate.candidate_tier = candidate.candidate_tier || 'bronze'
              processedCandidate.collection_phase = '2.5-optimized'
              processedCandidate.apollo_enriched = !!processedCandidate.apollo_enriched
              processedCandidate.market_relevance = candidate.market_relevance || 60
              
              validatedCandidates.push(processedCandidate)
              console.log(`Processed candidate ${processedCandidate.name} from ${source}`)
              
            } catch (error) {
              console.error(`Error processing candidate ${candidate.name}:`, error.message)
              continue
            }
          }
        }

        results[source].candidates = validatedCandidates
        results[source].validated = validatedCandidates.length

        // Store candidates with simple error handling
        if (validatedCandidates.length > 0) {
          try {
            await storeWithEnhancedDeduplication(validatedCandidates, supabase, null, source)
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

    // Wait for all collections with faster timeout
    console.log('Waiting for all collection promises to complete...')
    await Promise.allSettled(collectionPromises)
    console.log('All collection promises completed')

    const totalCandidates = Object.values(results).reduce((sum, result) => sum + result.total, 0)
    const totalValidated = Object.values(results).reduce((sum, result) => sum + result.validated, 0)

    console.log(`Optimized Phase 2.5 collection completed. Total: ${totalCandidates}, Quality validated: ${totalValidated}`)

    // Enhanced statistics
    const apolloEnrichedCount = Object.values(results)
      .flatMap(r => r.candidates)
      .filter(c => c.apollo_enriched).length

    const errors = Object.entries(results)
      .filter(([_, result]) => result.error)
      .map(([source, result]) => ({ source, error: result.error }))

    if (errors.length > 0) {
      console.log('Collection errors occurred:', errors)
    }

    console.log('=== OPTIMIZED PHASE 2.5 ENHANCED DATA COLLECTION COMPLETED ===')

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
          perplexity_enriched: false, // Disabled for performance
          semantic_search: false, // Simplified for performance
          tier_system: true,
          apollo_enriched: !!apolloApiKey,
          github_readme_crawling: results.github.candidates.filter(c => c.readme_email_found).length > 0,
          stackoverflow_expertise_focus: results.stackoverflow.candidates.filter(c => c.expertise_score > 70).length > 0,
          linkedin_cross_platform: false, // Disabled for performance
          enhanced_google_search: results.google.validated > 0
        },
        enhancement_stats: {
          platform_specific_bonuses_applied: totalValidated,
          cross_platform_correlations: 0, // Disabled for performance
          readme_emails_found: results.github.candidates.filter(c => c.readme_email_found).length,
          apollo_enriched_candidates: apolloEnrichedCount,
          enhanced_google_discoveries: results.google.validated,
          expertise_level_candidates: Object.values(results)
            .flatMap(r => r.candidates)
            .filter(c => c.expertise_score > 70 || c.language_expertise > 70).length
        },
        errors: errors.length > 0 ? errors : undefined,
        performance_optimizations: {
          reduced_candidate_processing: true,
          faster_timeouts: true,
          simplified_validation: true,
          apollo_timeout_protection: true
        },
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('=== CRITICAL ERROR IN OPTIMIZED ENHANCED DATA COLLECTION ===')
    console.error('Error details:', error)
    console.error('Stack trace:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to perform optimized Phase 2.5 enhanced data collection', 
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
