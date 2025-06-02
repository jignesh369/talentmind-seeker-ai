
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { saveCandidateWithSource } from '../shared/database-operations.ts'
import { EnhancedStackOverflowCollector } from './enhanced-stackoverflow-collector.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, time_budget = 15 } = await req.json()
    
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

    console.log('🚀 Starting enhanced StackOverflow collection...')
    console.log(`Query: "${query}", Time Budget: ${time_budget}s`)

    const startTime = Date.now()
    const maxProcessingTime = (time_budget - 1) * 1000

    // Execute enhanced collection
    const collector = new EnhancedStackOverflowCollector()
    const candidates = await collector.executeEnhancedCollection(
      query,
      12, // Target 12 results
      maxProcessingTime
    )

    console.log(`🎯 Enhanced StackOverflow search found ${candidates.length} candidates`)

    // Save candidates to database
    const savedCandidates = []
    for (const candidate of candidates) {
      try {
        const sourceData = {
          candidate_id: candidate.id,
          platform: 'stackoverflow',
          platform_id: candidate.stackoverflow_id,
          url: candidate.platform_data.profile_url,
          data: {
            platform_data: candidate.platform_data,
            enhanced_collection: true
          }
        }

        const saveResult = await saveCandidateWithSource(supabase, candidate, sourceData)
        
        if (saveResult.success) {
          savedCandidates.push(candidate)
          console.log(`💾 Saved StackOverflow candidate: ${candidate.name} (Rep: ${candidate.platform_data.reputation})`)
        } else {
          console.error(`❌ Failed to save candidate ${candidate.name}:`, saveResult.error)
        }
      } catch (error) {
        console.error(`❌ Error saving candidate ${candidate.name}:`, error.message)
        continue
      }
    }

    const sortedCandidates = savedCandidates
      .sort((a, b) => (b.overall_score + b.reputation) - (a.overall_score + a.reputation))

    const processingTime = Date.now() - startTime
    console.log(`✅ Enhanced StackOverflow collection completed in ${processingTime}ms: ${sortedCandidates.length} candidates`)

    return new Response(
      JSON.stringify({ 
        candidates: sortedCandidates,
        total: sortedCandidates.length,
        source: 'stackoverflow',
        processing_time_ms: processingTime,
        enhancement_stats: {
          target_achieved: sortedCandidates.length >= 10,
          enhancement_level: 'comprehensive',
          collection_method: 'multi_strategy'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in enhanced StackOverflow collection:', error)
    return new Response(
      JSON.stringify({ 
        candidates: [], 
        total: 0, 
        source: 'stackoverflow',
        error: 'Enhanced StackOverflow collection failed',
        error_details: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
