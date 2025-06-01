
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { searchStackOverflowUsers, getStackOverflowUserDetails } from './api-client.ts'
import { validateStackOverflowUser } from './user-validator.ts'
import { buildStackOverflowProfile } from './profile-builder.ts'
import { calculateStackOverflowScore } from './scoring-engine.ts'
import { saveCandidateWithSource } from '../shared/database-operations.ts'
import { buildCandidate } from '../shared/candidate-builder.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query } = await req.json()

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

    console.log(`🔍 Stack Overflow search for: "${query}"`)

    const startTime = Date.now()
    const candidates = []
    
    try {
      const users = await searchStackOverflowUsers(query)
      console.log(`📋 Found ${users.length} Stack Overflow users`)

      for (const user of users.slice(0, 8)) {
        try {
          console.log(`🔍 Validating user ${user.user_id}: reputation=${user.reputation}`)
          
          if (!validateStackOverflowUser(user)) {
            console.log(`❌ User ${user.user_id} failed validation`)
            continue
          }

          const userDetails = await getStackOverflowUserDetails(user.user_id)
          if (!userDetails) {
            console.log(`❌ Failed to get details for user ${user.user_id}`)
            continue
          }

          const profile = buildStackOverflowProfile(userDetails)
          const scores = calculateStackOverflowScore(userDetails)

          // Use shared candidate builder
          const candidate = buildCandidate({
            name: profile.name,
            title: profile.title,
            location: profile.location,
            avatar_url: userDetails.profile_image,
            email: null,
            summary: profile.summary,
            skills: profile.skills,
            experience_years: profile.estimatedExperience,
            last_active: new Date(userDetails.last_access_date * 1000).toISOString(),
            platform: 'stackoverflow',
            platformSpecificData: {
              reputation: userDetails.reputation,
              badge_counts: userDetails.badge_counts
            }
          })

          // Override scores with Stack Overflow specific calculations
          candidate.overall_score = scores.overall
          candidate.skill_match = scores.skillMatch
          candidate.experience = scores.experience
          candidate.reputation = scores.reputation
          candidate.freshness = scores.freshness
          candidate.social_proof = scores.socialProof
          candidate.risk_flags = profile.riskFlags

          const sourceData = {
            candidate_id: candidate.id,
            platform: 'stackoverflow',
            platform_id: userDetails.user_id.toString(),
            url: userDetails.link || `https://stackoverflow.com/users/${userDetails.user_id}`,
            data: {
              user_details: userDetails,
              profile: profile,
              scores: scores
            }
          }

          // Use shared database operations
          const saveResult = await saveCandidateWithSource(supabase, candidate, sourceData)
          
          if (saveResult.success) {
            candidates.push(candidate)
            console.log(`💾 Saved candidate: ${candidate.name} (${user.user_id})`)
          } else {
            console.error(`❌ Failed to save candidate ${user.user_id}:`, saveResult.error)
          }

        } catch (error) {
          console.log(`❌ Error processing SO user ${user.user_id}:`, error.message)
          continue
        }
      }

    } catch (error) {
      console.error(`❌ Stack Overflow API error:`, error)
    }

    const processingTime = Date.now() - startTime
    console.log(`✅ Stack Overflow collection completed in ${processingTime}ms: ${candidates.length} candidates`)

    return new Response(
      JSON.stringify({ 
        candidates: candidates,
        total: candidates.length,
        source: 'stackoverflow',
        processing_time_ms: processingTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error collecting Stack Overflow data:', error)
    return new Response(
      JSON.stringify({ 
        candidates: [], 
        total: 0, 
        source: 'stackoverflow',
        error: 'Failed to collect Stack Overflow data' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
