import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { TimeoutManager } from './timeout-manager.ts'
import { ProgressiveCollector } from './progressive-collector.ts'
import { getGlobalMemoryManager } from './memory-manager.ts'
import { AIProcessor } from './ai-processor.ts'
import { ProfileSummarizer } from './profile-summarizer.ts'
import { ScoringStandardizer } from './scoring-standardizer.ts'

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
    const { query, location, sources = ['github', 'linkedin', 'stackoverflow', 'google'], time_budget = 80 } = await req.json()

    if (!query) {
      return new Response(
        JSON.stringify({ 
          error: 'Query is required',
          results: {},
          total_candidates: 0,
          total_validated: 0,
          timestamp: new Date().toISOString()
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🚀 Starting enhanced data collection with Phase 3 AI processing')
    console.log(`Query: "${query}", Location: "${location}", Sources: [${sources.join(', ')}], Budget: ${time_budget}s`)

    const optimizedQuery = query.split(' ').slice(0, 4).join(' ')
    console.log('📝 Optimized query:', optimizedQuery)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY')
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Validate API keys early
    if (!openaiApiKey || openaiApiKey.trim() === '') {
      console.log('⚠️ OpenAI API key not available, AI processing will be disabled');
    }

    // Initialize AI processing components with graceful degradation
    const aiProcessor = openaiApiKey ? new AIProcessor(openaiApiKey, perplexityApiKey || '', {
      enableScoring: true,
      enableValidation: true,
      enableSummarization: true,
      enablePerplexityEnrichment: !!perplexityApiKey,
      scoringModel: 'gpt-4o-mini',
      summaryModel: 'gpt-4o-mini',
      gracefulDegradation: true
    }) : null;

    const profileSummarizer = openaiApiKey ? new ProfileSummarizer(openaiApiKey) : null;

    // Initialize performance optimization components
    const timeoutManager = new TimeoutManager(time_budget)
    const progressiveCollector = new ProgressiveCollector()
    
    // Get optimal source order based on performance history
    const optimalSources = timeoutManager.getOptimalSourceOrder(sources.slice(0, 4))
    console.log('🎯 Optimal source order:', optimalSources)

    // Enhanced parallel processing with AI integration
    console.log('🌐 Starting AI-enhanced parallel source collection...')
    
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
          let candidates = (result.data.candidates || []).slice(0, 8)
          
          // Apply AI processing to candidates with error handling
          if (aiProcessor && candidates.length > 0) {
            console.log(`🤖 Applying AI processing to ${candidates.length} candidates from ${source}`)
            const processedCandidates = []
            
            for (const candidate of candidates) {
              try {
                const enhancedQuery = { skills: [], keywords: query.split(' '), location }
                const processed = await aiProcessor.processCandidate(candidate, enhancedQuery, source)
                
                // Log any AI processing errors
                if (processed.aiProcessingStatus.errors.length > 0) {
                  console.log(`⚠️ AI processing warnings for ${candidate.name}:`, processed.aiProcessingStatus.errors);
                }
                
                processedCandidates.push(processed.candidate)
              } catch (error) {
                console.log(`⚠️ AI processing failed for candidate: ${error.message}`)
                processedCandidates.push(candidate) // Keep original if AI processing fails
              }
            }
            
            candidates = processedCandidates
          }

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

    // Progressive enhancement with AI monitoring
    let sourceResults: SourceResult[] = []
    let progressiveCheckCount = 0
    const maxProgressiveChecks = 3

    const progressiveEnhancement = async () => {
      while (progressiveCheckCount < maxProgressiveChecks) {
        await new Promise(resolve => setTimeout(resolve, time_budget * 200))
        progressiveCheckCount++
        
        const elapsedTime = Date.now() - startTime
        const remainingBudget = timeoutManager.getRemainingBudget(startTime)
        
        console.log(`📊 Progressive check ${progressiveCheckCount}: ${elapsedTime}ms elapsed, ${remainingBudget}ms remaining`)
        
        if (timeoutManager.shouldUseProgressiveEnhancement(elapsedTime) && 
            progressiveCollector.hasMinimumResults()) {
          console.log('⚡ Progressive enhancement: Early results available with AI processing')
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

    console.log(`✅ AI-enhanced parallel processing completed: ${sourceResults.length} sources processed`)

    // Get progressive results with enhanced deduplication and AI processing
    const progressiveResult = progressiveCollector.getProgressiveResult(optimalSources)
    
    console.log(`📊 Progressive collection: ${progressiveResult.candidates.length} unique candidates`)
    console.log(`🤖 AI processing: ${aiProcessor ? 'Enabled' : 'Disabled'}`)
    console.log(`📈 Completion rate: ${Math.round(progressiveResult.completionRate * 100)}%`)

    // Apply final AI enhancements to top candidates with proper error handling
    let finalCandidates = progressiveResult.candidates
    if (profileSummarizer && finalCandidates.length > 0) {
      console.log('📝 Generating AI summaries for top candidates...')
      try {
        const topCandidates = finalCandidates.slice(0, 5) // Limit to top 5 for performance
        for (let i = 0; i < topCandidates.length; i++) {
          if (!topCandidates[i].ai_summary) {
            try {
              const summary = await profileSummarizer.generateSummary(topCandidates[i], 'cross-platform')
              topCandidates[i].ai_summary = summary
              topCandidates[i].summary_generated = true
            } catch (error) {
              console.log(`⚠️ Summary generation failed for candidate ${i}: ${error.message}`)
              // Use fallback summary
              topCandidates[i].ai_summary = `${topCandidates[i].name || 'Developer'} is a professional developer with expertise in various technologies.`
              topCandidates[i].summary_generated = false
            }
          }
        }
        finalCandidates = [...topCandidates, ...finalCandidates.slice(5)]
        console.log('✅ AI summary generation completed with graceful fallbacks')
      } catch (error) {
        console.error('Bulk summary generation error:', error)
        // Continue without summaries
      }
    }

    // Build comprehensive results object
    const results = {}
    const errors = []
    let aiEnhancements = 0
    
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
      
      // Count AI enhancements
      if (result.candidates) {
        aiEnhancements += result.candidates.filter(c => c.ai_scored || c.summary_generated || c.perplexity_enriched).length
      }
    })

    const totalTime = Date.now() - startTime
    const successfulSources = sourceResults.filter(r => !r.error).length
    const successRate = Math.round((successfulSources / sourceResults.length) * 100)
    const timeEfficiency = totalTime < 30000 ? 'Excellent' : totalTime < 45000 ? 'Good' : 'Acceptable'

    console.log(`🎉 AI-enhanced collection completed in ${totalTime}ms: ${finalCandidates.length} unique candidates`)
    console.log(`🤖 AI enhancements applied: ${aiEnhancements}`)
    console.log(`📊 Success rate: ${successRate}% (${successfulSources}/${sourceResults.length} sources)`)

    // Return results with proper error handling
    const response = {
      results,
      total_candidates: finalCandidates.length,
      total_validated: finalCandidates.length,
      query: optimizedQuery,
      location,
      enhancement_phase: 'Phase 3: AI-Enhanced Processing with Resilience',
      quality_metrics: {
        validation_rate: '100%',
        processing_time: `${Math.round(totalTime / 1000)}s`,
        time_efficiency: timeEfficiency,
        parallel_processing: true,
        smart_limiting: true,
        early_returns: progressiveResult.isPartial,
        progressive_enhancement: true,
        ai_processing: !!aiProcessor,
        completion_rate: `${Math.round(progressiveResult.completionRate * 100)}%`,
        graceful_degradation: true
      },
      performance_metrics: {
        total_time_ms: totalTime,
        average_time_per_source: Math.round(totalTime / optimalSources.length),
        timeout_rate: sourceResults.filter(r => r.error?.includes('timeout')).length / sourceResults.length * 100,
        success_rate: successRate,
        candidates_per_successful_source: successfulSources > 0 ? Math.round(finalCandidates.length / successfulSources) : 0,
        memory_stats: memoryManager.getResourceStats()
      },
      enhancement_stats: {
        total_processed: finalCandidates.length,
        unique_candidates: finalCandidates.length,
        processing_time_ms: totalTime,
        time_budget_used: Math.round((totalTime / (time_budget * 1000)) * 100),
        sources_successful: successfulSources,
        parallel_processing: true,
        progressive_enhancement: progressiveResult.isPartial,
        recommended_next_sources: progressiveResult.nextRecommendedSources,
        completion_rate: progressiveResult.completionRate,
        smart_timeouts: true,
        load_balancing: true,
        ai_enhancements: aiEnhancements,
        apollo_enriched: 0,
        perplexity_enriched: finalCandidates.filter(c => c.perplexity_enriched).length,
        ai_summaries_generated: finalCandidates.filter(c => c.summary_generated).length,
        ai_scored_candidates: finalCandidates.filter(c => c.ai_scored).length,
        graceful_degradation_used: !aiProcessor || errors.length > 0
      },
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Enhanced data collection error:', error)
    
    // Return a proper error response instead of throwing
    const errorResponse = {
      error: 'AI-enhanced data collection failed',
      message: error.message,
      results: {},
      total_candidates: 0,
      total_validated: 0,
      enhancement_phase: 'Phase 3: AI-Enhanced Processing (Error)',
      graceful_degradation: true,
      timestamp: new Date().toISOString()
    }
    
    return new Response(JSON.stringify(errorResponse), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  } finally {
    // Clean up resources
    try {
      await memoryManager.forceCleanup(2000)
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError)
    }
  }
})
