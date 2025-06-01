
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    // Get Stack Overflow API key (optional)
    const stackOverflowKey = Deno.env.get('STACKOVERFLOW_API_KEY') || ''

    // Extract and normalize technical tags from enhanced query
    const skills = enhancedQuery?.skills || []
    const keywords = enhancedQuery?.keywords || []
    
    // Map common terms to Stack Overflow tags
    const tagMapping = {
      'javascript': 'javascript',
      'python': 'python',
      'java': 'java',
      'c++': 'c++',
      'c#': 'c#',
      'typescript': 'typescript',
      'react': 'reactjs',
      'angular': 'angular',
      'vue': 'vue.js',
      'node.js': 'node.js',
      'machine learning': 'machine-learning',
      'machine-learning': 'machine-learning',
      'ml': 'machine-learning',
      'django': 'django',
      'flask': 'flask',
      'spring': 'spring',
      'aws': 'amazon-web-services',
      'docker': 'docker',
      'kubernetes': 'kubernetes'
    }

    const searchTerms = [...skills, ...keywords].map(term => term.toLowerCase())
    const techTags = []
    
    // Map search terms to SO tags
    searchTerms.forEach(term => {
      if (tagMapping[term]) {
        techTags.push(tagMapping[term])
      } else if (term.length > 2) {
        techTags.push(term.replace(/\s+/g, '-'))
      }
    })

    // Fallback tags if none found
    if (techTags.length === 0) {
      techTags.push('javascript', 'python', 'java')
    }

    console.log('Searching SO users for tags:', techTags.slice(0, 5))

    const candidates = []
    const seenUsers = new Set()

    // Search for top answerers in relevant tags
    for (const tag of techTags.slice(0, 4)) { // Limit to 4 tags to avoid rate limits
      try {
        // First, check if the tag exists
        const tagCheckResponse = await fetch(
          `https://api.stackexchange.com/2.3/tags/${encodeURIComponent(tag)}/info?site=stackoverflow${stackOverflowKey ? `&key=${stackOverflowKey}` : ''}`
        )

        if (!tagCheckResponse.ok) {
          console.log(`Tag ${tag} not found or API error:`, tagCheckResponse.status)
          continue
        }

        const tagData = await tagCheckResponse.json()
        if (!tagData.items || tagData.items.length === 0) {
          console.log(`Tag ${tag} does not exist`)
          continue
        }

        // Get top answerers for this tag (all time)
        const topAnswerersResponse = await fetch(
          `https://api.stackexchange.com/2.3/tags/${encodeURIComponent(tag)}/top-answerers/all_time?site=stackoverflow&pagesize=25${stackOverflowKey ? `&key=${stackOverflowKey}` : ''}`
        )

        if (!topAnswerersResponse.ok) {
          console.log(`Stack Overflow API error for tag ${tag}:`, topAnswerersResponse.status)
          continue
        }

        const topAnswerersData = await topAnswerersResponse.json()
        
        if (topAnswerersData.quota_remaining && topAnswerersData.quota_remaining < 10) {
          console.log('Stack Overflow quota low, breaking')
          break
        }

        const topAnswerers = topAnswerersData.items || []
        console.log(`Found ${topAnswerers.length} top answerers for tag ${tag}`)

        for (const answerer of topAnswerers.slice(0, 15)) {
          const userId = answerer.user?.user_id
          if (!userId || seenUsers.has(userId)) continue
          seenUsers.add(userId)

          try {
            // Get detailed user info
            const userResponse = await fetch(
              `https://api.stackexchange.com/2.3/users/${userId}?site=stackoverflow&filter=!*MxJLn4C3Kt3tQV${stackOverflowKey ? `&key=${stackOverflowKey}` : ''}`
            )

            if (!userResponse.ok) {
              console.log(`Failed to get user details for ${userId}`)
              continue
            }

            const userData = await userResponse.json()
            const userInfo = userData.items?.[0]

            if (!userInfo) continue

            // Get user's top tags for better skill analysis
            const tagsResponse = await fetch(
              `https://api.stackexchange.com/2.3/users/${userId}/top-tags?site=stackoverflow&pagesize=10${stackOverflowKey ? `&key=${stackOverflowKey}` : ''}`
            )

            let userTags = []
            if (tagsResponse.ok) {
              const tagsData = await tagsResponse.json()
              userTags = (tagsData.items || []).map(item => item.tag_name)
            }

            // Enhanced validation for quality contributors
            if (!isQualityContributor(userInfo, answerer, userTags)) {
              continue
            }

            // Calculate enhanced experience estimate
            const accountAgeYears = Math.floor((Date.now() - userInfo.creation_date * 1000) / (365 * 24 * 60 * 60 * 1000))
            const estimatedExperience = Math.min(Math.max(accountAgeYears, 1), 15)

            // Calculate quality scores
            const reputationScore = Math.min((userInfo.reputation || 0) / 100, 100)
            const activityScore = calculateSOActivityScore(userInfo)
            const skillMatchScore = calculateSOSkillMatch(userTags, techTags)

            const candidate = {
              name: userInfo.display_name || `SO User ${userId}`,
              title: createSOTitle(userTags, answerer),
              location: cleanLocation(userInfo.location) || location || '',
              avatar_url: userInfo.profile_image,
              stackoverflow_id: userId.toString(),
              summary: createSOSummary(userInfo, answerer, userTags),
              skills: enhanceSkillsFromTags(userTags, techTags),
              experience_years: estimatedExperience,
              last_active: new Date(userInfo.last_access_date * 1000).toISOString(),
              overall_score: Math.round((reputationScore + activityScore + skillMatchScore) / 3),
              skill_match: skillMatchScore,
              experience: Math.min(estimatedExperience * 6 + Math.log10(userInfo.reputation || 1) * 5, 90),
              reputation: Math.min(reputationScore, 100),
              freshness: calculateSOFreshness(userInfo.last_access_date),
              social_proof: Math.min((userInfo.up_vote_count || 0) / 20, 100),
              risk_flags: calculateSORiskFlags(userInfo)
            }

            candidates.push(candidate)

            // Save source data
            await supabase
              .from('candidate_sources')
              .upsert({
                candidate_id: userId.toString(),
                platform: 'stackoverflow',
                platform_id: userId.toString(),
                url: userInfo.link,
                data: { ...userInfo, top_tags: userTags, answerer_stats: answerer }
              }, { onConflict: 'platform,platform_id' })

          } catch (error) {
            console.error(`Error processing SO user ${userId}:`, error)
            continue
          }
        }

      } catch (error) {
        console.error(`Error searching SO tag ${tag}:`, error)
        continue
      }
    }

    // Sort by overall score and limit
    const sortedCandidates = candidates
      .sort((a, b) => b.overall_score - a.overall_score)
      .slice(0, 20)

    console.log(`Collected ${sortedCandidates.length} candidates from Stack Overflow`)

    return new Response(
      JSON.stringify({ 
        candidates: sortedCandidates,
        total: sortedCandidates.length,
        source: 'stackoverflow'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error collecting Stack Overflow data:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to collect Stack Overflow data' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function isQualityContributor(userInfo, answerer, userTags) {
  // Must have decent reputation
  if ((userInfo.reputation || 0) < 100) return false
  
  // Must have some answer activity
  if ((answerer.answer_count || 0) < 2) return false
  
  // Must have recent activity (within 2 years)
  const lastActive = new Date(userInfo.last_access_date * 1000)
  const twoYearsAgo = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000)
  if (lastActive < twoYearsAgo) return false
  
  // Should have some tags (expertise areas)
  if (userTags.length === 0) return false
  
  return true
}

function calculateSOActivityScore(userInfo) {
  let score = 0
  
  // Recent activity bonus
  const lastActive = new Date(userInfo.last_access_date * 1000)
  const daysSinceActive = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
  
  if (daysSinceActive < 30) score += 40
  else if (daysSinceActive < 90) score += 30
  else if (daysSinceActive < 180) score += 20
  else if (daysSinceActive < 365) score += 10
  
  // Answer activity
  score += Math.min((userInfo.answer_count || 0), 30)
  
  // Question activity
  score += Math.min((userInfo.question_count || 0) * 2, 20)
  
  // Vote ratio
  if (userInfo.up_vote_count && userInfo.down_vote_count) {
    const ratio = userInfo.up_vote_count / (userInfo.down_vote_count + 1)
    score += Math.min(ratio * 5, 10)
  }
  
  return Math.min(score, 100)
}

function calculateSOSkillMatch(userTags, searchTags) {
  if (searchTags.length === 0) return 50
  
  const normalizedUserTags = userTags.map(tag => tag.toLowerCase().replace(/[.\s]/g, '-'))
  const normalizedSearchTags = searchTags.map(tag => tag.toLowerCase().replace(/[.\s]/g, '-'))
  
  const matches = normalizedSearchTags.filter(searchTag =>
    normalizedUserTags.some(userTag => 
      userTag.includes(searchTag) || searchTag.includes(userTag)
    )
  )
  
  return Math.min(matches.length * 25, 100)
}

function createSOTitle(userTags, answerer) {
  if (userTags.length === 0) return 'Stack Overflow Contributor'
  
  const primaryTag = userTags[0]
  const answerCount = answerer.answer_count || 0
  
  if (answerCount > 50) {
    return `Senior ${primaryTag} Developer`
  } else if (answerCount > 20) {
    return `${primaryTag} Developer`
  } else {
    return `${primaryTag} Contributor`
  }
}

function createSOSummary(userInfo, answerer, userTags) {
  const parts = []
  
  parts.push(`Stack Overflow contributor with ${userInfo.reputation || 0} reputation`)
  
  if (answerer.answer_count > 0) {
    parts.push(`${answerer.answer_count} answers`)
  }
  
  if (userTags.length > 0) {
    parts.push(`Expert in: ${userTags.slice(0, 5).join(', ')}`)
  }
  
  if (userInfo.accept_rate) {
    parts.push(`${userInfo.accept_rate}% accept rate`)
  }
  
  return parts.join('. ').substring(0, 300)
}

function enhanceSkillsFromTags(userTags, searchTags) {
  const skills = new Set()
  
  // Add user's top tags
  userTags.forEach(tag => {
    skills.add(tag.replace(/-/g, ' '))
  })
  
  // Add relevant search tags
  searchTags.forEach(tag => {
    skills.add(tag.replace(/-/g, ' '))
  })
  
  return Array.from(skills).slice(0, 8)
}

function cleanLocation(location) {
  if (!location) return null
  
  // Remove common noise from SO locations
  return location
    .replace(/\b(Earth|World|Planet|Universe)\b/gi, '')
    .replace(/[^\w\s,.-]/g, '')
    .trim()
    .substring(0, 50) || null
}

function calculateSOFreshness(lastAccessTimestamp) {
  const daysSinceAccess = (Date.now() - lastAccessTimestamp * 1000) / (1000 * 60 * 60 * 24)
  
  if (daysSinceAccess < 7) return 100
  if (daysSinceAccess < 30) return 80
  if (daysSinceAccess < 90) return 60
  if (daysSinceAccess < 180) return 40
  if (daysSinceAccess < 365) return 20
  return 10
}

function calculateSORiskFlags(userInfo) {
  const flags = []
  
  if (!userInfo.location) flags.push('No location specified')
  if ((userInfo.reputation || 0) < 500) flags.push('Low reputation')
  if ((userInfo.answer_count || 0) < 5) flags.push('Few answers')
  
  const daysSinceAccess = (Date.now() - userInfo.last_access_date * 1000) / (1000 * 60 * 60 * 24)
  if (daysSinceAccess > 180) flags.push('Inactive user')
  
  return flags
}
