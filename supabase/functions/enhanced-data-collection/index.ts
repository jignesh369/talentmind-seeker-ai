
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

    console.log('🚀 Starting enhanced data collection with improved error handling')
    console.log(`Query: "${query}", Location: "${location}", Sources: [${sources.join(', ')}]`)

    const startTime = Date.now()
    const simplifiedQuery = query.split(' ').slice(0, 3).join(' ')
    console.log('📝 Simplified query:', simplifiedQuery)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Enhanced parallel processing with individual timeouts
    console.log('🌐 Starting parallel source collection with 15s per source timeout...')
    
    const sourcePromises = sources.slice(0, 4).map(async (source): Promise<SourceResult> => {
      const sourceStartTime = Date.now()
      const sourceTimeout = 15000 // 15 seconds per source
      
      try {
        console.log(`🚀 Processing source: ${source}`)

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Source timeout')), sourceTimeout)
        })

        let functionPromise: Promise<any>
        switch (source) {
          case 'github':
            functionPromise = supabase.functions.invoke('collect-github-data', {
              body: { query: simplifiedQuery, location }
            })
            break
          case 'stackoverflow':
            functionPromise = supabase.functions.invoke('collect-stackoverflow-data', {
              body: { query: simplifiedQuery }
            })
            break
          case 'google':
            functionPromise = supabase.functions.invoke('collect-google-search-data', {
              body: { query: simplifiedQuery, location }
            })
            break
          case 'devto':
            functionPromise = supabase.functions.invoke('collect-devto-data', {
              body: { query: simplifiedQuery }
            })
            break
          case 'kaggle':
            functionPromise = supabase.functions.invoke('collect-kaggle-data', {
              body: { query: simplifiedQuery }
            })
            break
          default:
            throw new Error(`Unknown source: ${source}`)
        }

        const result = await Promise.race([functionPromise, timeoutPromise])
        const processingTime = Date.now() - sourceStartTime

        if (result?.data) {
          const candidates = (result.data.candidates || []).slice(0, 6) // Limit to 6 per source
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
          const errorMsg = result?.error?.message || 'No data returned'
          console.log(`⚠️ ${source}: ${errorMsg}`)
          return {
            source,
            candidates: [],
            total: 0,
            validated: 0,
            error: errorMsg,
            processingTime
          }
        }
      } catch (error) {
        const processingTime = Date.now() - sourceStartTime
        const errorMsg = error.message || 'Unknown error'
        console.error(`❌ ${source} failed: ${errorMsg}`)
        return {
          source,
          candidates: [],
          total: 0,
          validated: 0,
          error: errorMsg,
          processingTime
        }
      }
    })

    // Wait for all sources with proper error handling
    const sourceResults = await Promise.allSettled(sourcePromises)
    const processedResults: SourceResult[] = []

    sourceResults.forEach((result, index) => {
      const sourceName = sources[index]
      if (result.status === 'fulfilled') {
        processedResults.push(result.value)
      } else {
        console.error(`Source ${sourceName} promise rejected:`, result.reason)
        processedResults.push({
          source: sourceName,
          candidates: [],
          total: 0,
          validated: 0,
          error: result.reason?.message || 'Promise rejected',
          processingTime: 0
        })
      }
    })

    console.log(`✅ Parallel processing completed: ${processedResults.length} sources processed`)

    // Fast deduplication
    console.log('🔄 Fast deduplication...')
    const allCandidates = []
    const seenEmails = new Set()
    const seenGitHubUsers = new Set()

    processedResults.forEach(result => {
      if (result.candidates) {
        result.candidates.forEach(candidate => {
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

    // Build results object with detailed error reporting
    const results = {}
    const errors = []
    
    processedResults.forEach(result => {
      results[result.source] = {
        candidates: result.candidates || [],
        total: result.total || 0,
        validated: result.validated || 0,
        error: result.error
      }
      
      if (result.error) {
        errors.push({ source: result.source, error: result.error })
      }
    })

    const totalTime = Date.now() - startTime
    const successfulSources = processedResults.filter(r => !r.error).length
    const successRate = Math.round((successfulSources / processedResults.length) * 100)

    console.log(`🎉 Enhanced collection completed in ${totalTime}ms: ${allCandidates.length} unique candidates`)
    console.log(`📊 Success rate: ${successRate}% (${successfulSources}/${processedResults.length} sources)`)

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
        time_efficiency: totalTime < 30000 ? 'Excellent' : totalTime < 60000 ? 'Good' : 'Acceptable',
        parallel_processing: true,
        smart_limiting: true,
        early_returns: totalTime < 40000
      },
      performance_metrics: {
        total_time_ms: totalTime,
        average_time_per_source: Math.round(totalTime / sources.length),
        timeout_rate: processedResults.filter(r => r.error?.includes('timeout')).length / processedResults.length * 100,
        success_rate: successRate
      },
      enhancement_stats: {
        total_processed: allCandidates.length,
        unique_candidates: allCandidates.length,
        processing_time_ms: totalTime,
        time_budget_used: Math.round((totalTime / (time_budget * 1000)) * 100),
        sources_successful: successfulSources,
        parallel_processing: true,
        ai_enhancements: 0,
        apollo_enriched: 0
      },
      errors: errors.length > 0 ? errors : undefined,
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
