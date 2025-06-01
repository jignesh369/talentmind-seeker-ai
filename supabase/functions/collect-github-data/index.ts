import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { searchGitHubUsers, getGitHubUserProfile, getGitHubUserRepos } from './api-client.ts'
import { buildEnhancedProfile } from './profile-builder.ts'
import { 
  calculateRepoScore,
  calculateContributionScore,
  calculateSkillScore,
  calculateActivityScore
} from './scoring-engine.ts'
import { validateGitHubUser } from './user-validator.ts'

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

    console.log('🚀 Starting enhanced GitHub candidate collection...')

    const candidates = []
    const seenUsers = new Set()
    const enhancementStats = {
      total_processed: 0,
      validation_passed: 0,
      ai_enhanced_profiles: 0,
      high_star_repos: 0
    }

    // Simplified search strategies for better results
    const searchStrategies = [
      {
        name: 'Direct Skill Search',
        query: query.split(' ').slice(0, 3).join(' '), // Use first 3 words only
        sort: 'followers'
      },
      {
        name: 'Location Search',
        query: `${query.split(' ')[0]} location:${location || 'anywhere'}`,
        sort: 'followers'
      }
    ]

    for (const strategy of searchStrategies) {
      try {
        console.log(`🔍 GitHub search strategy: ${strategy.name}`)
        
        const { users, hasMore } = await searchGitHubUsers(strategy.query, strategy.sort)
        
        console.log(`📋 Found ${users.length} GitHub users for strategy: ${strategy.name}`)
        enhancementStats.total_processed += users.length

        for (const user of users.slice(0, 15)) { // Reduced from 20 to 15
          if (seenUsers.has(user.login)) continue
          seenUsers.add(user.login)

          if (candidates.length >= 20) { // Reduced from 25 to 20
            console.log('✅ Reached candidate limit, stopping collection')
            break
          }

          try {
            if (!validateGitHubUser(user)) {
              console.log(`❌ User ${user.login} failed validation`)
              continue
            }

            enhancementStats.validation_passed++

            const userProfile = await getGitHubUserProfile(user.login)
            if (!userProfile) {
              console.log(`❌ Failed to get profile for user ${user.login}`)
              continue
            }

            const repos = await getGitHubUserRepos(user.login)
            if (!repos) {
              console.log(`⚠️ No repos found for user ${user.login}`)
            }

            const enhancedProfile = buildEnhancedProfile(userProfile, repos)

            // Calculate scores with proper integer conversion
            const repoScore = Math.round(Math.min(Math.max(calculateRepoScore(repos), 0), 100))
            const contributionScore = Math.round(Math.min(Math.max(calculateContributionScore(userProfile), 0), 100))
            const skillScore = Math.round(Math.min(Math.max(calculateSkillScore(userProfile, repos, enhancedQuery?.skills || []), 0), 100))
            const activityScore = Math.round(Math.min(Math.max(calculateActivityScore(userProfile, repos), 0), 100))
            const overallScore = Math.round((repoScore + contributionScore + skillScore + activityScore) / 4)

            const candidateId = generateUUID()

            const candidate = {
              id: candidateId,
              name: userProfile.name || userProfile.login,
              title: enhancedProfile.title,
              location: userProfile.location || location || '',
              avatar_url: userProfile.avatar_url,
              email: enhancedProfile.email,
              github_username: user.login,
              summary: enhancedProfile.summary,
              skills: enhancedProfile.skills,
              experience_years: Math.round(Math.min(Math.max(enhancedProfile.estimatedExperience, 1), 20)), // Ensure 1-20 range
              last_active: userProfile.updated_at || new Date().toISOString(),
              overall_score: overallScore,
              skill_match: skillScore,
              experience: Math.round(Math.min(Math.max(enhancedProfile.estimatedExperience * 10, 0), 100)),
              reputation: repoScore,
              freshness: activityScore,
              social_proof: Math.round(Math.min(Math.max((userProfile.followers || 0) / 10, 0), 100)),
              risk_flags: enhancedProfile.riskFlags,
              platform: 'github'
            }

            try {
              const enhanceResponse = await supabase.functions.invoke('enhance-candidate-profile', {
                body: { candidate, platform: 'github' }
              })

              if (enhanceResponse.data?.enhanced_candidate) {
                Object.assign(candidate, enhanceResponse.data.enhanced_candidate)
                if (enhanceResponse.data.ai_enhanced) {
                  enhancementStats.ai_enhanced_profiles++
                }
              }
            } catch (error) {
              console.log(`⚠️ AI enhancement failed for user ${user.login}, continuing with basic profile`)
            }

            candidates.push(candidate)

            // Save enhanced candidate to database with proper integer values
            try {
              // Check for existing candidate by github_username
              const { data: existingCandidate } = await supabase
                .from('candidates')
                .select('id')
                .eq('github_username', candidate.github_username)
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
                    email: candidate.email,
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
                  console.error(`❌ Error updating candidate ${user.login}:`, updateError)
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
                    email: candidate.email,
                    github_username: candidate.github_username,
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
                  console.error(`❌ Error inserting candidate ${user.login}:`, insertError)
                  continue
                }

                console.log(`✅ Inserted new candidate: ${candidate.name} with ID: ${candidateId}`)
              }

              const { error: sourceError } = await supabase
                .from('candidate_sources')
                .upsert({
                  candidate_id: savedCandidateId,
                  platform: 'github',
                  platform_id: user.login,
                  url: userProfile.html_url,
                  data: {
                    ...userProfile,
                    repos: repos.slice(0, 5),
                    enhancement_timestamp: new Date().toISOString()
                  }
                }, {
                  onConflict: 'candidate_id,platform'
                })

              if (sourceError) {
                console.error(`❌ Error saving source data for ${user.login}:`, sourceError)
              } else {
                console.log(`✅ Saved source data for ${candidate.name}`)
              }

            } catch (error) {
              console.error(`❌ Critical error saving data for user ${user.login}:`, error)
            }

          } catch (error) {
            console.error(`❌ Error processing GitHub user ${user.login}:`, error)
            continue
          }
        }

        if (candidates.length >= 20) break

        // Rate limiting - wait between searches
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        console.error(`❌ GitHub search error for strategy "${strategy.name}":`, error)
        continue
      }
    }

    const sortedCandidates = candidates
      .sort((a, b) => (b.skill_match + b.reputation) - (a.skill_match + a.reputation))
      .slice(0, 25)

    console.log(`✅ GitHub collection completed: ${sortedCandidates.length} enhanced candidates`)
    console.log(`📊 Stats: ${enhancementStats.high_star_repos} high star repos, ${enhancementStats.ai_enhanced_profiles} AI enhanced, ${enhancementStats.validation_passed}/${enhancementStats.total_processed} passed validation`)

    return new Response(
      JSON.stringify({ 
        candidates: sortedCandidates,
        total: sortedCandidates.length,
        source: 'github',
        enhancement_stats: enhancementStats
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error collecting enhanced GitHub data:', error)
    return new Response(
      JSON.stringify({ 
        candidates: [], 
        total: 0, 
        source: 'github',
        error: 'Failed to collect enhanced GitHub data' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
