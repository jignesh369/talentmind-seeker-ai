import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { saveCandidateWithSource } from '../shared/database-operations.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { profileUrls, originalQuery } = await req.json()

    if (!profileUrls || !Array.isArray(profileUrls) || profileUrls.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Profile URLs array is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const apifyToken = Deno.env.get('APIFY_API_KEY')
    
    if (!apifyToken) {
      console.error('❌ APIFY_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'Apify API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log(`🔍 Starting Apify scraping for ${profileUrls.length} LinkedIn profiles`)

    // Extract usernames from LinkedIn URLs
    const usernames = profileUrls.map(url => {
      const match = url.match(/linkedin\.com\/in\/([^\/\?]+)/)
      return match ? match[1] : null
    }).filter(Boolean)

    if (usernames.length === 0) {
      throw new Error('No valid LinkedIn usernames could be extracted from URLs')
    }

    console.log(`📝 Extracted ${usernames.length} usernames:`, usernames)

    // Use the correct LinkedIn profile scraper with usernames
    const actorId = 'dSCLg0C3YEZ83HzYX'
    
    const runInput = {
      usernames: usernames,
      includeContacts: false,
      includeSkills: true,
      includeExperience: true,
      includeEducation: true
    }

    console.log('🚀 Starting Apify actor run with usernames input')

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
      const errorText = await runResponse.text()
      console.error('❌ Apify run failed:', errorText)
      throw new Error(`Apify run failed: ${runResponse.status} - ${errorText}`)
    }

    const runData = await runResponse.json()
    const runId = runData.data.id

    console.log(`🚀 Apify run started: ${runId}`)

    // Wait for completion with timeout
    let attempts = 0
    const maxAttempts = 15 // 2.5 minutes timeout
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)) // Wait 10 seconds
      
      const statusResponse = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs/${runId}`, {
        headers: { 'Authorization': `Bearer ${apifyToken}` },
      })

      if (!statusResponse.ok) {
        throw new Error(`Status check failed: ${statusResponse.status}`)
      }

      const statusData = await statusResponse.json()
      const status = statusData.data.status

      console.log(`⏳ Apify run status: ${status} (attempt ${attempts + 1}/${maxAttempts})`)

      if (status === 'SUCCEEDED') {
        console.log('✅ Apify run completed successfully')
        break
      } else if (status === 'FAILED' || status === 'ABORTED') {
        throw new Error(`Apify run failed: ${status}`)
      }

      attempts++
    }

    if (attempts >= maxAttempts) {
      throw new Error('Apify run timed out')
    }

    // Get results
    const resultsResponse = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs/${runId}/dataset/items`, {
      headers: { 'Authorization': `Bearer ${apifyToken}` },
    })

    if (!resultsResponse.ok) {
      throw new Error(`Failed to fetch results: ${resultsResponse.status}`)
    }

    const results = await resultsResponse.json()
    console.log(`📊 Retrieved ${results.length} profile results from Apify`)

    // Process and save candidates
    const savedCandidates = []
    const errors = []

    for (const profile of results) {
      try {
        if (!profile.name || !profile.profileUrl) {
          continue
        }

        const candidate = convertToCandidate(profile, originalQuery)
        
        const sourceData = {
          candidate_id: candidate.id,
          platform: 'linkedin',
          platform_id: profile.profileUrl.split('/').pop() || candidate.id,
          url: profile.profileUrl,
          data: {
            full_profile: profile,
            apify_source: true,
            collection_method: 'enhanced_workflow',
            discovery_method: 'google_search'
          }
        }

        const saveResult = await saveCandidateWithSource(supabase, candidate, sourceData)
        
        if (saveResult.success) {
          savedCandidates.push(candidate)
          console.log(`💾 Saved LinkedIn candidate: ${candidate.name}`)
        } else {
          console.error(`❌ Failed to save candidate ${candidate.name}:`, saveResult.error)
          errors.push(`Failed to save ${candidate.name}: ${saveResult.error}`)
        }
      } catch (error) {
        console.error(`❌ Error processing profile:`, error)
        errors.push(`Processing error: ${error.message}`)
        continue
      }
    }

    console.log(`✅ Successfully scraped and saved ${savedCandidates.length} candidates`)

    return new Response(
      JSON.stringify({ 
        candidates: savedCandidates,
        errors,
        processing_stats: {
          profiles_requested: profileUrls.length,
          usernames_extracted: usernames.length,
          profiles_returned: results.length,
          candidates_saved: savedCandidates.length,
          errors_count: errors.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error scraping LinkedIn profiles:', error)
    return new Response(
      JSON.stringify({ 
        candidates: [],
        errors: [error.message],
        processing_stats: {
          profiles_requested: 0,
          usernames_extracted: 0,
          profiles_returned: 0,
          candidates_saved: 0,
          errors_count: 1
        }
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function convertToCandidate(profile: any, query: string) {
  const experienceYears = calculateExperienceYears(profile.experience || [])
  const overallScore = calculateOverallScore(profile, experienceYears)
  
  return {
    id: `linkedin_enhanced_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: profile.name || profile.fullName || 'Unknown',
    title: profile.headline || profile.title || 'Professional',
    location: profile.location || '',
    avatar_url: profile.photoUrl || profile.profilePictureUrl || null,
    email: null,
    linkedin_url: profile.profileUrl || profile.url,
    summary: profile.summary || profile.about || '',
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
      summary: profile.summary,
      collection_method: 'enhanced_workflow'
    }
  }
}

function calculateExperienceYears(experience: any[]): number {
  return experience.reduce((total, exp) => {
    const duration = exp.duration || ''
    const years = extractYearsFromDuration(duration)
    return total + years
  }, 0)
}

function extractYearsFromDuration(duration: string): number {
  const yearMatch = duration.match(/(\d+)\s*yr/)
  const monthMatch = duration.match(/(\d+)\s*mo/)
  
  let totalYears = yearMatch ? parseInt(yearMatch[1]) : 0
  const months = monthMatch ? parseInt(monthMatch[1]) : 0
  
  totalYears += months / 12
  return Math.min(totalYears, 20)
}

function calculateOverallScore(profile: any, experienceYears: number): number {
  const experienceScore = Math.min(experienceYears * 8, 100)
  const connectionScore = Math.min((profile.connectionsCount || 0) / 20, 50)
  const skillScore = Math.min((profile.skills || []).length * 3, 30)
  const profileCompletenessScore = calculateProfileCompleteness(profile)
  
  return Math.round(experienceScore * 0.3 + connectionScore * 0.2 + skillScore * 0.2 + profileCompletenessScore * 0.3)
}

function calculateProfileCompleteness(profile: any): number {
  let score = 0
  if (profile.name) score += 20
  if (profile.headline) score += 15
  if (profile.summary && profile.summary.length > 50) score += 20
  if (profile.experience && profile.experience.length > 0) score += 20
  if (profile.skills && profile.skills.length > 0) score += 15
  if (profile.location) score += 10
  return Math.min(score, 100)
}

function calculateSkillMatch(skills: string[], query: string): number {
  const queryTerms = query.toLowerCase().split(/\s+/)
  const matchedSkills = skills.filter(skill => 
    queryTerms.some(term => skill.toLowerCase().includes(term))
  ).length
  
  return Math.min(matchedSkills * 15 + skills.length * 2, 100)
}

function calculateSocialProof(profile: any): number {
  const connectionScore = Math.min((profile.connectionsCount || 0) / 10, 50)
  const experienceScore = Math.min((profile.experience || []).length * 10, 30)
  const educationScore = Math.min((profile.education || []).length * 10, 20)
  
  return Math.round(connectionScore + experienceScore + educationScore)
}
