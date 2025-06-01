
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

    console.log('🚀 Starting optimized GitHub candidate collection...')

    const candidates = []
    const seenUsers = new Set()
    const startTime = Date.now()
    const MAX_PROCESSING_TIME = 12000 // 12 seconds max
    
    // Simplified search strategy for speed
    const searchStrategy = {
      name: 'Fast Search',
      query: query.split(' ').slice(0, 2).join(' '), // Use only first 2 words
      sort: 'followers'
    }

    try {
      console.log(`🔍 GitHub search: ${searchStrategy.name}`)
      
      const { users, hasMore } = await searchGitHubUsers(searchStrategy.query, searchStrategy.sort)
      
      console.log(`📋 Found ${users.length} GitHub users`)

      // Process users with time limit
      for (const user of users.slice(0, 8)) { // Reduced to 8 users max
        // Check time limit
        if (Date.now() - startTime > MAX_PROCESSING_TIME) {
          console.log('⏰ Time limit reached, stopping processing')
          break
        }

        if (seenUsers.has(user.login)) continue
        seenUsers.add(user.login)

        if (candidates.length >= 8) { // Reduced to 8 candidates max
          console.log('✅ Reached candidate limit, stopping collection')
          break
        }

        try {
          if (!validateGitHubUser(user)) {
            console.log(`❌ User ${user.login} failed validation`)
            continue
          }

          const userProfile = await getGitHubUserProfile(user.login)
          if (!userProfile) {
            console.log(`❌ Failed to get profile for user ${user.login}`)
            continue
          }

          // Skip repo fetching for speed - use profile data only
          const repos = []
          const enhancedProfile = buildEnhancedProfile(userProfile, repos)

          // Simplified scoring for speed
          const repoScore = Math.round(Math.min(Math.max((userProfile.public_repos || 0) * 3, 0), 100))
          const contributionScore = Math.round(Math.min(Math.max((userProfile.followers || 0) * 2, 0), 100))
          const skillScore = Math.round(Math.min(Math.max(enhancedProfile.skills.length * 15, 0), 100))
          const activityScore = 80 // Default good activity score
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
            experience_years: Math.round(Math.min(Math.max(enhancedProfile.estimatedExperience, 1), 20)),
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

          candidates.push(candidate)

          // Fast database save without complex logic
          try {
            const { error: insertError } = await supabase
              .from('candidates')
              .upsert({
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
              }, {
                onConflict: 'github_username'
              })

            if (!insertError) {
              console.log(`✅ Saved candidate: ${candidate.name}`)
            }

          } catch (error) {
            console.log(`⚠️ Failed to save candidate ${user.login}, continuing...`)
          }

        } catch (error) {
          console.log(`❌ Error processing GitHub user ${user.login}:`, error.message)
          continue
        }
      }

    } catch (error) {
      console.error(`❌ GitHub search error:`, error)
    }

    const sortedCandidates = candidates
      .sort((a, b) => (b.skill_match + b.reputation) - (a.skill_match + a.reputation))

    const processingTime = Date.now() - startTime
    console.log(`✅ GitHub collection completed in ${processingTime}ms: ${sortedCandidates.length} candidates`)

    return new Response(
      JSON.stringify({ 
        candidates: sortedCandidates,
        total: sortedCandidates.length,
        source: 'github',
        processing_time_ms: processingTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error collecting GitHub data:', error)
    return new Response(
      JSON.stringify({ 
        candidates: [], 
        total: 0, 
        source: 'github',
        error: 'Failed to collect GitHub data' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
