import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { TimeBudgetManager } from './time-budget-manager.ts'
import { ParallelProcessor } from './parallel-processor.ts'
import { getMarketIntelligence } from './market-intelligence.ts'
import { 
  generateQueryEmbedding, 
  buildSemanticProfile,
  detectAvailabilitySignals 
} from './semantic-search.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, location, sources = ['github', 'stackoverflow', 'google', 'linkedin'], enhanced_mode = true } = await req.json()

    console.log('🚀 Starting Enhanced Data Collection with Time-Budget Architecture...')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    const apolloApiKey = Deno.env.get('APOLLO_API_KEY')
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Initialize time budget manager (90 seconds total)
    const timeBudget = new TimeBudgetManager(90)
    const processor = new ParallelProcessor(timeBudget, {
      maxCandidatesPerSource: 8, // Reduced from 10
      maxAIEnhancements: 5,      // Only enhance top 5
      maxConcurrentSources: 3    // Process 3 sources in parallel
    })

    // Phase 1: Quick market intelligence (5 seconds max)
    console.log('📊 Phase 1: Gathering market intelligence...')
    const skills = query.split(' ').filter(skill => skill.length > 2)
    const marketIntelligence = await timeBudget.withTimeout(
      getMarketIntelligence(query, location || '', skills),
      5000
    ) || null

    // Phase 2: Enhanced query processing (lightweight, 2 seconds max)
    console.log('🎯 Phase 2: Processing enhanced query...')
    const enhancedQuery = {
      original: query,
      skills: skills,
      role_types: extractRoleTypes(query),
      seniority_level: extractSeniorityLevel(query),
      semantic_embedding: null // Skip embedding for faster processing
    }

    // Skip semantic embedding for faster initial processing
    if (openaiApiKey && enhanced_mode) {
      enhancedQuery.semantic_embedding = await timeBudget.withTimeout(
        generateQueryEmbedding(query, openaiApiKey),
        3000
      )
    }

    // Phase 3: Parallel source collection (main time budget)
    console.log('🌐 Phase 3: Parallel data collection from sources...')
    timeBudget.updateProgress('Collecting from sources', 0, sources.length, 0)
    
    const sourceResults = await processor.processSourcesInParallel(
      sources,
      query,
      location,
      enhancedQuery,
      supabase
    )

    // Aggregate results quickly
    const allCandidates = sourceResults.flatMap(result => result.candidates)
    console.log(`📊 Collected ${allCandidates.length} candidates from ${sourceResults.length} sources`)

    // Phase 4: Fast deduplication and basic ranking
    console.log('🔄 Phase 4: Fast deduplication and ranking...')
    const deduplicatedCandidates = performFastDeduplication(allCandidates)
    const rankedCandidates = performFastRanking(deduplicatedCandidates)

    // Phase 5: Selective AI enhancement (only if time permits)
    let enhancedCandidates = rankedCandidates
    if (timeBudget.hasTimeRemaining() && enhanced_mode) {
      console.log('✨ Phase 5: Selective AI enhancement...')
      enhancedCandidates = await processor.batchEnhanceCandidates(
        rankedCandidates,
        openaiApiKey,
        apolloApiKey
      )
    }

    // Build results structure for frontend
    const results = {}
    sourceResults.forEach(result => {
      results[result.source] = {
        candidates: result.candidates,
        total: result.total,
        validated: result.validated,
        error: result.error
      }
    })

    const totalCandidates = allCandidates.length
    const totalValidated = deduplicatedCandidates.length
    const processingTime = Date.now() - timeBudget.budget.startTime

    console.log(`🎉 Enhanced collection completed in ${processingTime}ms: ${totalValidated} unique candidates`)

    // Calculate enhancement stats
    const enhancementStats = {
      total_processed: totalCandidates,
      unique_candidates: totalValidated,
      processing_time_ms: processingTime,
      time_budget_used: Math.round((processingTime / timeBudget.budget.total) * 100),
      sources_successful: sourceResults.filter(r => !r.error).length,
      parallel_processing: true,
      ai_enhancements: enhancedCandidates.filter(c => c.ai_enhanced).length,
      apollo_enriched: enhancedCandidates.filter(c => c.apollo_checked).length
    }

    return new Response(
      JSON.stringify({
        results,
        total_candidates: totalCandidates,
        total_validated: totalValidated,
        unique_candidates: totalValidated,
        top_candidates: enhancedCandidates.slice(0, 20),
        query: query,
        location: location,
        enhancement_phase: 'Phase 5: Time-Budget Optimized Collection',
        market_intelligence: marketIntelligence,
        quality_metrics: {
          validation_rate: `${Math.round((totalValidated / Math.max(totalCandidates, 1)) * 100)}%`,
          ai_enhanced: enhanced_mode,
          processing_time: `${Math.round(processingTime / 1000)}s`,
          time_efficiency: `${Math.round((totalValidated / Math.max(processingTime / 1000, 1)) * 10) / 10} candidates/sec`,
          parallel_processing: true,
          smart_limiting: true,
          early_returns: totalValidated >= 20
        },
        enhancement_stats: enhancementStats,
        performance_metrics: {
          total_time_ms: processingTime,
          average_time_per_source: Math.round(processingTime / sources.length),
          timeout_rate: sourceResults.filter(r => r.error?.includes('timeout')).length / sourceResults.length,
          success_rate: sourceResults.filter(r => !r.error).length / sourceResults.length
        },
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Critical error in enhanced data collection:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Enhanced data collection failed',
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

function performFastDeduplication(candidates: any[]): any[] {
  const seen = new Set()
  const deduplicated = []

  for (const candidate of candidates) {
    const key = candidate.email || candidate.github_username || candidate.name?.toLowerCase()
    if (key && !seen.has(key)) {
      seen.add(key)
      deduplicated.push(candidate)
    }
  }

  return deduplicated
}

function performFastRanking(candidates: any[]): any[] {
  return candidates.sort((a, b) => {
    const scoreA = (a.overall_score || 0) + (a.skill_match || 0)
    const scoreB = (b.overall_score || 0) + (b.skill_match || 0)
    return scoreB - scoreA
  })
}

function extractRoleTypes(query: string): string[] {
  const roleKeywords = {
    'frontend': ['frontend', 'front-end', 'react', 'vue', 'angular'],
    'backend': ['backend', 'back-end', 'api', 'server'],
    'fullstack': ['fullstack', 'full-stack', 'full stack'],
    'devops': ['devops', 'sre', 'infrastructure'],
    'mobile': ['mobile', 'ios', 'android'],
    'data': ['data scientist', 'data engineer', 'machine learning'],
  }

  const detectedRoles = []
  const lowerQuery = query.toLowerCase()

  for (const [role, keywords] of Object.entries(roleKeywords)) {
    if (keywords.some(keyword => lowerQuery.includes(keyword))) {
      detectedRoles.push(role)
    }
  }

  return detectedRoles.length > 0 ? detectedRoles : ['developer']
}

function extractSeniorityLevel(query: string): string {
  const lowerQuery = query.toLowerCase()
  
  if (lowerQuery.includes('senior') || lowerQuery.includes('lead')) return 'senior'
  if (lowerQuery.includes('junior') || lowerQuery.includes('entry')) return 'junior'
  if (lowerQuery.includes('mid')) return 'mid'
  
  return 'all'
}
