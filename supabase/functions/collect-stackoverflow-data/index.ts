
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

import { generatePrioritizedTags, generateUsernameVariations, EnhancedQuery } from './tag-mapper.ts'
import { 
  isEnhancedQualityContributor, 
  calculateEnhancedSORiskFlags, 
  cleanLocation, 
  calculateSOFreshness,
  UserInfo,
  AnswererStats,
  UserTag
} from './user-validator.ts'
import {
  calculateExpertiseScore,
  calculateEnhancedReputationScore,
  calculateEnhancedSOActivityScore,
  calculateEnhancedSOSkillMatch,
  calculateAnswerQualityScore
} from './scoring-engine.ts'
import {
  createEnhancedSOTitle,
  createEnhancedSOSummary,
  enhanceSkillsFromTags
} from './profile-builder.ts'
import {
  verifyStackOverflowTag,
  getTopAnswerers,
  getUserDetails,
  getUserTopTags
} from './api-client.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const stackOverflowKey = Deno.env.get('STACKOVERFLOW_API_KEY') || ''

    // Generate prioritized tags using the new module
    const uniqueTags = generatePrioritizedTags(enhancedQuery)
    console.log('Enhanced SO tags search strategy:', uniqueTags)

    const candidates = []
    const seenUsers = new Set()

    // Enhanced search strategy focusing on top-answerers
    for (const tag of uniqueTags) {
      try {
        // Step 1: Verify tag exists
        const tagExists = await verifyStackOverflowTag(tag, stackOverflowKey)
        if (!tagExists) continue

        // Step 2: Get top answerers (multiple time periods for better coverage)
        const timeFrames = ['all_time', 'month']
        
        for (const timeFrame of timeFrames) {
          const answererResult = await getTopAnswerers(tag, timeFrame, stackOverflowKey)
          if (!answererResult) continue
          
          if (answererResult.quotaLow) break

          const topAnswerers = answererResult.items
          console.log(`Found ${topAnswerers.length} top answerers for tag ${tag} (${timeFrame})`)

          // Process top answerers with enhanced filtering
          for (const answerer of topAnswerers.slice(0, 12)) {
            const userId = answerer.user?.user_id
            if (!userId || seenUsers.has(userId)) continue
            seenUsers.add(userId)

            try {
              // Enhanced user detail fetching
              const userInfo = await getUserDetails(userId, stackOverflowKey)
              if (!userInfo) continue

              // Get user's top tags for comprehensive skill analysis
              const userTags = await getUserTopTags(userId, stackOverflowKey)

              // Enhanced quality validation
              if (!isEnhancedQualityContributor(userInfo, answerer, userTags, tag)) {
                console.log(`Skipping ${userInfo.display_name} - doesn't meet enhanced quality criteria`)
                continue
              }

              // Calculate enhanced experience and scoring
              const accountAgeYears = Math.floor((Date.now() - userInfo.creation_date * 1000) / (365 * 24 * 60 * 60 * 1000))
              const estimatedExperience = Math.min(Math.max(accountAgeYears, 1), 15)

              // Enhanced scoring system
              const expertiseScore = calculateExpertiseScore(userInfo, answerer, userTags, tag)
              const reputationScore = calculateEnhancedReputationScore(userInfo)
              const activityScore = calculateEnhancedSOActivityScore(userInfo, answerer)
              const skillMatchScore = calculateEnhancedSOSkillMatch(userTags, uniqueTags, enhancedQuery)

              const candidate = {
                name: userInfo.display_name || `SO Expert ${userId}`,
                title: createEnhancedSOTitle(userTags, answerer, expertiseScore),
                location: cleanLocation(userInfo.location) || location || '',
                avatar_url: userInfo.profile_image,
                stackoverflow_id: userId.toString(),
                summary: createEnhancedSOSummary(userInfo, answerer, userTags, expertiseScore),
                skills: enhanceSkillsFromTags(userTags, uniqueTags),
                experience_years: estimatedExperience,
                last_active: new Date(userInfo.last_access_date * 1000).toISOString(),
                overall_score: Math.round((expertiseScore + reputationScore + activityScore + skillMatchScore) / 4),
                skill_match: skillMatchScore,
                experience: Math.min(estimatedExperience * 6 + Math.log10(userInfo.reputation || 1) * 8, 90),
                reputation: reputationScore,
                freshness: calculateSOFreshness(userInfo.last_access_date),
                social_proof: Math.min((userInfo.up_vote_count || 0) / 15, 100),
                risk_flags: calculateEnhancedSORiskFlags(userInfo, userTags),
                expertise_score: expertiseScore,
                primary_expertise: userTags[0]?.name || tag,
                answer_quality_score: calculateAnswerQualityScore(answerer, userInfo)
              }

              candidates.push(candidate)

              // Save enhanced source data with cross-platform identifiers
              await supabase
                .from('candidate_sources')
                .upsert({
                  candidate_id: userId.toString(),
                  platform: 'stackoverflow',
                  platform_id: userId.toString(),
                  url: userInfo.link,
                  data: { 
                    ...userInfo, 
                    top_tags: userTags,
                    answerer_stats: answerer,
                    expertise_level: expertiseScore > 70 ? 'expert' : 'advanced',
                    cross_platform_search: {
                      name: userInfo.display_name,
                      username_variations: generateUsernameVariations(userInfo.display_name)
                    }
                  }
                }, { onConflict: 'platform,platform_id' })

            } catch (error) {
              console.error(`Error processing SO user ${userId}:`, error)
              continue
            }
          }
        }

      } catch (error) {
        console.error(`Error searching SO tag ${tag}:`, error)
        continue
      }
    }

    // Enhanced sorting with multiple criteria
    const sortedCandidates = candidates
      .sort((a, b) => {
        const scoreA = a.overall_score + a.expertise_score + a.answer_quality_score
        const scoreB = b.overall_score + b.expertise_score + b.answer_quality_score
        return scoreB - scoreA
      })
      .slice(0, 25)

    console.log(`Collected ${sortedCandidates.length} enhanced candidates from Stack Overflow`)

    return new Response(
      JSON.stringify({ 
        candidates: sortedCandidates,
        total: sortedCandidates.length,
        source: 'stackoverflow',
        enhancement_stats: {
          tags_searched: uniqueTags.length,
          expert_level_candidates: sortedCandidates.filter(c => c.expertise_score > 70).length,
          avg_expertise_score: Math.round(sortedCandidates.reduce((sum, c) => sum + c.expertise_score, 0) / sortedCandidates.length),
          cross_platform_data_ready: sortedCandidates.length
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error collecting enhanced Stack Overflow data:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to collect enhanced Stack Overflow data' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
