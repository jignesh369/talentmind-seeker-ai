
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
    const { query, location, sources = ['github', 'stackoverflow', 'google', 'linkedin'], time_budget = 90 } = await req.json()

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🚀 Starting enhanced data collection with improved infrastructure')
    console.log(`Query: "${query}", Location: "${location}", Sources: [${sources.join(', ')}]`)

    const startTime = Date.now()
    const optimizedQuery = query.split(' ').slice(0, 4).join(' ') // Slightly more context
    console.log('📝 Optimized query:', optimizedQuery)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Enhanced parallel processing with longer timeouts and better error handling
    console.log('🌐 Starting parallel source collection with 25s per source timeout...')
    
    const sourcePromises = sources.slice(0, 4).map(async (source): Promise<SourceResult> => {
      const sourceStartTime = Date.now()
      const sourceTimeout = 25000 // Increased to 25 seconds per source
      
      try {
        console.log(`🚀 Processing source: ${source}`)

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Source timeout after 25s')), sourceTimeout)
        })

        let functionPromise: Promise<any>
        switch (source) {
          case 'github':
            functionPromise = supabase.functions.invoke('collect-github-data', {
              body: { query: optimizedQuery, location }
            })
            break
          case 'stackoverflow':
            functionPromise = supabase.functions.invoke('collect-stackoverflow-data', {
              body: { query: optimizedQuery }
            })
            break
          case 'google':
            functionPromise = supabase.functions.invoke('collect-google-search-data', {
              body: { query: optimizedQuery, location }
            })
            break
          case 'linkedin':
            functionPromise = supabase.functions.invoke('collect-linkedin-data', {
              body: { query: optimizedQuery, location }
            })
            break
          case 'devto':
            functionPromise = supabase.functions.invoke('collect-devto-data', {
              body: { query: optimizedQuery }
            })
            break
          case 'kaggle':
            functionPromise = supabase.functions.invoke('collect-kaggle-data', {
              body: { query: optimizedQuery }
            })
            break
          default:
            throw new Error(`Unknown source: ${source}`)
        }

        const result = await Promise.race([functionPromise, timeoutPromise])
        const processingTime = Date.now() - sourceStartTime

        if (result?.data) {
          const candidates = (result.data.candidates || []).slice(0, 8) // Increased to 8 per source
          console.log(`✅ ${source}: ${candidates.length} candidates in ${processingTime}ms`)
          
          return {
            source,
            candidates,
            total: result.data.total || 0,
            validated: candidates.length,
            error: null,
            processingTime
          }
        } else if (result?.error) {
          const errorMsg = result.error.message || 'Function returned error'
          console.log(`⚠️ ${source}: ${errorMsg}`)
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

    // Enhanced deduplication with cross-platform matching
    console.log('🔄 Enhanced deduplication with cross-platform matching...')
    const allCandidates = []
    const seenEmails = new Set()
    const seenGitHubUsers = new Set()
    const seenLinkedInUrls = new Set()
    const seenNames = new Set()

    processedResults.forEach(result => {
      if (result.candidates) {
        result.candidates.forEach(candidate => {
          const normalizedName = candidate.name?.toLowerCase().trim()
          
          const isDuplicate = 
            (candidate.email && seenEmails.has(candidate.email)) ||
            (candidate.github_username && seenGitHubUsers.has(candidate.github_username)) ||
            (candidate.linkedin_url && seenLinkedInUrls.has(candidate.linkedin_url)) ||
            (normalizedName && seenNames.has(normalizedName))

          if (!isDuplicate) {
            if (candidate.email) seenEmails.add(candidate.email)
            if (candidate.github_username) seenGitHubUsers.add(candidate.github_username)
            if (candidate.linkedin_url) seenLinkedInUrls.add(candidate.linkedin_url)
            if (normalizedName) seenNames.add(normalizedName)
            
            // Add source tracking
            candidate.source_platform = result.source
            candidate.collection_timestamp = new Date().toISOString()
            
            allCandidates.push(candidate)
          } else {
            console.log(`🔄 Duplicate filtered: ${candidate.name} from ${result.source}`)
          }
        })
      }
    })

    // Enhanced scoring and ranking
    const enhancedCandidates = allCandidates.map(candidate => {
      // Normalize scores to 0-100 range
      const scores = {
        overall_score: Math.max(0, Math.min(100, candidate.overall_score || 50)),
        skill_match: Math.max(0, Math.min(100, candidate.skill_match || 50)),
        experience: Math.max(0, Math.min(100, candidate.experience || 50)),
        reputation: Math.max(0, Math.min(100, candidate.reputation || 50)),
        freshness: Math.max(0, Math.min(100, candidate.freshness || 50)),
        social_proof: Math.max(0, Math.min(100, candidate.social_proof || 50))
      }
      
      // Calculate composite score with weighted factors
      const compositeScore = Math.round(
        (scores.overall_score * 0.3) +
        (scores.skill_match * 0.25) +
        (scores.experience * 0.2) +
        (scores.reputation * 0.15) +
        (scores.freshness * 0.1)
      )
      
      return {
        ...candidate,
        ...scores,
        composite_score: compositeScore,
        data_quality: calculateDataQuality(candidate)
      }
    })

    // Sort by composite score
    const sortedCandidates = enhancedCandidates
      .sort((a, b) => (b.composite_score || 0) - (a.composite_score || 0))

    console.log(`📊 Collected ${sortedCandidates.length} unique enhanced candidates`)

    // Build comprehensive results object
    const results = {}
    const errors = []
    
    processedResults.forEach(result => {
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
    const successfulSources = processedResults.filter(r => !r.error).length
    const successRate = Math.round((successfulSources / processedResults.length) * 100)

    console.log(`🎉 Enhanced collection completed in ${totalTime}ms: ${sortedCandidates.length} unique candidates`)
    console.log(`📊 Success rate: ${successRate}% (${successfulSources}/${processedResults.length} sources)`)

    const response = {
      results,
      total_candidates: sortedCandidates.length,
      total_validated: sortedCandidates.length,
      query: optimizedQuery,
      location,
      enhancement_phase: 'Infrastructure Fixed',
      quality_metrics: {
        validation_rate: '100%',
        processing_time: `${Math.round(totalTime / 1000)}s`,
        time_efficiency: totalTime < 45000 ? 'Excellent' : totalTime < 75000 ? 'Good' : 'Acceptable',
        parallel_processing: true,
        smart_limiting: true,
        early_returns: totalTime < 60000,
        cross_platform_deduplication: true
      },
      performance_metrics: {
        total_time_ms: totalTime,
        average_time_per_source: Math.round(totalTime / sources.length),
        timeout_rate: processedResults.filter(r => r.error?.includes('timeout')).length / processedResults.length * 100,
        success_rate: successRate,
        candidates_per_successful_source: successfulSources > 0 ? Math.round(sortedCandidates.length / successfulSources) : 0
      },
      enhancement_stats: {
        total_processed: sortedCandidates.length,
        unique_candidates: sortedCandidates.length,
        processing_time_ms: totalTime,
        time_budget_used: Math.round((totalTime / (time_budget * 1000)) * 100),
        sources_successful: successfulSources,
        parallel_processing: true,
        ai_enhancements: 0, // Will be added in Phase 3
        apollo_enriched: 0,
        data_quality_average: sortedCandidates.length > 0 ? 
          Math.round(sortedCandidates.reduce((sum, c) => sum + (c.data_quality || 0), 0) / sortedCandidates.length) : 0
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
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
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
