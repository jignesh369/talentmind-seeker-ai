
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { saveCandidateWithSource } from '../shared/database-operations.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ApifyLinkedInProfile {
  fullName: string;
  headline: string;
  location: string;
  profileUrl: string;
  photoUrl?: string;
  summary?: string;
  experience?: Array<{
    title: string;
    company: string;
    duration: string;
    description?: string;
  }>;
  education?: Array<{
    school: string;
    degree: string;
    field: string;
  }>;
  skills?: string[];
  connectionsCount?: number;
  industry?: string;
}

const convertToCandidate = (profile: ApifyLinkedInProfile, query: string) => {
  const experienceYears = calculateExperienceYears(profile.experience || [])
  const overallScore = calculateOverallScore(profile, experienceYears)
  
  return {
    id: `linkedin_real_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: profile.fullName,
    title: profile.headline || 'Professional',
    location: profile.location || '',
    avatar_url: profile.photoUrl || null,
    email: null, // LinkedIn doesn't provide emails directly
    linkedin_url: profile.profileUrl,
    summary: profile.summary || '',
    skills: profile.skills || [],
    experience_years: experienceYears,
    last_active: new Date().toISOString(),
    overall_score: overallScore,
    skill_match: calculateSkillMatch(profile.skills || [], query),
    reputation: Math.min((profile.connectionsCount || 0) / 10, 100),
    experience: experienceYears * 8,
    social_proof: calculateSocialProof(profile),
    freshness: 95, // LinkedIn profiles are generally up-to-date
    platform: 'linkedin',
    platform_data: {
      headline: profile.headline,
      industry: profile.industry,
      connections: profile.connectionsCount,
      experience: profile.experience,
      education: profile.education,
      summary: profile.summary
    }
  }
}

const calculateExperienceYears = (experience: any[]): number => {
  return experience.reduce((total, exp) => {
    const duration = exp.duration || ''
    const years = extractYearsFromDuration(duration)
    return total + years
  }, 0)
}

const extractYearsFromDuration = (duration: string): number => {
  const yearMatch = duration.match(/(\d+)\s*yr/)
  const monthMatch = duration.match(/(\d+)\s*mo/)
  
  let totalYears = yearMatch ? parseInt(yearMatch[1]) : 0
  const months = monthMatch ? parseInt(monthMatch[1]) : 0
  
  totalYears += months / 12
  return Math.min(totalYears, 20) // Cap at 20 years to avoid outliers
}

const calculateOverallScore = (profile: ApifyLinkedInProfile, experienceYears: number): number => {
  const experienceScore = Math.min(experienceYears * 8, 100)
  const connectionScore = Math.min((profile.connectionsCount || 0) / 20, 50)
  const skillScore = Math.min((profile.skills || []).length * 3, 30)
  const profileCompletenessScore = calculateProfileCompleteness(profile)
  
  return Math.round(experienceScore * 0.3 + connectionScore * 0.2 + skillScore * 0.2 + profileCompletenessScore * 0.3)
}

const calculateProfileCompleteness = (profile: ApifyLinkedInProfile): number => {
  let score = 0
  if (profile.fullName) score += 20
  if (profile.headline) score += 15
  if (profile.summary && profile.summary.length > 50) score += 20
  if (profile.experience && profile.experience.length > 0) score += 20
  if (profile.skills && profile.skills.length > 0) score += 15
  if (profile.location) score += 10
  return Math.min(score, 100)
}

const calculateSkillMatch = (skills: string[], query: string): number => {
  const queryTerms = query.toLowerCase().split(/\s+/)
  const matchedSkills = skills.filter(skill => 
    queryTerms.some(term => skill.toLowerCase().includes(term))
  ).length
  
  return Math.min(matchedSkills * 15 + skills.length * 2, 100)
}

const calculateSocialProof = (profile: ApifyLinkedInProfile): number => {
  const connectionScore = Math.min((profile.connectionsCount || 0) / 10, 50)
  const experienceScore = Math.min((profile.experience || []).length * 10, 30)
  const educationScore = Math.min((profile.education || []).length * 10, 20)
  
  return Math.round(connectionScore + experienceScore + educationScore)
}

const searchLinkedInProfiles = async (query: string, location?: string): Promise<ApifyLinkedInProfile[]> => {
  const apifyToken = Deno.env.get('APIFY_API_KEY')
  
  if (!apifyToken) {
    console.error('❌ APIFY_API_KEY not configured')
    throw new Error('Apify API key not configured')
  }

  console.log('🔍 Starting real LinkedIn search via Apify...')
  
  // Construct search keywords
  let searchKeywords = query
  if (location) {
    searchKeywords += ` ${location}`
  }

  // Apify LinkedIn People Search Actor
  const actorId = 'apify/linkedin-people-search'
  
  const runInput = {
    searchKeywords,
    maxResults: 20,
    includePrivateProfiles: false,
    saveToDataset: false
  }

  try {
    // Start the Apify actor run
    const runResponse = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apifyToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(runInput),
    })

    if (!runResponse.ok) {
      throw new Error(`Apify run failed: ${runResponse.status} ${runResponse.statusText}`)
    }

    const runData = await runResponse.json()
    const runId = runData.data.id

    console.log(`🚀 Apify run started: ${runId}`)

    // Wait for the run to complete (with timeout)
    let attempts = 0
    const maxAttempts = 30 // 5 minutes timeout
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)) // Wait 10 seconds
      
      const statusResponse = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs/${runId}`, {
        headers: {
          'Authorization': `Bearer ${apifyToken}`,
        },
      })

      const statusData = await statusResponse.json()
      const status = statusData.data.status

      console.log(`⏳ Apify run status: ${status}`)

      if (status === 'SUCCEEDED') {
        console.log('✅ Apify run completed successfully')
        break
      } else if (status === 'FAILED' || status === 'ABORTED') {
        throw new Error(`Apify run failed with status: ${status}`)
      }

      attempts++
    }

    if (attempts >= maxAttempts) {
      throw new Error('Apify run timed out')
    }

    // Get the results
    const resultsResponse = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs/${runId}/dataset/items`, {
      headers: {
        'Authorization': `Bearer ${apifyToken}`,
      },
    })

    if (!resultsResponse.ok) {
      throw new Error(`Failed to fetch results: ${resultsResponse.status}`)
    }

    const results = await resultsResponse.json()
    
    console.log(`📊 Retrieved ${results.length} LinkedIn profiles from Apify`)

    // Transform Apify results to our format
    return results.map((item: any) => ({
      fullName: item.name || item.fullName || 'Unknown',
      headline: item.headline || item.title || '',
      location: item.location || '',
      profileUrl: item.profileUrl || item.url || '',
      photoUrl: item.photoUrl || item.profilePictureUrl,
      summary: item.summary || item.about || '',
      experience: item.experience || [],
      education: item.education || [],
      skills: item.skills || [],
      connectionsCount: item.connectionsCount || item.connections || 0,
      industry: item.industry || ''
    }))

  } catch (error: any) {
    console.error('❌ Apify LinkedIn search error:', error)
    throw new Error(`LinkedIn search failed: ${error.message}`)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, location, time_budget = 300 } = await req.json()

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

    console.log('🚀 Starting REAL LinkedIn data collection via Apify...')
    console.log(`Query: "${query}", Location: "${location}"`)

    const startTime = Date.now()

    // Search LinkedIn profiles using real Apify API
    const profiles = await searchLinkedInProfiles(query, location)

    console.log(`🎯 Found ${profiles.length} real LinkedIn profiles`)

    // Convert profiles to candidates and save
    const savedCandidates = []
    for (const profile of profiles) {
      try {
        const candidate = convertToCandidate(profile, query)
        
        const sourceData = {
          candidate_id: candidate.id,
          platform: 'linkedin',
          platform_id: profile.profileUrl.split('/').pop() || candidate.id,
          url: profile.profileUrl,
          data: {
            full_profile: profile,
            apify_source: true,
            collection_method: 'real_api'
          }
        }

        const saveResult = await saveCandidateWithSource(supabase, candidate, sourceData)
        
        if (saveResult.success) {
          savedCandidates.push(candidate)
          console.log(`💾 Saved real LinkedIn candidate: ${candidate.name} (${profile.headline})`)
        } else {
          console.error(`❌ Failed to save candidate ${candidate.name}:`, saveResult.error)
        }
      } catch (error) {
        console.error(`❌ Error processing candidate ${profile.fullName}:`, error.message)
        continue
      }
    }

    const sortedCandidates = savedCandidates
      .sort((a, b) => (b.overall_score + b.experience + b.social_proof) - (a.overall_score + a.experience + a.social_proof))

    const processingTime = Date.now() - startTime
    console.log(`✅ REAL LinkedIn collection completed in ${processingTime}ms: ${sortedCandidates.length} candidates`)

    return new Response(
      JSON.stringify({ 
        candidates: sortedCandidates,
        total: sortedCandidates.length,
        source: 'linkedin_real',
        processing_time_ms: processingTime,
        collection_stats: {
          profiles_found: profiles.length,
          candidates_saved: sortedCandidates.length,
          data_source: 'apify_real_api',
          collection_method: 'real_linkedin_scraping',
          quality_level: 'production_grade'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in REAL LinkedIn collection:', error)
    return new Response(
      JSON.stringify({ 
        candidates: [], 
        total: 0, 
        source: 'linkedin_real',
        error: 'Real LinkedIn collection failed',
        error_details: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
