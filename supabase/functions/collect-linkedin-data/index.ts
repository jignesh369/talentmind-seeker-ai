
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
    email: null,
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
    freshness: 95,
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
    throw new Error('Apify API key not configured. Please add your Apify API key in the Supabase secrets.')
  }

  console.log('🔍 Starting LinkedIn search via Apify...')
  
  let searchKeywords = query
  if (location && location !== 'undefined') {
    searchKeywords += ` ${location}`
  }

  // Updated to use a working LinkedIn scraper actor
  const actorId = 'dSCLg0C3YEZ83HzYX' // Updated actor ID for LinkedIn profile scraper
  
  const runInput = {
    searchKeywords,
    maxResults: 15,
    includeContacts: false,
    includeSkills: true,
    includeExperience: true,
    includeEducation: true
  }

  console.log('🚀 Apify run configuration:', { actorId, searchKeywords, maxResults: runInput.maxResults })

  try {
    // Start the Apify actor run with improved error handling
    const runResponse = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apifyToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(runInput),
    })

    console.log(`📡 Apify run response status: ${runResponse.status}`)

    if (!runResponse.ok) {
      const errorText = await runResponse.text()
      console.error('❌ Apify run failed:', errorText)
      throw new Error(`Apify run failed: ${runResponse.status} ${runResponse.statusText} - ${errorText}`)
    }

    const runData = await runResponse.json()
    const runId = runData.data.id

    console.log(`🚀 Apify run started successfully: ${runId}`)

    // Wait for the run to complete with improved timeout handling
    let attempts = 0
    const maxAttempts = 20 // Reduced timeout to 3.5 minutes
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)) // Wait 10 seconds
      
      const statusResponse = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs/${runId}`, {
        headers: {
          'Authorization': `Bearer ${apifyToken}`,
        },
      })

      if (!statusResponse.ok) {
        console.error(`❌ Status check failed: ${statusResponse.status}`)
        throw new Error(`Status check failed: ${statusResponse.status}`)
      }

      const statusData = await statusResponse.json()
      const status = statusData.data.status

      console.log(`⏳ Apify run status: ${status} (attempt ${attempts + 1}/${maxAttempts})`)

      if (status === 'SUCCEEDED') {
        console.log('✅ Apify run completed successfully')
        break
      } else if (status === 'FAILED' || status === 'ABORTED') {
        const errorMessage = statusData.data.statusMessage || 'Unknown error'
        console.error(`❌ Apify run failed with status: ${status}, message: ${errorMessage}`)
        throw new Error(`Apify run failed: ${status} - ${errorMessage}`)
      }

      attempts++
    }

    if (attempts >= maxAttempts) {
      console.error('❌ Apify run timed out after maximum attempts')
      throw new Error('Apify run timed out - the search is taking longer than expected')
    }

    // Get the results with better error handling
    const resultsResponse = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs/${runId}/dataset/items`, {
      headers: {
        'Authorization': `Bearer ${apifyToken}`,
      },
    })

    if (!resultsResponse.ok) {
      console.error(`❌ Failed to fetch results: ${resultsResponse.status}`)
      throw new Error(`Failed to fetch results: ${resultsResponse.status}`)
    }

    const results = await resultsResponse.json()
    
    console.log(`📊 Retrieved ${results.length} LinkedIn profiles from Apify`)

    // Transform Apify results to our format with better field mapping
    return results.map((item: any) => ({
      fullName: item.name || item.fullName || item.displayName || 'Unknown',
      headline: item.headline || item.title || item.occupation || '',
      location: item.location || item.geo?.city || '',
      profileUrl: item.profileUrl || item.url || item.linkedInUrl || '',
      photoUrl: item.photoUrl || item.profilePictureUrl || item.avatar,
      summary: item.summary || item.about || item.description || '',
      experience: item.experience || item.positions || [],
      education: item.education || item.schools || [],
      skills: item.skills || item.skillsList || [],
      connectionsCount: item.connectionsCount || item.connections || 0,
      industry: item.industry || item.companyIndustry || ''
    })).filter(profile => profile.profileUrl && profile.fullName !== 'Unknown')

  } catch (error: any) {
    console.error('❌ LinkedIn Apify search error:', error.message)
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

    console.log('🚀 Starting LinkedIn data collection via Apify...')
    console.log(`Query: "${query}", Location: "${location}"`)

    const startTime = Date.now()

    // Search LinkedIn profiles using Apify API
    const profiles = await searchLinkedInProfiles(query, location)

    console.log(`🎯 Found ${profiles.length} LinkedIn profiles`)

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
            collection_method: 'apify_api'
          }
        }

        const saveResult = await saveCandidateWithSource(supabase, candidate, sourceData)
        
        if (saveResult.success) {
          savedCandidates.push(candidate)
          console.log(`💾 Saved LinkedIn candidate: ${candidate.name} (${profile.headline})`)
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
    console.log(`✅ LinkedIn collection completed in ${processingTime}ms: ${sortedCandidates.length} candidates`)

    return new Response(
      JSON.stringify({ 
        candidates: sortedCandidates,
        total: sortedCandidates.length,
        source: 'linkedin_apify',
        processing_time_ms: processingTime,
        collection_stats: {
          profiles_found: profiles.length,
          candidates_saved: sortedCandidates.length,
          data_source: 'apify_api',
          collection_method: 'linkedin_scraping',
          quality_level: 'production_grade'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in LinkedIn collection:', error)
    return new Response(
      JSON.stringify({ 
        candidates: [], 
        total: 0, 
        source: 'linkedin_apify',
        error: 'LinkedIn collection failed',
        error_details: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
