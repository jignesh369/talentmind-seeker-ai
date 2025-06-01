
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { searchGitHubUsers, getGitHubUserProfile, getGitHubUserRepos } from './api-client.ts'
import { buildEnhancedProfile } from './profile-builder.ts'
import { validateGitHubUser } from './user-validator.ts'
import { saveCandidateWithSource, generateUUID } from '../shared/database-operations.ts'
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
    const { query, location } = await req.json()

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
    
    const searchStrategy = {
      name: 'Fast Search',
      query: query.split(' ').slice(0, 2).join(' '),
      sort: 'followers'
    }

    try {
      console.log(`🔍 GitHub search: ${searchStrategy.name}`)
      
      const { users } = await searchGitHubUsers(searchStrategy.query, searchStrategy.sort)
      console.log(`📋 Found ${users.length} GitHub users`)

      for (const user of users.slice(0, 8)) {
        if (Date.now() - startTime > MAX_PROCESSING_TIME) {
          console.log('⏰ Time limit reached, stopping processing')
          break
        }

        if (seenUsers.has(user.login)) continue
        seenUsers.add(user.login)

        if (candidates.length >= 8) {
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

          const repos = []
          const enhancedProfile = buildEnhancedProfile(userProfile, repos)

          const candidate = buildCandidate({
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
            platform: 'github',
            platformSpecificData: {
              public_repos: userProfile.public_repos,
              followers: userProfile.followers
            }
          })

          const sourceData = {
            candidate_id: candidate.id,
            platform: 'github',
            platform_id: user.login,
            url: userProfile.html_url,
            data: {
              profile: userProfile,
              enhanced_profile: enhancedProfile
            }
          }

          const saveResult = await saveCandidateWithSource(supabase, candidate, sourceData)
          
          if (saveResult.success) {
            candidates.push(candidate)
            console.log(`💾 Saved candidate: ${candidate.name} (${user.login})`)
          } else {
            console.error(`❌ Failed to save candidate ${user.login}:`, saveResult.error)
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
