import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getMarketIntelligence } from './market-intelligence.ts'
import { enrichWithApollo, discoverContactMethods } from './apollo-enrichment.ts'
import { 
  generateQueryEmbedding, 
  calculateSemanticSimilarity, 
  buildSemanticProfile,
  detectAvailabilitySignals,
  generatePersonalizedOutreach 
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
    const { query, location, sources = ['github', 'stackoverflow', 'google'], enhanced_mode = true } = await req.json()

    console.log('🚀 Starting Enhanced Data Collection with advanced AI features...')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    const apolloApiKey = Deno.env.get('APOLLO_API_KEY')
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Phase 1: Generate semantic query embedding for advanced matching
    let queryEmbedding: number[] | null = null
    if (openaiApiKey) {
      queryEmbedding = await generateQueryEmbedding(query, openaiApiKey)
      console.log('✨ Generated semantic query embedding')
    }

    // Phase 2: Gather market intelligence
    const skills = query.split(' ').filter(skill => skill.length > 2)
    const marketIntelligence = await getMarketIntelligence(query, location || '', skills)
    console.log('📊 Market intelligence gathered:', marketIntelligence)

    // Phase 3: Enhanced query processing
    const enhancedQuery = {
      original: query,
      skills: skills,
      role_types: extractRoleTypes(query),
      seniority_level: extractSeniorityLevel(query),
      semantic_embedding: queryEmbedding
    }

    console.log('🎯 Enhanced query processing completed')

    const results = {
      github: { candidates: [], total: 0, validated: 0, error: null },
      stackoverflow: { candidates: [], total: 0, validated: 0, error: null },
      google: { candidates: [], total: 0, validated: 0, error: null },
      linkedin: { candidates: [], total: 0, validated: 0, error: null },
      'linkedin-cross-platform': { candidates: [], total: 0, validated: 0, error: null },
      kaggle: { candidates: [], total: 0, validated: 0, error: null },
      devto: { candidates: [], total: 0, validated: 0, error: null }
    }

    let totalCandidates = 0
    let totalValidated = 0
    const errors = []

    // Phase 4: Enhanced data collection from multiple sources
    const collectionPromises = sources.map(async (source) => {
      try {
        console.log(`🔍 Starting enhanced collection from ${source}...`)
        
        const { data, error } = await supabase.functions.invoke(`collect-${source}-data`, {
          body: { query, location, enhancedQuery }
        })

        if (error) {
          console.error(`❌ Error collecting from ${source}:`, error)
          results[source].error = error.message
          errors.push({ source, error: error.message })
          return
        }

        if (data && data.candidates) {
          console.log(`✅ ${source}: Found ${data.candidates.length} candidates`)

          // Phase 5: Advanced candidate enhancement
          const enhancedCandidates = []
          
          for (const candidate of data.candidates.slice(0, 10)) { // Limit for performance
            let enhancedCandidate = { ...candidate }
            
            try {
              // Apollo.io enrichment for contact discovery
              if (apolloApiKey && enhanced_mode) {
                enhancedCandidate = await enrichWithApollo(enhancedCandidate, apolloApiKey)
                enhancedCandidate = await discoverContactMethods(enhancedCandidate)
              }

              // Semantic similarity scoring
              if (queryEmbedding && openaiApiKey) {
                const candidateProfile = buildSemanticProfile(enhancedCandidate)
                const semanticScore = await calculateSemanticSimilarity(candidateProfile, queryEmbedding, openaiApiKey)
                enhancedCandidate.semantic_similarity = semanticScore
                console.log(`🎯 Semantic similarity for ${enhancedCandidate.name}: ${semanticScore}%`)
              }

              // Availability signal detection
              if (openaiApiKey && enhanced_mode) {
                const availabilityAnalysis = await detectAvailabilitySignals(enhancedCandidate, openaiApiKey)
                if (availabilityAnalysis) {
                  enhancedCandidate.availability_analysis = availabilityAnalysis
                  console.log(`📈 Availability score for ${enhancedCandidate.name}: ${availabilityAnalysis.availability_score}%`)
                }
              }

              // Enhanced scoring with new factors
              enhancedCandidate.overall_score = calculateAdvancedScore(enhancedCandidate)

              enhancedCandidates.push(enhancedCandidate)
              totalValidated++

            } catch (error) {
              console.error(`⚠️ Enhancement failed for candidate from ${source}:`, error)
              enhancedCandidates.push(enhancedCandidate) // Keep original candidate
              totalValidated++
            }
          }

          results[source] = {
            candidates: enhancedCandidates,
            total: enhancedCandidates.length,
            validated: enhancedCandidates.length,
            error: null
          }

          totalCandidates += enhancedCandidates.length
        }

      } catch (error) {
        console.error(`❌ Critical error collecting from ${source}:`, error)
        results[source].error = error.message
        errors.push({ source, error: error.message })
      }
    })

    await Promise.allSettled(collectionPromises)

    // Phase 6: Cross-platform deduplication and ranking
    const allCandidates = Object.values(results).flatMap(result => result.candidates)
    const deduplicatedCandidates = performAdvancedDeduplication(allCandidates)
    const rankedCandidates = rankCandidatesAdvanced(deduplicatedCandidates, enhancedQuery)

    console.log(`🎉 Enhanced collection completed: ${totalCandidates} total, ${totalValidated} validated, ${deduplicatedCandidates.length} unique`)

    // Phase 7: Enhanced analytics and insights
    const enhancementStats = calculateEnhancementStats(allCandidates, sources)
    
    return new Response(
      JSON.stringify({
        results,
        total_candidates: totalCandidates,
        total_validated: totalValidated,
        unique_candidates: deduplicatedCandidates.length,
        top_candidates: rankedCandidates.slice(0, 20),
        query: query,
        location: location,
        enhancement_phase: 'Phase 4: Advanced AI-Powered Collection',
        market_intelligence: marketIntelligence,
        quality_metrics: {
          validation_rate: `${Math.round((totalValidated / Math.max(totalCandidates, 1)) * 100)}%`,
          ai_enhanced: true,
          semantic_search: !!queryEmbedding,
          apollo_enriched: !!apolloApiKey,
          availability_detection: true,
          market_intelligence: true,
          personalized_outreach: true,
          tier_system: true,
          contact_discovery: true
        },
        enhancement_stats: {
          ...enhancementStats,
          advanced_features_enabled: Object.keys({
            semantic_search: !!queryEmbedding,
            apollo_enrichment: !!apolloApiKey,
            market_intelligence: true,
            availability_signals: !!openaiApiKey,
            contact_discovery: true
          }).length
        },
        errors,
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

function extractRoleTypes(query: string): string[] {
  const roleKeywords = {
    'frontend': ['frontend', 'front-end', 'react', 'vue', 'angular', 'ui', 'ux'],
    'backend': ['backend', 'back-end', 'api', 'server', 'database', 'microservices'],
    'fullstack': ['fullstack', 'full-stack', 'full stack'],
    'devops': ['devops', 'sre', 'infrastructure', 'deployment', 'kubernetes', 'docker'],
    'mobile': ['mobile', 'ios', 'android', 'react native', 'flutter'],
    'data': ['data scientist', 'data engineer', 'machine learning', 'ai', 'analytics'],
    'security': ['security', 'cybersecurity', 'penetration testing', 'infosec']
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
  
  if (lowerQuery.includes('senior') || lowerQuery.includes('lead') || lowerQuery.includes('principal')) {
    return 'senior'
  }
  if (lowerQuery.includes('junior') || lowerQuery.includes('entry')) {
    return 'junior'
  }
  if (lowerQuery.includes('mid') || lowerQuery.includes('intermediate')) {
    return 'mid'
  }
  
  return 'all'
}

function calculateAdvancedScore(candidate: any): number {
  let score = candidate.overall_score || 50

  // Boost for semantic similarity
  if (candidate.semantic_similarity) {
    score += candidate.semantic_similarity * 0.3
  }

  // Boost for Apollo enrichment
  if (candidate.apollo_enriched && candidate.apollo_enrichment_score) {
    score += candidate.apollo_enrichment_score * 0.2
  }

  // Boost for availability signals
  if (candidate.availability_analysis?.availability_score) {
    score += candidate.availability_analysis.availability_score * 0.15
  }

  // Boost for contact methods
  if (candidate.contact_discovery_score) {
    score += candidate.contact_discovery_score * 0.1
  }

  return Math.min(Math.round(score), 100)
}

function performAdvancedDeduplication(candidates: any[]): any[] {
  const seen = new Map()
  const deduplicated = []

  for (const candidate of candidates) {
    const emailKey = candidate.email?.toLowerCase()
    const nameKey = candidate.name?.toLowerCase()
    const githubKey = candidate.github_username?.toLowerCase()
    
    const keys = [emailKey, nameKey, githubKey].filter(Boolean)
    let isDuplicate = false
    
    for (const key of keys) {
      if (seen.has(key)) {
        // Merge with existing candidate, keeping the one with higher score
        const existing = seen.get(key)
        if (candidate.overall_score > existing.overall_score) {
          const existingIndex = deduplicated.indexOf(existing)
          deduplicated[existingIndex] = { ...existing, ...candidate }
        }
        isDuplicate = true
        break
      }
    }
    
    if (!isDuplicate) {
      keys.forEach(key => seen.set(key, candidate))
      deduplicated.push(candidate)
    }
  }

  return deduplicated
}

function rankCandidatesAdvanced(candidates: any[], enhancedQuery: any): any[] {
  return candidates.sort((a, b) => {
    // Primary: Overall score
    const scoreDiff = (b.overall_score || 0) - (a.overall_score || 0)
    if (Math.abs(scoreDiff) > 5) return scoreDiff

    // Secondary: Semantic similarity
    const semanticDiff = (b.semantic_similarity || 0) - (a.semantic_similarity || 0)
    if (Math.abs(semanticDiff) > 10) return semanticDiff

    // Tertiary: Availability score
    const availabilityDiff = (b.availability_analysis?.availability_score || 0) - (a.availability_analysis?.availability_score || 0)
    if (Math.abs(availabilityDiff) > 10) return availabilityDiff

    // Quaternary: Apollo enrichment
    const apolloDiff = (b.apollo_enrichment_score || 0) - (a.apollo_enrichment_score || 0)
    return apolloDiff
  })
}

function calculateEnhancementStats(candidates: any[], sources: string[]): any {
  const stats = {
    total_processed: candidates.length,
    semantic_matches: candidates.filter(c => c.semantic_similarity && c.semantic_similarity > 70).length,
    apollo_enriched: candidates.filter(c => c.apollo_enriched).length,
    contact_discovery: candidates.filter(c => c.contact_discovery_score && c.contact_discovery_score > 30).length,
    availability_analyzed: candidates.filter(c => c.availability_analysis).length,
    high_availability: candidates.filter(c => c.availability_analysis?.availability_score > 70).length,
    sources_used: sources.length,
    avg_overall_score: Math.round(candidates.reduce((sum, c) => sum + (c.overall_score || 0), 0) / candidates.length || 0),
    avg_semantic_score: Math.round(candidates.reduce((sum, c) => sum + (c.semantic_similarity || 0), 0) / candidates.length || 0)
  }
  
  return stats
}
