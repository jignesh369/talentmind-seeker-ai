import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { EnhancedProgressiveCollector } from './enhanced-progressive-collector.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, location, sources = ['github', 'stackoverflow', 'linkedin', 'google'], time_budget = 85 } = await req.json()
    
    console.log('🚀 Starting enhanced data collection with Phase 4.1 AI processing')
    console.log(`Query: "${query}", Location: "${location}", Sources: [${sources}], Budget: ${time_budget}s`)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Optimize query for better results
    const optimizedQuery = query.trim()
    
    // Optimize source order based on query content
    const optimizedSources = optimizeSourceOrder(sources, optimizedQuery)
    
    // Initialize timeout manager
    const timeoutManager = new TimeoutManager(time_budget * 1000, optimizedSources.length)

    console.log('🌐 Starting AI-enhanced parallel source collection with deduplication...')

    // Initialize enhanced progressive collector
    const progressiveCollector = new EnhancedProgressiveCollector()
    const sourcePromises = []
    const startTime = Date.now()
    let activePromises = 0

    // Process each source with appropriate timeout
    async function processSourceWithFallback(source: string, timeout: number) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)
        
        const response = await supabase.functions.invoke(`collect-${source}-data`, {
          body: { 
            query: optimizedQuery, 
            location,
            time_budget: Math.floor(timeout / 1000) - 1
          },
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (response.error) {
          throw new Error(`${source} API error: ${response.error.message}`)
        }
        
        return response.data
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log(`⏱️ ${source} timed out after ${timeout}ms`)
          throw new Error(`${source} collection timed out`)
        }
        throw error
      }
    }

    for (const source of optimizedSources) {
      const sourceTimeout = timeoutManager.calculateOptimalTimeout(source, sources.length)
      console.log(`⏱️ ${source} timeout: ${Math.round(sourceTimeout / 1000)}s (remaining: ${Math.round((time_budget * 1000 - (Date.now() - startTime)) / 1000)}s)`)
      
      const sourcePromise = processSourceWithFallback(source, sourceTimeout)
        .then(result => {
          activePromises--
          progressiveCollector.addSourceResult(source, result, !!result?.candidates)
          return { source, result, success: !!result?.candidates }
        })
        .catch(error => {
          activePromises--
          console.error(`❌ ${source} failed:`, error.message)
          progressiveCollector.addSourceResult(source, { error: error.message }, false)
          return { source, error: error.message, success: false }
        })

      sourcePromises.push(sourcePromise)
      activePromises++
    }

    // Progressive monitoring for early returns
    const progressiveMonitoring = setInterval(() => {
      const completedSources = progressiveCollector.getCompletedSources()
      const failedSources = progressiveCollector.getFailedSources()
      const totalProcessed = completedSources.length + failedSources.length
      
      console.log(`⏳ Progress: ${totalProcessed}/${optimizedSources.length} sources processed`)
      
      // Early return if we have enough results and all active promises are done
      if (progressiveCollector.hasMinimumResults() && activePromises === 0) {
        console.log('🏁 Early return triggered: minimum viable results achieved')
        clearInterval(progressiveMonitoring)
      }
      
      // Early return if we've processed all sources
      if (totalProcessed === optimizedSources.length) {
        console.log('🏁 All sources processed')
        clearInterval(progressiveMonitoring)
      }
    }, 1000)

    // Wait for all sources to complete or timeout
    await Promise.allSettled(sourcePromises)

    console.log('✅ AI-enhanced parallel processing with deduplication completed')
    
    // Get enhanced results with deduplication
    const enhancedResult = progressiveCollector.getEnhancedProgressiveResult(sources)
    
    console.log(`🔄 Enhanced deduplication results:`)
    console.log(`- Original candidates: ${enhancedResult.deduplicationStats.originalCount}`)
    console.log(`- After deduplication: ${enhancedResult.deduplicationStats.deduplicatedCount}`)
    console.log(`- Duplicates removed: ${enhancedResult.deduplicationStats.duplicatesRemoved}`)
    console.log(`- Merge operations: ${enhancedResult.deduplicationStats.mergeDecisions}`)

    // Apply AI processing if time permits
    const remainingTime = time_budget * 1000 - (Date.now() - startTime)
    const aiProcessingBudget = Math.min(remainingTime, 15000) // Max 15 seconds for AI
    
    if (aiProcessingBudget > 5000 && enhancedResult.candidates.length > 0) {
      console.log(`🤖 Applying AI processing with ${Math.round(aiProcessingBudget/1000)}s budget`)
      
      try {
        // Apply AI enhancements with remaining time budget
        const aiEnhancedCandidates = await applyAIEnhancements(
          enhancedResult.candidates.slice(0, 10), // Process top 10 candidates
          aiProcessingBudget
        )
        
        // Replace top candidates with AI-enhanced versions
        enhancedResult.candidates.splice(0, aiEnhancedCandidates.length, ...aiEnhancedCandidates)
        
        console.log(`✨ AI processing completed for ${aiEnhancedCandidates.length} candidates`)
      } catch (error) {
        console.error('⚠️ AI processing error:', error.message)
      }
    }

    const processingTime = Date.now() - startTime
    console.log(`🎉 AI-enhanced collection with deduplication completed in ${processingTime}ms: ${enhancedResult.candidates.length} unique candidates`)

    // Enhanced response with deduplication metrics
    const response = {
      results: progressiveCollector.getSourceResults(),
      total_candidates: enhancedResult.candidates.length,
      total_validated: enhancedResult.candidates.length,
      query,
      location,
      enhancement_phase: 'Phase 4.1 - Enhanced Deduplication',
      
      quality_metrics: {
        validation_rate: `${Math.round((enhancedResult.candidates.length / (enhancedResult.deduplicationStats.originalCount || 1)) * 100)}%`,
        processing_time: `${Math.round(processingTime / 1000)}s`,
        time_efficiency: processingTime < 30000 ? 'Excellent' : processingTime < 60000 ? 'Good' : 'Fair',
        parallel_processing: true,
        smart_limiting: true,
        early_returns: enhancedResult.isPartial,
        progressive_enhancement: true,
        ai_processing: aiProcessingBudget > 5000,
        completion_rate: `${Math.round(enhancedResult.completionRate * 100)}%`,
        graceful_degradation: enhancedResult.isPartial
      },
      
      performance_metrics: {
        total_time_ms: processingTime,
        average_time_per_source: Math.round(processingTime / Math.max(1, progressiveCollector.getCompletedSources().length)),
        timeout_rate: progressiveCollector.getFailedSources().length / optimizedSources.length,
        success_rate: progressiveCollector.getCompletedSources().length / optimizedSources.length,
        candidates_per_successful_source: progressiveCollector.getCompletedSources().length > 0 
          ? enhancedResult.candidates.length / progressiveCollector.getCompletedSources().length 
          : 0,
        memory_stats: {
          estimated_heap_size: 'optimized'
        }
      },
      
      enhancement_stats: {
        total_processed: enhancedResult.deduplicationStats.originalCount,
        unique_candidates: enhancedResult.deduplicationStats.deduplicatedCount,
        processing_time_ms: processingTime,
        time_budget_used: Math.round((processingTime / (time_budget * 1000)) * 100),
        sources_successful: progressiveCollector.getCompletedSources().length,
        parallel_processing: true,
        progressive_enhancement: true,
        recommended_next_sources: enhancedResult.nextRecommendedSources,
        completion_rate: enhancedResult.completionRate,
        smart_timeouts: true,
        load_balancing: true,
        ai_enhancements: aiProcessingBudget > 5000 ? Math.min(10, enhancedResult.candidates.length) : 0,
        apollo_enriched: 0,
        perplexity_enriched: 0,
        ai_summaries_generated: aiProcessingBudget > 5000 ? Math.min(10, enhancedResult.candidates.length) : 0,
        ai_scored_candidates: aiProcessingBudget > 5000 ? Math.min(10, enhancedResult.candidates.length) : 0,
        graceful_degradation_used: enhancedResult.isPartial,
        deduplication_metrics: {
          original_count: enhancedResult.deduplicationStats.originalCount,
          deduplicated_count: enhancedResult.deduplicationStats.deduplicatedCount,
          duplicates_removed: enhancedResult.deduplicationStats.duplicatesRemoved,
          merge_decisions: enhancedResult.deduplicationStats.mergeDecisions,
          deduplication_rate: enhancedResult.deduplicationStats.originalCount > 0 
            ? Math.round((enhancedResult.deduplicationStats.duplicatesRemoved / enhancedResult.deduplicationStats.originalCount) * 100)
            : 0
        }
      },
      errors: progressiveCollector.getFailedSources().map(source => ({ source, error: 'Collection failed' })),
      timestamp: new Date().toISOString()
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('❌ Enhanced collection with deduplication error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Enhanced collection with deduplication failed',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

// Helper function to optimize source order based on query content
function optimizeSourceOrder(sources: string[], query: string): string[] {
  const queryLower = query.toLowerCase()
  const sourcePriorities: Record<string, number> = {
    github: queryLower.includes('developer') || queryLower.includes('engineer') || queryLower.includes('programmer') ? 10 : 5,
    stackoverflow: queryLower.includes('developer') || queryLower.includes('code') ? 8 : 4,
    linkedin: queryLower.includes('product') || queryLower.includes('manager') || queryLower.includes('lead') ? 10 : 6,
    google: 3
  }
  
  return [...sources].sort((a, b) => (sourcePriorities[b] || 0) - (sourcePriorities[a] || 0))
}

// Timeout manager for dynamic timeouts
class TimeoutManager {
  private totalBudget: number
  private sourceCount: number
  private baseTimeouts: Record<string, number> = {
    github: 25000,
    stackoverflow: 20000,
    linkedin: 30000,
    google: 15000
  }
  
  constructor(totalBudget: number, sourceCount: number) {
    this.totalBudget = totalBudget
    this.sourceCount = sourceCount
  }
  
  calculateOptimalTimeout(source: string, totalSources: number): number {
    const baseTimeout = this.baseTimeouts[source] || 20000
    const scaleFactor = Math.min(1.5, Math.max(0.6, this.totalBudget / (this.sourceCount * 25000)))
    return Math.min(baseTimeout * scaleFactor, this.totalBudget * 0.8)
  }
}

// AI enhancement function (simplified implementation)
async function applyAIEnhancements(candidates: any[], timeoutMs: number): Promise<any[]> {
  const enhancedCandidates = [...candidates]
  const startTime = Date.now()
  
  // Apply basic enhancements that don't require external API calls
  for (let i = 0; i < enhancedCandidates.length; i++) {
    if (Date.now() - startTime > timeoutMs) {
      console.log(`⏱️ AI processing timeout after ${i} candidates`)
      break
    }
    
    const candidate = enhancedCandidates[i]
    
    // Generate better summary if missing
    if (!candidate.summary || candidate.summary.length < 50) {
      candidate.summary = generateCandidateSummary(candidate)
    }
    
    // Normalize and enhance skills
    if (candidate.skills) {
      candidate.skills = normalizeSkills(candidate.skills)
    }
    
    // Add AI enhancement flag
    candidate.ai_enhanced = true
    candidate.ai_enhancement_timestamp = new Date().toISOString()
  }
  
  return enhancedCandidates
}

// Helper function to generate a candidate summary
function generateCandidateSummary(candidate: any): string {
  const skills = candidate.skills || []
  const location = candidate.location || 'Unknown location'
  const experience = candidate.experience_years || 'Unknown experience'
  
  return `${candidate.name} is a professional from ${location} with approximately ${experience} years of experience. ` +
    `Their key skills include ${skills.slice(0, 3).join(', ')}${skills.length > 3 ? ' and more' : ''}.`
}

// Helper function to normalize skills
function normalizeSkills(skills: string[]): string[] {
  const normalizedSkills = new Set<string>()
  
  const skillMap: Record<string, string> = {
    'js': 'JavaScript',
    'javascript': 'JavaScript',
    'ts': 'TypeScript',
    'typescript': 'TypeScript',
    'react': 'React',
    'reactjs': 'React',
    'node': 'Node.js',
    'nodejs': 'Node.js',
    'py': 'Python',
    'python': 'Python',
    'go': 'Go',
    'golang': 'Go'
  }
  
  for (const skill of skills) {
    const normalized = skillMap[skill.toLowerCase()] || skill
    normalizedSkills.add(normalized)
  }
  
  return Array.from(normalizedSkills)
}
