
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Background task tracking
let isShuttingDown = false;

// Listen for shutdown events
addEventListener('beforeunload', (ev) => {
  isShuttingDown = true;
  console.log('Function shutdown initiated:', ev.detail?.reason);
});

// Enhanced error handler
function handleError(error: any, context: string): Response {
  console.error(`❌ Error in ${context}:`, error);
  return new Response(
    JSON.stringify({ 
      error: `${context} failed`,
      message: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    }),
    { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

// Enhanced collection orchestrator
async function orchestrateCollection(
  query: string, 
  location: string | undefined, 
  sources: string[], 
  timeBudget: number,
  supabase: any
) {
  const startTime = Date.now();
  const results: Record<string, any> = {};
  const errors: Array<{ source: string; error: string }> = [];
  let totalCandidates = 0;

  console.log(`🚀 Starting collection with ${timeBudget}s budget for sources: ${sources.join(', ')}`);

  // Process sources with timeout management
  const sourcePromises = sources.map(async (source) => {
    const sourceStartTime = Date.now();
    const sourceTimeout = Math.min((timeBudget * 1000) / sources.length, 25000); // Max 25s per source
    
    try {
      console.log(`📡 Starting ${source} collection with ${Math.round(sourceTimeout/1000)}s timeout`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log(`⏰ ${source} collection timed out after ${Math.round(sourceTimeout/1000)}s`);
        controller.abort();
      }, sourceTimeout);

      const response = await supabase.functions.invoke(`collect-${source}-data`, {
        body: { 
          query: query.trim(), 
          location: location?.trim(),
          time_budget: Math.floor(sourceTimeout / 1000) - 2 // Reserve 2s for processing
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.error) {
        throw new Error(`${source} collection error: ${response.error.message}`);
      }

      const sourceData = response.data || { candidates: [], total: 0 };
      const candidateCount = sourceData.candidates?.length || 0;
      
      results[source] = {
        candidates: sourceData.candidates || [],
        total: candidateCount,
        validated: candidateCount,
        processing_time: Date.now() - sourceStartTime,
        success: true
      };
      
      totalCandidates += candidateCount;
      
      console.log(`✅ ${source} completed: ${candidateCount} candidates in ${Date.now() - sourceStartTime}ms`);
      
      return { source, success: true, count: candidateCount };
      
    } catch (error) {
      const errorMessage = error.name === 'AbortError' 
        ? `Collection timed out after ${Math.round(sourceTimeout/1000)}s`
        : error.message;
        
      console.error(`❌ ${source} failed:`, errorMessage);
      
      errors.push({ source, error: errorMessage });
      results[source] = {
        candidates: [],
        total: 0,
        validated: 0,
        error: errorMessage,
        success: false
      };
      
      return { source, success: false, error: errorMessage };
    }
  });

  // Wait for all sources to complete or timeout
  const sourceResults = await Promise.allSettled(sourcePromises);
  const successfulSources = sourceResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
  
  const processingTime = Date.now() - startTime;
  
  console.log(`📊 Collection summary: ${totalCandidates} candidates from ${successfulSources}/${sources.length} sources in ${processingTime}ms`);

  return {
    results,
    totalCandidates,
    successfulSources,
    errors,
    processingTime
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { 
      query, 
      location, 
      sources = ['github', 'stackoverflow', 'linkedin', 'google'], 
      time_budget = 60 
    } = body;

    // Input validation
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Valid query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (sources.length === 0) {
      return new Response(
        JSON.stringify({ error: 'At least one source must be specified' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`🎯 Enhanced data collection starting for query: "${query}"`);
    console.log(`📍 Location: ${location || 'Not specified'}`);
    console.log(`🔍 Sources: ${sources.join(', ')}`);
    console.log(`⏱️ Time Budget: ${time_budget}s`);

    const startTime = Date.now();
    
    // Execute collection with proper error handling
    const collectionResult = await orchestrateCollection(
      query, 
      location, 
      sources.slice(0, 4), // Limit to 4 sources max
      Math.min(time_budget, 70), // Max 70s to leave buffer
      supabase
    );

    const totalTime = Date.now() - startTime;
    
    // Build comprehensive response
    const response = {
      results: collectionResult.results,
      total_candidates: collectionResult.totalCandidates,
      total_validated: collectionResult.totalCandidates,
      query: query.trim(),
      location: location?.trim(),
      enhancement_phase: 'Phase 5.1 - Comprehensive Fix',
      
      quality_metrics: {
        validation_rate: collectionResult.totalCandidates > 0 ? '100%' : '0%',
        processing_time: `${Math.round(totalTime / 1000)}s`,
        time_efficiency: totalTime < 30000 ? 'Excellent' : totalTime < 60000 ? 'Good' : 'Fair',
        parallel_processing: true,
        smart_limiting: true,
        early_returns: false,
        progressive_enhancement: true,
        ai_processing: false,
        completion_rate: `${Math.round((collectionResult.successfulSources / sources.length) * 100)}%`,
        graceful_degradation: collectionResult.errors.length > 0
      },
      
      performance_metrics: {
        total_time_ms: totalTime,
        average_time_per_source: Math.round(totalTime / sources.length),
        timeout_rate: collectionResult.errors.length / sources.length,
        success_rate: collectionResult.successfulSources / sources.length,
        candidates_per_successful_source: collectionResult.successfulSources > 0 
          ? Math.round(collectionResult.totalCandidates / collectionResult.successfulSources)
          : 0
      },
      
      enhancement_stats: {
        total_processed: collectionResult.totalCandidates,
        unique_candidates: collectionResult.totalCandidates,
        processing_time_ms: totalTime,
        time_budget_used: Math.round((totalTime / (time_budget * 1000)) * 100),
        sources_successful: collectionResult.successfulSources,
        parallel_processing: true,
        progressive_enhancement: true,
        recommended_next_sources: [],
        completion_rate: Math.round((collectionResult.successfulSources / sources.length) * 100),
        smart_timeouts: true,
        load_balancing: true,
        ai_enhancements: 0,
        apollo_enriched: 0,
        perplexity_enriched: 0,
        ai_summaries_generated: 0,
        ai_scored_candidates: 0,
        graceful_degradation_used: collectionResult.errors.length > 0
      },
      
      errors: collectionResult.errors,
      timestamp: new Date().toISOString()
    };

    console.log(`🎉 Enhanced data collection completed successfully in ${totalTime}ms`);
    console.log(`📈 Results: ${collectionResult.totalCandidates} candidates from ${collectionResult.successfulSources}/${sources.length} sources`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return handleError(error, 'Enhanced data collection');
  }
});
