
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
import { storeWithEnhancedDeduplication } from './storage-manager.ts'
import { getFunctionNameForSource } from './utils.ts'

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
