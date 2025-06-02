
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { saveCandidateWithSource } from '../shared/database-operations.ts'
import { MultiQueryExecutor } from './multi-query-executor.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, location, time_budget = 20 } = await req.json()

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
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('🚀 Starting enhanced multi-query GitHub collection...')
    console.log(`Query: "${query}", Location: "${location}", Time Budget: ${time_budget}s`)

    const startTime = Date.now()
    const maxProcessingTime = (time_budget - 2) * 1000 // Reserve 2 seconds for processing

    // Execute enhanced multi-query search
    const executor = new MultiQueryExecutor()
    const searchResult = await executor.executeEnhancedSearch(
      query, 
      location, 
      15, // Target 15 results
      maxProcessingTime
    )

    const { candidates, strategiesUsed, resultDistribution } = searchResult
    
    console.log(`🎯 Enhanced search completed: ${candidates.length} candidates from ${strategiesUsed.length} strategies`)
    console.log('📊 Strategy distribution:', resultDistribution)

    // Save candidates to database
    const savedCandidates = []
    for (const candidate of candidates) {
      try {
        const sourceData = {
          candidate_id: candidate.id,
          platform: 'github',
          platform_id: candidate.github_username,
          url: `https://github.com/${candidate.github_username}`,
          data: {
            enhanced_profile: candidate.enhanced_profile,
            search_strategies: strategiesUsed
          }
        }

        const saveResult = await saveCandidateWithSource(supabase, candidate, sourceData)
        
        if (saveResult.success) {
          savedCandidates.push(candidate)
          console.log(`💾 Saved enhanced candidate: ${candidate.name} (${candidate.github_username})`)
        } else {
          console.error(`❌ Failed to save candidate ${candidate.github_username}:`, saveResult.error)
        }
      } catch (error) {
        console.error(`❌ Error saving candidate ${candidate.github_username}:`, error.message)
        continue
      }
    }

    // Sort by enhanced scoring
    const sortedCandidates = savedCandidates
      .sort((a, b) => (b.overall_score + b.skill_match + b.reputation) - (a.overall_score + a.skill_match + a.reputation))

    const processingTime = Date.now() - startTime
    console.log(`✅ Enhanced GitHub collection completed in ${processingTime}ms: ${sortedCandidates.length} high-quality candidates`)

    return new Response(
      JSON.stringify({ 
        candidates: sortedCandidates,
        total: sortedCandidates.length,
        source: 'github',
        processing_time_ms: processingTime,
        enhancement_stats: {
          strategies_used: strategiesUsed,
          total_queries_executed: searchResult.totalQueriesExecuted,
          result_distribution: resultDistribution,
          target_achieved: sortedCandidates.length >= 10,
          enhancement_level: 'comprehensive'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in enhanced GitHub collection:', error)
    return new Response(
      JSON.stringify({ 
        candidates: [], 
        total: 0, 
        source: 'github',
        error: 'Enhanced GitHub collection failed',
        error_details: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
