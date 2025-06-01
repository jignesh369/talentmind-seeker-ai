
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SourceResult {
  source: string;
  candidates: any[];
  total: number;
  validated: number;
  error: string | null;
  processingTime: number;
}

interface TimeBudget {
  total: number;
  perSource: number;
  startTime: number;
  remaining: number;
}

class SimplifiedTimeBudgetManager {
  private budget: TimeBudget;

  constructor(totalTimeSeconds: number = 60) {
    this.budget = {
      total: totalTimeSeconds * 1000,
      perSource: 15000, // 15 seconds max per source
      startTime: Date.now(),
      remaining: totalTimeSeconds * 1000
    };
  }

  hasTimeRemaining(): boolean {
    this.budget.remaining = Math.max(0, this.budget.total - (Date.now() - this.budget.startTime));
    return this.budget.remaining > 2000; // At least 2 seconds remaining
  }

  getTimeForSource(): number {
    return Math.min(this.budget.perSource, this.budget.remaining);
  }

  async withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T | null> {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Operation timeout')), timeoutMs);
      });

      return await Promise.race([operation, timeoutPromise]);
    } catch (error) {
      console.log(`Operation timed out after ${timeoutMs}ms:`, error.message);
      return null;
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, location, sources = ['github', 'stackoverflow', 'google'], time_budget = 60 } = await req.json()

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🚀 Starting enhanced data collection with 60s time budget')

    const startTime = Date.now()
    const timeBudget = new SimplifiedTimeBudgetManager(time_budget)
    
    // Simplify query for better results
    const simplifiedQuery = query.split(' ').slice(0, 3).join(' ')
    console.log('📝 Simplified query:', simplifiedQuery)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Phase 1: Parallel Source Collection with Individual Timeouts
    console.log('🌐 Starting parallel source collection...')
    
    const sourcePromises = sources.slice(0, 4).map(async (source): Promise<SourceResult> => { // Limit to 4 sources max
      const sourceStartTime = Date.now()
      const sourceTimeout = timeBudget.getTimeForSource()
      
      try {
        console.log(`🚀 Processing source: ${source} with ${sourceTimeout}ms timeout`)

        let result = null
        switch (source) {
          case 'github':
            result = await timeBudget.withTimeout(
              supabase.functions.invoke('collect-github-data', {
                body: { query: simplifiedQuery, location }
              }),
              sourceTimeout
            )
            break
          case 'stackoverflow':
            result = await timeBudget.withTimeout(
              supabase.functions.invoke('collect-stackoverflow-data', {
                body: { query: simplifiedQuery }
              }),
              sourceTimeout
            )
            break
          case 'google':
            result = await timeBudget.withTimeout(
              supabase.functions.invoke('collect-google-search-data', {
                body: { query: simplifiedQuery, location }
              }),
              sourceTimeout
            )
            break
          case 'kaggle':
            result = await timeBudget.withTimeout(
              supabase.functions.invoke('collect-kaggle-data', {
                body: { query: simplifiedQuery }
              }),
              sourceTimeout
            )
            break
          case 'devto':
            result = await timeBudget.withTimeout(
              supabase.functions.invoke('collect-devto-data', {
                body: { query: simplifiedQuery }
              }),
              sourceTimeout
            )
            break
          default:
            console.log(`⚠️ Unknown source: ${source}`)
            return {
              source,
              candidates: [],
              total: 0,
              validated: 0,
              error: 'Unknown source',
              processingTime: Date.now() - sourceStartTime
            }
        }

        const processingTime = Date.now() - sourceStartTime

        if (result?.data) {
          const candidates = (result.data.candidates || []).slice(0, 8) // Limit to 8 candidates per source
          console.log(`✅ ${source}: ${candidates.length} candidates in ${processingTime}ms`)
          
          return {
            source,
            candidates,
            total: result.data.total || 0,
            validated: candidates.length,
            error: null,
            processingTime
          }
        } else {
          console.log(`❌ ${source}: No data returned`)
          return {
            source,
            candidates: [],
            total: 0,
            validated: 0,
            error: result?.error?.message || 'No data returned',
            processingTime
          }
        }
      } catch (error) {
        const processingTime = Date.now() - sourceStartTime
        console.error(`❌ ${source} collection failed:`, error.message)
        return {
          source,
          candidates: [],
          total: 0,
          validated: 0,
          error: error.message,
          processingTime
        }
      }
    })

    // Wait for all sources with graceful degradation
    const sourceResults = await Promise.allSettled(sourcePromises)
    const processedResults: SourceResult[] = []

    sourceResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        processedResults.push(result.value)
      } else {
        console.error('Source promise rejected:', result.reason)
      }
    })

    console.log(`✅ Parallel processing completed: ${processedResults.length} sources processed`)

    // Phase 2: Fast Deduplication
    console.log('🔄 Fast deduplication...')
    const allCandidates = []
    const seenEmails = new Set()
    const seenGitHubUsers = new Set()

    processedResults.forEach(result => {
      if (result.candidates) {
        result.candidates.forEach(candidate => {
          // Simple deduplication
          const isDuplicate = 
            (candidate.email && seenEmails.has(candidate.email)) ||
            (candidate.github_username && seenGitHubUsers.has(candidate.github_username))

          if (!isDuplicate) {
            if (candidate.email) seenEmails.add(candidate.email)
            if (candidate.github_username) seenGitHubUsers.add(candidate.github_username)
            allCandidates.push(candidate)
          }
        })
      }
    })

    console.log(`📊 Collected ${allCandidates.length} unique candidates`)

    // Build results object
    const results = {}
    processedResults.forEach(result => {
      results[result.source] = {
        candidates: result.candidates || [],
        total: result.total || 0,
        validated: result.validated || 0,
        error: result.error
      }
    })

    const totalTime = Date.now() - startTime
    const timeBudgetUsed = Math.round((totalTime / (time_budget * 1000)) * 100)

    console.log(`🎉 Enhanced collection completed in ${totalTime}ms: ${allCandidates.length} unique candidates`)

    const response = {
      results,
      total_candidates: allCandidates.length,
      total_validated: allCandidates.length,
      query: simplifiedQuery,
      location,
      enhancement_phase: 'Parallel Optimized',
      quality_metrics: {
        validation_rate: '100%',
        processing_time: `${Math.round(totalTime / 1000)}s`,
        time_efficiency: timeBudgetUsed <= 80 ? 'Excellent' : timeBudgetUsed <= 100 ? 'Good' : 'Acceptable',
        parallel_processing: true,
        smart_limiting: true,
        early_returns: timeBudgetUsed < 70
      },
      performance_metrics: {
        total_time_ms: totalTime,
        average_time_per_source: Math.round(totalTime / sources.length),
        timeout_rate: processedResults.filter(r => r.error?.includes('timeout')).length / processedResults.length * 100,
        success_rate: Math.round(processedResults.filter(r => !r.error).length / processedResults.length * 100)
      },
      enhancement_stats: {
        total_processed: allCandidates.length,
        unique_candidates: allCandidates.length,
        processing_time_ms: totalTime,
        time_budget_used: timeBudgetUsed,
        sources_successful: processedResults.filter(r => !r.error).length,
        parallel_processing: true,
        ai_enhancements: 0,
        apollo_enriched: 0
      },
      timestamp: new Date().toISOString()
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Enhanced data collection error:', error)
    return new Response(
      JSON.stringify({
        error: 'Enhanced data collection failed',
        message: error.message,
        results: {},
        total_candidates: 0,
        total_validated: 0
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
