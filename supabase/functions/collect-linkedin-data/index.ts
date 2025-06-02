
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { saveCandidateWithSource } from '../shared/database-operations.ts'
import { EnhancedLinkedInSimulator } from './enhanced-linkedin-simulator.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const convertToCandidate = (profile: any) => {
  const experienceYears = calculateExperienceYears(profile.experience)
  const overallScore = calculateOverallScore(profile, experienceYears)
  
  return {
    id: profile.id,
    name: profile.name,
    title: profile.headline,
    location: profile.location,
    avatar_url: profile.avatar_url,
    email: null,
    linkedin_url: profile.profile_url,
    summary: profile.summary,
    skills: profile.skills,
    experience_years: experienceYears,
    last_active: new Date().toISOString(),
    overall_score: overallScore,
    skill_match: calculateSkillMatch(profile.skills),
    reputation: Math.min(profile.connections / 10, 100),
    experience: experienceYears * 5,
    social_proof: calculateSocialProof(profile),
    freshness: 90, // LinkedIn profiles are generally up-to-date
    platform: 'linkedin',
    platform_data: {
      headline: profile.headline,
      industry: profile.industry,
      connections: profile.connections,
      experience: profile.experience,
      education: profile.education,
      endorsements: profile.endorsements
    }
  }
}

const calculateExperienceYears = (experience: any[]): number => {
  return experience.reduce((total, exp) => {
    const duration = exp.duration
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
  return totalYears
}

const calculateOverallScore = (profile: any, experienceYears: number): number => {
  const experienceScore = Math.min(experienceYears * 8, 100)
  const connectionScore = Math.min(profile.connections / 20, 50)
  const skillScore = Math.min(profile.skills.length * 3, 30)
  const endorsementScore = Object.values(profile.endorsements).reduce((sum: number, count: any) => sum + count, 0) / 10
  
  return Math.round(experienceScore * 0.4 + connectionScore * 0.3 + skillScore * 0.2 + endorsementScore * 0.1)
}

const calculateSkillMatch = (skills: string[]): number => {
  return Math.min(skills.length * 5, 100)
}

const calculateSocialProof = (profile: any): number => {
  const connectionScore = Math.min(profile.connections / 10, 50)
  const endorsementCount = Object.keys(profile.endorsements).length
  const endorsementScore = Math.min(endorsementCount * 3, 50)
  
  return Math.round(connectionScore + endorsementScore)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, location, time_budget = 15 } = await req.json()

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

    console.log('🚀 Starting enhanced LinkedIn simulation...')
    console.log(`Query: "${query}", Location: "${location}"`)

    const startTime = Date.now()

    // Generate enhanced LinkedIn profiles
    const simulator = new EnhancedLinkedInSimulator()
    const profiles = simulator.generateEnhancedProfiles(query, location, 12)

    console.log(`🎯 Generated ${profiles.length} enhanced LinkedIn profiles`)

    // Convert profiles to candidates and save
    const savedCandidates = []
    for (const profile of profiles) {
      try {
        const candidate = convertToCandidate(profile)
        
        const sourceData = {
          candidate_id: candidate.id,
          platform: 'linkedin',
          platform_id: profile.id,
          url: profile.profile_url,
          data: {
            full_profile: profile,
            enhanced_simulation: true
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
        console.error(`❌ Error saving candidate ${profile.name}:`, error.message)
        continue
      }
    }

    const sortedCandidates = savedCandidates
      .sort((a, b) => (b.overall_score + b.experience + b.social_proof) - (a.overall_score + a.experience + a.social_proof))

    const processingTime = Date.now() - startTime
    console.log(`✅ Enhanced LinkedIn simulation completed in ${processingTime}ms: ${sortedCandidates.length} candidates`)

    return new Response(
      JSON.stringify({ 
        candidates: sortedCandidates,
        total: sortedCandidates.length,
        source: 'linkedin',
        processing_time_ms: processingTime,
        enhancement_stats: {
          profiles_generated: profiles.length,
          target_achieved: sortedCandidates.length >= 10,
          enhancement_level: 'comprehensive',
          simulation_quality: 'high_fidelity'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in enhanced LinkedIn simulation:', error)
    return new Response(
      JSON.stringify({ 
        candidates: [], 
        total: 0, 
        source: 'linkedin',
        error: 'Enhanced LinkedIn simulation failed',
        error_details: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
