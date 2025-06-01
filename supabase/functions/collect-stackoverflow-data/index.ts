
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { searchStackOverflowUsers, getStackOverflowUserDetails } from './api-client.ts'
import { validateStackOverflowUser, isQualityStackOverflowCandidate } from './user-validator.ts'
import { buildStackOverflowProfile } from './profile-builder.ts'
import { calculateStackOverflowScore } from './scoring-engine.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generateUUID() {
  return crypto.randomUUID();
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

      for (const user of users.slice(0, 8)) { // Limit to 8 users
        try {
          console.log(`🔍 Validating user ${user.user_id}: reputation=${user.reputation}, answers=${user.answer_count}, questions=${user.question_count}`)
          
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

          const candidateId = generateUUID()

          const candidate = {
            id: candidateId,
            name: profile.name,
            title: profile.title,
            location: profile.location,
            avatar_url: userDetails.profile_image,
            email: null, // Stack Overflow doesn't provide emails
            stackoverflow_id: userDetails.user_id.toString(),
            summary: profile.summary,
            skills: profile.skills,
            experience_years: profile.estimatedExperience,
            last_active: new Date(userDetails.last_access_date * 1000).toISOString(),
            overall_score: scores.overall,
            skill_match: scores.skillMatch,
            experience: scores.experience,
            reputation: scores.reputation,
            freshness: scores.freshness,
            social_proof: scores.socialProof,
            risk_flags: profile.riskFlags,
            platform: 'stackoverflow'
          }

          candidates.push(candidate)

          // Save candidate to database with proper error handling
          try {
            console.log(`💾 Saving Stack Overflow candidate: ${candidate.name} (${user.user_id})`)
            
            // Check for existing candidate by stackoverflow_id
            const { data: existingCandidate, error: selectError } = await supabase
              .from('candidates')
              .select('id')
              .eq('stackoverflow_id', userDetails.user_id.toString())
              .maybeSingle()

            if (selectError) {
              console.error(`❌ Error checking existing SO candidate for ${user.user_id}:`, selectError.message)
              continue
            }

            if (existingCandidate) {
              // Update existing candidate
              const { error: updateError } = await supabase
                .from('candidates')
                .update({
                  name: candidate.name,
                  title: candidate.title,
                  location: candidate.location,
                  avatar_url: candidate.avatar_url,
                  summary: candidate.summary,
                  skills: candidate.skills,
                  experience_years: candidate.experience_years,
                  last_active: candidate.last_active,
                  overall_score: candidate.overall_score,
                  skill_match: candidate.skill_match,
                  experience: candidate.experience,
                  reputation: candidate.reputation,
                  freshness: candidate.freshness,
                  social_proof: candidate.social_proof,
                  risk_flags: candidate.risk_flags,
                  updated_at: new Date().toISOString()
                })
                .eq('id', existingCandidate.id)

              if (updateError) {
                console.error(`❌ Error updating SO candidate ${user.user_id}:`, updateError.message)
                continue
              }

              console.log(`✅ Updated existing SO candidate: ${candidate.name}`)
              candidate.id = existingCandidate.id
            } else {
              // Insert new candidate
              const { error: insertError } = await supabase
                .from('candidates')
                .insert({
                  id: candidateId,
                  name: candidate.name,
                  title: candidate.title,
                  location: candidate.location,
                  avatar_url: candidate.avatar_url,
                  stackoverflow_id: candidate.stackoverflow_id,
                  summary: candidate.summary,
                  skills: candidate.skills,
                  experience_years: candidate.experience_years,
                  last_active: candidate.last_active,
                  overall_score: candidate.overall_score,
                  skill_match: candidate.skill_match,
                  experience: candidate.experience,
                  reputation: candidate.reputation,
                  freshness: candidate.freshness,
                  social_proof: candidate.social_proof,
                  risk_flags: candidate.risk_flags
                })

              if (insertError) {
                console.error(`❌ Error inserting SO candidate ${user.user_id}:`, insertError.message)
                continue
              }

              console.log(`✅ Inserted new SO candidate: ${candidate.name}`)
            }

            // Add candidate source record
            try {
              const { error: sourceError } = await supabase
                .from('candidate_sources')
                .insert({
                  candidate_id: candidate.id,
                  platform: 'stackoverflow',
                  platform_id: userDetails.user_id.toString(),
                  url: userDetails.link || `https://stackoverflow.com/users/${userDetails.user_id}`,
                  data: {
                    user_details: userDetails,
                    profile: profile,
                    scores: scores
                  }
                })

              if (sourceError) {
                console.error(`⚠️ Failed to save SO source for ${user.user_id}:`, sourceError.message)
              } else {
                console.log(`📝 Saved SO source record for ${user.user_id}`)
              }
            } catch (sourceErr) {
              console.error(`⚠️ Exception saving SO source for ${user.user_id}:`, sourceErr)
            }

          } catch (error) {
            console.error(`❌ Database operation failed for SO user ${user.user_id}:`, error.message)
            continue
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
