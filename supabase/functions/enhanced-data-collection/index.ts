import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CollectionRequest {
  query: string;
  location?: string;
  sources: string[];
  qualityThreshold?: number;
}

interface QualityMetrics {
  profileCompleteness: number;
  technicalRelevance: number;
  authenticity: number;
  activityLevel: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, location, sources = ['github', 'google'], qualityThreshold = 50 }: CollectionRequest = await req.json()

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required', candidates: [], total: 0 }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log(`🚀 Starting enhanced production data collection for: "${query}"`)
    console.log(`📊 Quality threshold: ${qualityThreshold}%, Sources: ${sources.join(', ')}`)

    const startTime = Date.now()
    const collectionResults = {
      github: { candidates: [], total: 0, error: null },
      google: { candidates: [], total: 0, error: null },
      linkedin: { candidates: [], total: 0, error: null }
    }

    // Enhanced parallel collection with quality validation
    const collectionPromises = sources.map(async (source) => {
      try {
        let functionName = ''
        let requestBody: any = { query, time_budget: 30 }

        switch (source) {
          case 'github':
            functionName = 'collect-github-data'
            requestBody = { ...requestBody, location, use_real_api: true }
            break
          case 'stackoverflow':
            functionName = 'collect-stackoverflow-data'
            requestBody = { ...requestBody, use_real_api: true }
            break
          case 'google':
            functionName = 'collect-google-search-data'
            requestBody = { ...requestBody, location }
            break
          case 'linkedin':
            // Use the enhanced LinkedIn workflow (Google + Apify) - SIMPLIFIED SEARCH
            console.log('🔄 Starting enhanced LinkedIn workflow (Google + Apify)...')
            
            try {
              // Step 1: Discover LinkedIn profile URLs using simpler Google Search
              console.log('📍 Phase 1: Discovering LinkedIn profiles via Google Search')
              
              // Use simpler search query - just the core query terms
              const simpleQuery = query.replace(/\s+and\s+/gi, ' ').replace(/\s+in\s+/gi, ' ')
              
              const discoveryResponse = await supabase.functions.invoke('discover-linkedin-profiles', {
                body: {
                  searchQuery: simpleQuery,
                  maxResults: 20
                }
              })

              if (discoveryResponse.error) {
                console.error(`❌ LinkedIn discovery failed:`, discoveryResponse.error)
                collectionResults[source].error = discoveryResponse.error.message
                return
              }

              const profileUrls = discoveryResponse.data?.profileUrls || []
              
              if (profileUrls.length === 0) {
                console.log('📭 No LinkedIn profile URLs found - trying fallback search')
                
                // Try a more general search as fallback
                const fallbackResponse = await supabase.functions.invoke('discover-linkedin-profiles', {
                  body: {
                    searchQuery: `developer ${simpleQuery.split(' ')[0]}`,
                    maxResults: 10
                  }
                })
                
                const fallbackUrls = fallbackResponse.data?.profileUrls || []
                
                if (fallbackUrls.length === 0) {
                  collectionResults[source] = {
                    candidates: [],
                    total: 0,
                    error: 'No LinkedIn profiles found in search results'
                  }
                  return
                }
                
                console.log(`✅ Fallback search found ${fallbackUrls.length} LinkedIn profile URLs`)
                
                // Use fallback URLs for scraping
                const scrapingResponse = await supabase.functions.invoke('scrape-linkedin-profiles', {
                  body: {
                    profileUrls: fallbackUrls,
                    originalQuery: query
                  }
                })

                if (scrapingResponse.error) {
                  console.error(`❌ LinkedIn scraping failed:`, scrapingResponse.error)
                  collectionResults[source].error = scrapingResponse.error.message
                  return
                }

                const candidates = scrapingResponse.data?.candidates || []
                console.log(`✅ Fallback scraping complete: Got ${candidates.length} candidates`)
                
                // Apply quality validation
                const qualifiedCandidates = await validateCandidateQuality(candidates, query, qualityThreshold)
                
                collectionResults[source] = {
                  candidates: qualifiedCandidates,
                  total: qualifiedCandidates.length,
                  error: null
                }

                console.log(`✅ LinkedIn fallback workflow: ${qualifiedCandidates.length}/${candidates.length} candidates passed quality threshold`)
                return
              }

              console.log(`✅ Discovery complete: Found ${profileUrls.length} LinkedIn profile URLs`)

              // Step 2: Scrape profile details using Apify
              console.log('📍 Phase 2: Scraping detailed profile information')
              const scrapingResponse = await supabase.functions.invoke('scrape-linkedin-profiles', {
                body: {
                  profileUrls,
                  originalQuery: query
                }
              })

              if (scrapingResponse.error) {
                console.error(`❌ LinkedIn scraping failed:`, scrapingResponse.error)
                collectionResults[source].error = scrapingResponse.error.message
                return
              }

              const candidates = scrapingResponse.data?.candidates || []
              console.log(`✅ Scraping complete: Got ${candidates.length} candidates`)
              
              // Apply quality validation
              const qualifiedCandidates = await validateCandidateQuality(candidates, query, qualityThreshold)
              
              collectionResults[source] = {
                candidates: qualifiedCandidates,
                total: qualifiedCandidates.length,
                error: null
              }

              console.log(`✅ LinkedIn enhanced workflow: ${qualifiedCandidates.length}/${candidates.length} candidates passed quality threshold`)
              return

            } catch (linkedinError) {
              console.error(`❌ LinkedIn enhanced workflow failed:`, linkedinError)
              collectionResults[source].error = linkedinError.message
              return
            }

          default:
            throw new Error(`Unknown source: ${source}`)
        }

        // Handle other sources (non-LinkedIn)
        console.log(`🔄 Collecting from ${source}...`)
        const response = await supabase.functions.invoke(functionName, {
          body: requestBody
        })

        if (response.error) {
          console.error(`❌ ${source} collection failed:`, response.error)
          collectionResults[source].error = response.error.message
          return
        }

        const candidates = response.data?.candidates || []
        
        // Apply quality validation
        const qualifiedCandidates = await validateCandidateQuality(candidates, query, qualityThreshold)
        
        collectionResults[source] = {
          candidates: qualifiedCandidates,
          total: qualifiedCandidates.length,
          error: null
        }

        console.log(`✅ ${source}: ${qualifiedCandidates.length}/${candidates.length} candidates passed quality threshold`)

      } catch (error) {
        console.error(`❌ ${source} collection error:`, error)
        collectionResults[source].error = error.message
      }
    })

    await Promise.all(collectionPromises)

    // Compile and deduplicate results
    const allCandidates = []
    let totalCandidatesFound = 0

    Object.entries(collectionResults).forEach(([source, result]) => {
      if (result.candidates.length > 0) {
        allCandidates.push(...result.candidates.map(candidate => ({
          ...candidate,
          primary_source: source,
          collection_timestamp: new Date().toISOString()
        })))
      }
      totalCandidatesFound += result.total
    })

    // Advanced deduplication by email, github_username, linkedin_url
    const deduplicatedCandidates = deduplicateCandidates(allCandidates)
    
    // Final quality ranking
    const rankedCandidates = rankCandidatesByQuality(deduplicatedCandidates, query)

    const processingTime = Date.now() - startTime
    const qualityScore = rankedCandidates.length > 0 ? 
      rankedCandidates.reduce((sum, c) => sum + (c.quality_score || 0), 0) / rankedCandidates.length : 0

    console.log(`🎯 Enhanced collection completed in ${processingTime}ms`)
    console.log(`📈 Results: ${rankedCandidates.length} high-quality candidates (avg quality: ${qualityScore.toFixed(1)}%)`)

    return new Response(
      JSON.stringify({
        candidates: rankedCandidates,
        total_candidates: rankedCandidates.length,
        results: {
          [sources[0]]: rankedCandidates.filter(c => c.primary_source === sources[0]),
          [sources[1]]: rankedCandidates.filter(c => c.primary_source === sources[1])
        },
        enhancement_stats: {
          sources_successful: Object.values(collectionResults).filter(r => r.candidates.length > 0).length,
          total_raw_candidates: totalCandidatesFound,
          quality_filtered_candidates: rankedCandidates.length,
          average_quality_score: qualityScore
        },
        performance_metrics: {
          total_time_ms: processingTime,
          sources_processed: sources.length,
          deduplication_ratio: totalCandidatesFound > 0 ? (totalCandidatesFound - rankedCandidates.length) / totalCandidatesFound : 0
        },
        collection_results: collectionResults,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Enhanced data collection error:', error)
    return new Response(
      JSON.stringify({
        error: 'Enhanced data collection failed',
        details: error.message,
        candidates: [],
        total_candidates: 0,
        results: {},
        enhancement_stats: {
          sources_successful: 0,
          total_raw_candidates: 0,
          quality_filtered_candidates: 0,
          average_quality_score: 0
        },
        performance_metrics: {
          total_time_ms: 0,
          sources_processed: 0,
          deduplication_ratio: 0
        }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function validateCandidateQuality(candidates: any[], query: string, threshold: number): Promise<any[]> {
  return candidates.filter(candidate => {
    const metrics = calculateQualityMetrics(candidate, query)
    const overallScore = (metrics.profileCompleteness + metrics.technicalRelevance + metrics.authenticity + metrics.activityLevel) / 4
    
    candidate.quality_score = Math.round(overallScore)
    candidate.quality_metrics = metrics
    
    return overallScore >= threshold
  })
}

function calculateQualityMetrics(candidate: any, query: string): QualityMetrics {
  let profileCompleteness = 0
  let technicalRelevance = 0
  let authenticity = 0
  let activityLevel = 0

  // Profile Completeness (0-100)
  if (candidate.name && candidate.name.length > 2 && !candidate.name.startsWith('#')) profileCompleteness += 25
  if (candidate.title && candidate.title.length > 5) profileCompleteness += 20
  if (candidate.summary && candidate.summary.length > 50) profileCompleteness += 20
  if (candidate.email || candidate.github_username || candidate.linkedin_url) profileCompleteness += 20
  if (candidate.location && candidate.location.length > 2) profileCompleteness += 15

  // Technical Relevance (0-100)
  if (candidate.skills && Array.isArray(candidate.skills) && candidate.skills.length > 0) {
    technicalRelevance += Math.min(candidate.skills.length * 10, 40)
    
    // Check skill relevance to query
    const queryTerms = query.toLowerCase().split(/\s+/)
    const skillMatches = candidate.skills.filter((skill: string) => 
      queryTerms.some(term => skill.toLowerCase().includes(term))
    ).length
    technicalRelevance += Math.min(skillMatches * 15, 45)
  }
  
  if (candidate.experience_years && candidate.experience_years > 0) {
    technicalRelevance += Math.min(candidate.experience_years * 2, 15)
  }

  // Authenticity (0-100)
  if (candidate.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate.email)) authenticity += 30
  if (candidate.github_username && candidate.github_username.length > 2) authenticity += 25
  if (candidate.linkedin_url && candidate.linkedin_url.includes('linkedin.com')) authenticity += 25
  if (candidate.avatar_url) authenticity += 10
  if (candidate.name && !candidate.name.includes('#') && candidate.name.split(' ').length >= 2) authenticity += 10

  // Activity Level (0-100)
  if (candidate.last_active) {
    const daysSinceActive = Math.floor((Date.now() - new Date(candidate.last_active).getTime()) / (1000 * 60 * 60 * 24))
    if (daysSinceActive < 30) activityLevel += 40
    else if (daysSinceActive < 90) activityLevel += 25
    else if (daysSinceActive < 180) activityLevel += 15
  }

  if (candidate.reputation && candidate.reputation > 0) {
    activityLevel += Math.min(candidate.reputation / 100, 30)
  }

  if (candidate.total_stars && candidate.total_stars > 0) {
    activityLevel += Math.min(candidate.total_stars / 10, 30)
  }

  return {
    profileCompleteness: Math.min(profileCompleteness, 100),
    technicalRelevance: Math.min(technicalRelevance, 100),
    authenticity: Math.min(authenticity, 100),
    activityLevel: Math.min(activityLevel, 100)
  }
}

function deduplicateCandidates(candidates: any[]): any[] {
  const seen = new Map()
  const deduplicated = []

  for (const candidate of candidates) {
    let key = ''
    
    if (candidate.email) key = candidate.email.toLowerCase()
    else if (candidate.github_username) key = `github:${candidate.github_username.toLowerCase()}`
    else if (candidate.linkedin_url) key = candidate.linkedin_url.toLowerCase()
    else key = `name:${candidate.name?.toLowerCase() || 'unknown'}`

    if (!seen.has(key)) {
      seen.set(key, true)
      deduplicated.push(candidate)
    } else {
      // Merge data from duplicate candidate
      const existingIndex = deduplicated.findIndex(c => {
        if (candidate.email && c.email) return c.email.toLowerCase() === candidate.email.toLowerCase()
        if (candidate.github_username && c.github_username) return c.github_username.toLowerCase() === candidate.github_username.toLowerCase()
        if (candidate.linkedin_url && c.linkedin_url) return c.linkedin_url.toLowerCase() === candidate.linkedin_url.toLowerCase()
        return false
      })
      
      if (existingIndex >= 0) {
        // Merge additional platform data
        deduplicated[existingIndex] = {
          ...deduplicated[existingIndex],
          ...Object.fromEntries(
            Object.entries(candidate).filter(([key, value]) => 
              value && !deduplicated[existingIndex][key]
            )
          )
        }
      }
    }
  }

  return deduplicated
}

function rankCandidatesByQuality(candidates: any[], query: string): any[] {
  return candidates
    .sort((a, b) => {
      const scoreA = a.quality_score || 0
      const scoreB = b.quality_score || 0
      
      if (scoreA !== scoreB) return scoreB - scoreA
      
      // Secondary sort by overall_score
      return (b.overall_score || 0) - (a.overall_score || 0)
    })
}
