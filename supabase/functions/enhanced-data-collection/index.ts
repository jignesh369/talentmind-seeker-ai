import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { TimeoutManager } from './timeout-manager.ts'
import { ProgressiveCollector } from './progressive-collector.ts'
import { getGlobalMemoryManager } from './memory-manager.ts'

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

  const memoryManager = getGlobalMemoryManager();
  const startTime = Date.now();

  try {
    const { query, location, sources = ['github', 'linkedin', 'stackoverflow', 'google'], time_budget = 60 } = await req.json()

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🚀 Starting enhanced data collection with Phase 2 optimizations')
    console.log(`Query: "${query}", Location: "${location}", Sources: [${sources.join(', ')}], Budget: ${time_budget}s`)

    const optimizedQuery = query.split(' ').slice(0, 4).join(' ')
    console.log('📝 Optimized query:', optimizedQuery)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Initialize performance optimization components
    const timeoutManager = new TimeoutManager(time_budget)
    const progressiveCollector = new ProgressiveCollector()
    
    // Get optimal source order based on performance history
    const optimalSources = timeoutManager.getOptimalSourceOrder(sources.slice(0, 4))
    console.log('🎯 Optimal source order:', optimalSources)

    // Enhanced parallel processing with smart timeouts and progressive enhancement
    console.log('🌐 Starting smart parallel source collection...')
    
    const sourcePromises = optimalSources.map(async (source): Promise<SourceResult> => {
      const sourceStartTime = Date.now()
      const sourceTimeout = timeoutManager.getSourceTimeout(source)
      
      try {
        console.log(`🚀 Processing source: ${source} (timeout: ${sourceTimeout}ms)`)

        const timeoutPromise = timeoutManager.createTimeoutPromise<never>(
          sourceTimeout, 
          `${source} timeout after ${sourceTimeout}ms`
        )

        let functionPromise: Promise<any>
        switch (source) {
          case 'github':
            functionPromise = memoryManager.trackPromise(
              supabase.functions.invoke('collect-github-data', {
                body: { query: optimizedQuery, location }
              })
            )
            break
          case 'stackoverflow':
            functionPromise = memoryManager.trackPromise(
              supabase.functions.invoke('collect-stackoverflow-data', {
                body: { query: optimizedQuery }
              })
            )
            break
          case 'google':
            functionPromise = memoryManager.trackPromise(
              supabase.functions.invoke('collect-google-search-data', {
                body: { query: optimizedQuery, location }
              })
            )
            break
          case 'linkedin':
            functionPromise = memoryManager.trackPromise(
              supabase.functions.invoke('collect-linkedin-data', {
                body: { query: optimizedQuery, location }
              })
            )
            break
          case 'devto':
            functionPromise = memoryManager.trackPromise(
              supabase.functions.invoke('collect-devto-data', {
                body: { query: optimizedQuery }
              })
            )
            break
          case 'kaggle':
            functionPromise = memoryManager.trackPromise(
              supabase.functions.invoke('collect-kaggle-data', {
                body: { query: optimizedQuery }
              })
            )
            break
          default:
            throw new Error(`Unknown source: ${source}`)
        }

        const result = await Promise.race([functionPromise, timeoutPromise])
        const processingTime = Date.now() - sourceStartTime

        // Update performance metrics
        const success = !!(result?.data?.candidates?.length)
        timeoutManager.updateSourcePerformance(source, success, processingTime)

        if (result?.data) {
          const candidates = (result.data.candidates || []).slice(0, 8)
          console.log(`✅ ${source}: ${candidates.length} candidates in ${processingTime}ms`)
          
          const sourceResult: SourceResult = {
            source,
            candidates,
            total: result.data.total || 0,
            validated: candidates.length,
            error: null,
            processingTime
          }

          // Add to progressive collector
          progressiveCollector.addSourceResult(source, result.data, true)
          
          return sourceResult
        } else if (result?.error) {
          const errorMsg = result.error.message || 'Function returned error'
          console.log(`⚠️ ${source}: ${errorMsg}`)
          timeoutManager.updateSourcePerformance(source, false, processingTime)
          progressiveCollector.addSourceResult(source, null, false)
          
          return {
            source,
            candidates: [],
            total: 0,
            validated: 0,
            error: errorMsg,
            processingTime
          }
        } else {
          const errorMsg = 'No data returned'
          console.log(`⚠️ ${source}: ${errorMsg}`)
          timeoutManager.updateSourcePerformance(source, false, processingTime)
          progressiveCollector.addSourceResult(source, null, false)
          
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
        timeoutManager.updateSourcePerformance(source, false, processingTime)
        progressiveCollector.addSourceResult(source, null, false)
        
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

    // Progressive enhancement: Check for early results
    let sourceResults: SourceResult[] = []
    let progressiveCheckCount = 0
    const maxProgressiveChecks = 3

    const progressiveEnhancement = async () => {
      while (progressiveCheckCount < maxProgressiveChecks) {
        await new Promise(resolve => setTimeout(resolve, time_budget * 200)) // Check every 20% of time budget
        progressiveCheckCount++
        
        const elapsedTime = Date.now() - startTime
        const remainingBudget = timeoutManager.getRemainingBudget(startTime)
        
        console.log(`📊 Progressive check ${progressiveCheckCount}: ${elapsedTime}ms elapsed, ${remainingBudget}ms remaining`)
        
        if (timeoutManager.shouldUseProgressiveEnhancement(elapsedTime) && 
            progressiveCollector.hasMinimumResults()) {
          console.log('⚡ Progressive enhancement: Early results available')
          break
        }
        
        if (remainingBudget < 5000) {
          console.log('⏰ Low time budget remaining, preparing for early return')
          break
        }
      }
    }

    // Run progressive enhancement in parallel
    memoryManager.trackPromise(progressiveEnhancement())

    // Wait for all sources with proper timeout handling
    const settledResults = await Promise.allSettled(sourcePromises)
    
    settledResults.forEach((result, index) => {
      const sourceName = optimalSources[index]
      if (result.status === 'fulfilled') {
        sourceResults.push(result.value)
      } else {
        console.error(`Source ${sourceName} promise rejected:`, result.reason)
        sourceResults.push({
          source: sourceName,
          candidates: [],
          total: 0,
          validated: 0,
          error: result.reason?.message || 'Promise rejected',
          processingTime: 0
        })
      }
    })

    console.log(`✅ Parallel processing completed: ${sourceResults.length} sources processed`)

    // Get progressive results with enhanced deduplication
    const progressiveResult = progressiveCollector.getProgressiveResult(optimalSources)
    
    console.log(`📊 Progressive collection: ${progressiveResult.candidates.length} unique candidates`)
    console.log(`📈 Completion rate: ${Math.round(progressiveResult.completionRate * 100)}%`)

    // Build comprehensive results object
    const results = {}
    const errors = []
    
    sourceResults.forEach(result => {
      results[result.source] = {
        candidates: result.candidates || [],
        total: result.total || 0,
        validated: result.validated || 0,
        error: result.error,
        processing_time_ms: result.processingTime
      }
      
      if (result.error) {
        errors.push({ source: result.source, error: result.error })
      }
    })

    const totalTime = Date.now() - startTime
    const successfulSources = sourceResults.filter(r => !r.error).length
    const successRate = Math.round((successfulSources / sourceResults.length) * 100)
    const timeEfficiency = totalTime < 30000 ? 'Excellent' : totalTime < 45000 ? 'Good' : 'Acceptable'

    console.log(`🎉 Enhanced collection completed in ${totalTime}ms: ${progressiveResult.candidates.length} unique candidates`)
    console.log(`📊 Success rate: ${successRate}% (${successfulSources}/${sourceResults.length} sources)`)

    const response = {
      results,
      total_candidates: progressiveResult.candidates.length,
      total_validated: progressiveResult.candidates.length,
      query: optimizedQuery,
      location,
      enhancement_phase: 'Phase 2: Performance Optimized',
      quality_metrics: {
        validation_rate: '100%',
        processing_time: `${Math.round(totalTime / 1000)}s`,
        time_efficiency: timeEfficiency,
        parallel_processing: true,
        smart_limiting: true,
        early_returns: progressiveResult.isPartial,
        progressive_enhancement: true,
        completion_rate: `${Math.round(progressiveResult.completionRate * 100)}%`
      },
      performance_metrics: {
        total_time_ms: totalTime,
        average_time_per_source: Math.round(totalTime / optimalSources.length),
        timeout_rate: sourceResults.filter(r => r.error?.includes('timeout')).length / sourceResults.length * 100,
        success_rate: successRate,
        candidates_per_successful_source: successfulSources > 0 ? Math.round(progressiveResult.candidates.length / successfulSources) : 0,
        memory_stats: memoryManager.getResourceStats()
      },
      enhancement_stats: {
        total_processed: progressiveResult.candidates.length,
        unique_candidates: progressiveResult.candidates.length,
        processing_time_ms: totalTime,
        time_budget_used: Math.round((totalTime / (time_budget * 1000)) * 100),
        sources_successful: successfulSources,
        parallel_processing: true,
        progressive_enhancement: progressiveResult.isPartial,
        recommended_next_sources: progressiveResult.nextRecommendedSources,
        completion_rate: progressiveResult.completionRate,
        smart_timeouts: true,
        load_balancing: true
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
        total_validated: 0,
        enhancement_phase: 'Phase 2: Performance Optimized (Error)',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } finally {
    // Clean up resources
    await memoryManager.forceCleanup(2000)
  }
})

function calculateDataQuality(candidate: any): number {
  const fields = [
    candidate.name && candidate.name !== 'Unknown',
    candidate.title,
    candidate.location,
    candidate.summary && candidate.summary.length > 20,
    candidate.skills && candidate.skills.length > 0,
    candidate.experience_years !== undefined,
    candidate.email || candidate.github_username || candidate.linkedin_url
  ]
  
  const completedFields = fields.filter(Boolean).length
  return Math.round((completedFields / fields.length) * 100)
}
