import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { 
  searchStackOverflowUsers,
  getUserProfile,
  getUserAnswers,
  getUserQuestions,
  getTagInfo
} from './api-client.ts'
import { buildEnhancedProfile } from './profile-builder.ts'
import { 
  calculateAnswerQualityScore,
  calculateExpertiseScore,
  calculateReputationScore,
  calculateActivityScore
} from './scoring-engine.ts'
import { mapSkillsToTags, getRelevantTags } from './tag-mapper.ts'
import { validateStackOverflowUser } from './user-validator.ts'

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
    const { query, location, enhancedQuery } = await req.json()

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

    console.log('🚀 Starting enhanced Stack Overflow candidate collection...')

    const candidates = []
    const seenUsers = new Set()
    const enhancementStats = {
      total_processed: 0,
      validation_passed: 0,
      ai_enhanced_profiles: 0,
      high_reputation_users: 0
    }

    try {
      // Map query skills to Stack Overflow tags
      const relevantTags = getRelevantTags(enhancedQuery?.skills || [query])
      console.log(`📊 Searching Stack Overflow for tags: ${relevantTags.slice(0, 5).join(', ')}`)

      // Search by multiple relevant tags
      for (const tag of relevantTags.slice(0, 3)) {
        try {
          console.log(`🔍 Searching Stack Overflow users by tag: ${tag}`)
          
          const searchResult = await searchStackOverflowUsers(tag)
          
          // Handle case where API call fails
          if (!searchResult || !searchResult.users) {
            console.log(`⚠️ No users returned for tag: ${tag}`)
            continue
          }
          
          const { users, hasMore, quotaRemaining } = searchResult
          
          if (quotaRemaining <= 100) {
            console.log('⚠️ Stack Overflow API quota running low, limiting requests')
          }

          console.log(`📋 Found ${users.length} Stack Overflow users for tag: ${tag}`)
          enhancementStats.total_processed += users.length

          for (const user of users.slice(0, 20)) {
            if (seenUsers.has(user.user_id)) continue
            seenUsers.add(user.user_id)

            if (candidates.length >= 25) {
              console.log('✅ Reached candidate limit, stopping collection')
              break
            }

            try {
              // Validate user before processing
              if (!validateStackOverflowUser(user)) {
                console.log(`❌ User ${user.user_id} failed validation`)
                continue
              }

              enhancementStats.validation_passed++

              // Get detailed user profile
              const userProfile = await getUserProfile(user.user_id)
              if (!userProfile) {
                console.log(`❌ Failed to get profile for user ${user.user_id}`)
                continue
              }

              // Get user's answers and questions for expertise analysis
              const [answers, questions] = await Promise.all([
                getUserAnswers(user.user_id),
                getUserQuestions(user.user_id)
              ])

              // Build enhanced profile
              const enhancedProfile = buildEnhancedProfile(userProfile, answers, questions, tag)

              // Calculate enhanced scores - ensure integers
              const answerQualityScore = Math.round(calculateAnswerQualityScore(answers))
              const expertiseScore = Math.round(calculateExpertiseScore(userProfile, answers, relevantTags))
              const reputationScore = Math.round(calculateReputationScore(userProfile.reputation))
              const activityScore = Math.round(calculateActivityScore(userProfile, answers, questions))
              const overallScore = Math.round((expertiseScore + reputationScore + activityScore + answerQualityScore) / 4)

              // Track high reputation users
              if (userProfile.reputation > 10000) {
                enhancementStats.high_reputation_users++
              }

              const candidateId = generateUUID()

              const candidate = {
                id: candidateId,
                name: userProfile.display_name || `StackOverflow User ${user.user_id}`,
                title: `${tag.charAt(0).toUpperCase() + tag.slice(1)} Developer`,
                location: userProfile.location || location || '',
                avatar_url: userProfile.profile_image,
                email: null, // Stack Overflow doesn't provide emails
                stackoverflow_id: user.user_id.toString(),
                stackoverflow_url: userProfile.link,
                summary: enhancedProfile.summary,
                skills: enhancedProfile.skills,
                experience_years: Math.round(enhancedProfile.estimatedExperience), // Ensure integer
                last_active: userProfile.last_access_date ? new Date(userProfile.last_access_date * 1000).toISOString() : new Date().toISOString(),
                overall_score: Math.min(Math.max(overallScore, 0), 100), // Ensure 0-100 range
                skill_match: Math.min(Math.max(expertiseScore, 0), 100),
                experience: Math.min(Math.max(Math.round(enhancedProfile.estimatedExperience * 8), 0), 100),
                reputation: Math.min(Math.max(reputationScore, 0), 100),
                freshness: Math.min(Math.max(activityScore, 0), 100),
                social_proof: Math.min(Math.max(Math.round((userProfile.reputation || 0) / 100), 0), 100),
                risk_flags: enhancedProfile.riskFlags,
                stackoverflow_reputation: userProfile.reputation,
                answer_count: userProfile.answer_count,
                question_count: userProfile.question_count,
                answer_quality_score: answerQualityScore,
                expertise_score: expertiseScore,
                platform: 'stackoverflow'
              }

              // Enhance profile with AI
              try {
                const enhanceResponse = await supabase.functions.invoke('enhance-candidate-profile', {
                  body: { candidate, platform: 'stackoverflow' }
                })

                if (enhanceResponse.data?.enhanced_candidate) {
                  Object.assign(candidate, enhanceResponse.data.enhanced_candidate)
                  if (enhanceResponse.data.ai_enhanced) {
                    enhancementStats.ai_enhanced_profiles++
                  }
                }
              } catch (error) {
                console.log(`⚠️ AI enhancement failed for user ${user.user_id}, continuing with basic profile`)
              }

              candidates.push(candidate)

              // Save enhanced candidate to database with proper integer values
              try {
                // Check for existing candidate by stackoverflow_id
                const { data: existingCandidate } = await supabase
                  .from('candidates')
                  .select('id')
                  .eq('stackoverflow_id', candidate.stackoverflow_id)
                  .limit(1)
                  .maybeSingle()

                let savedCandidateId = candidateId

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
                    console.error(`❌ Error updating candidate ${user.user_id}:`, updateError)
                    continue
                  }

                  savedCandidateId = existingCandidate.id
                  console.log(`🔄 Updated existing candidate: ${candidate.name}`)
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
                    console.error(`❌ Error inserting candidate ${user.user_id}:`, insertError)
                    continue
                  }

                  console.log(`✅ Inserted new candidate: ${candidate.name} with ID: ${candidateId}`)
                }

                // Save/update source data
                const { error: sourceError } = await supabase
                  .from('candidate_sources')
                  .upsert({
                    candidate_id: savedCandidateId,
                    platform: 'stackoverflow',
                    platform_id: user.user_id.toString(),
                    url: userProfile.link,
                    data: {
                      ...userProfile,
                      answers: answers.slice(0, 10), // Limit stored answers
                      questions: questions.slice(0, 5), // Limit stored questions
                      search_tag: tag,
                      enhancement_timestamp: new Date().toISOString()
                    }
                  }, {
                    onConflict: 'candidate_id,platform'
                  })

                if (sourceError) {
                  console.error(`❌ Error saving source data for ${user.user_id}:`, sourceError)
                } else {
                  console.log(`✅ Saved source data for ${candidate.name}`)
                }

              } catch (error) {
                console.error(`❌ Critical error saving data for user ${user.user_id}:`, error)
              }

            } catch (error) {
              console.error(`❌ Error processing Stack Overflow user ${user.user_id}:`, error)
              continue
            }
          }

          if (candidates.length >= 25) break

          // Rate limiting - wait between tag searches
          await new Promise(resolve => setTimeout(resolve, 1000))

        } catch (error) {
          console.error(`❌ Stack Overflow search error for tag "${tag}":`, error)
          continue
        }
      }

    } catch (error) {
      console.error(`❌ Stack Overflow API error:`, error)
      // Return partial results even if API fails
    }

    // Sort by expertise and reputation
    const sortedCandidates = candidates
      .sort((a, b) => (b.expertise_score + b.reputation) - (a.expertise_score + a.reputation))
      .slice(0, 30)

    console.log(`✅ Stack Overflow collection completed: ${sortedCandidates.length} enhanced candidates`)
    console.log(`📊 Stats: ${enhancementStats.high_reputation_users} high reputation, ${enhancementStats.ai_enhanced_profiles} AI enhanced, ${enhancementStats.validation_passed}/${enhancementStats.total_processed} passed validation`)

    return new Response(
      JSON.stringify({ 
        candidates: sortedCandidates,
        total: sortedCandidates.length,
        source: 'stackoverflow',
        enhancement_stats: enhancementStats
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error collecting enhanced Stack Overflow data:', error)
    return new Response(
      JSON.stringify({ 
        candidates: [], 
        total: 0, 
        source: 'stackoverflow',
        error: 'Failed to collect enhanced Stack Overflow data' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
