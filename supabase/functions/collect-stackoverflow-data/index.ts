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

    const stackOverflowKey = Deno.env.get('STACKOVERFLOW_API_KEY') || ''

    // Enhanced tag mapping and prioritization
    const skills = enhancedQuery?.skills || []
    const keywords = enhancedQuery?.keywords || []
    
    const enhancedTagMapping = {
      'javascript': 'javascript',
      'js': 'javascript',
      'python': 'python',
      'java': 'java',
      'c++': 'c++',
      'c#': 'c#',
      'typescript': 'typescript',
      'react': 'reactjs',
      'reactjs': 'reactjs',
      'angular': 'angular',
      'vue': 'vue.js',
      'vuejs': 'vue.js',
      'node.js': 'node.js',
      'nodejs': 'node.js',
      'machine learning': 'machine-learning',
      'machine-learning': 'machine-learning',
      'ml': 'machine-learning',
      'ai': 'artificial-intelligence',
      'django': 'django',
      'flask': 'flask',
      'spring': 'spring',
      'spring boot': 'spring-boot',
      'aws': 'amazon-web-services',
      'docker': 'docker',
      'kubernetes': 'kubernetes',
      'tensorflow': 'tensorflow',
      'pytorch': 'pytorch',
      'data science': 'data-science',
      'backend': 'backend',
      'frontend': 'frontend',
      'api': 'api',
      'rest': 'rest',
      'graphql': 'graphql'
    }

    const searchTerms = [...skills, ...keywords].map(term => term.toLowerCase())
    const prioritizedTags = []
    
    // Priority 1: Direct skill matches
    searchTerms.forEach(term => {
      if (enhancedTagMapping[term]) {
        prioritizedTags.push(enhancedTagMapping[term])
      } else if (term.length > 2) {
        prioritizedTags.push(term.replace(/\s+/g, '-'))
      }
    })

    // Priority 2: Technology combinations
    const techCombinations = [
      ['python', 'django'], ['python', 'flask'], ['javascript', 'react'],
      ['javascript', 'node.js'], ['java', 'spring'], ['typescript', 'angular']
    ]
    
    techCombinations.forEach(combo => {
      if (combo.every(tech => searchTerms.includes(tech))) {
        prioritizedTags.push(...combo.map(tech => enhancedTagMapping[tech] || tech))
      }
    })

    // Fallback tags for broad searches
    if (prioritizedTags.length === 0) {
      prioritizedTags.push('javascript', 'python', 'java', 'backend', 'frontend')
    }

    // Remove duplicates and limit
    const uniqueTags = [...new Set(prioritizedTags)].slice(0, 6)
    console.log('Enhanced SO tags search strategy:', uniqueTags)

    const candidates = []
    const seenUsers = new Set()

    // Enhanced search strategy focusing on top-answerers
    for (const tag of uniqueTags) {
      try {
        // Step 1: Verify tag exists (with enhanced error handling)
        const tagCheckResponse = await fetch(
          `https://api.stackexchange.com/2.3/tags/${encodeURIComponent(tag)}/info?site=stackoverflow${stackOverflowKey ? `&key=${stackOverflowKey}` : ''}`
        )

        if (!tagCheckResponse.ok) {
          console.log(`Tag ${tag} verification failed:`, tagCheckResponse.status)
          continue
        }

        const tagData = await tagCheckResponse.json()
        if (!tagData.items || tagData.items.length === 0) {
          console.log(`Tag ${tag} does not exist, trying alternative`)
          
          // Try alternative tag formats
          const alternatives = [
            tag.replace('-', ''),
            tag.replace('-', '.'),
            tag.split('-')[0]
          ]
          
          let foundAlternative = false
          for (const alt of alternatives) {
            const altResponse = await fetch(
              `https://api.stackexchange.com/2.3/tags/${encodeURIComponent(alt)}/info?site=stackoverflow${stackOverflowKey ? `&key=${stackOverflowKey}` : ''}`
            )
            if (altResponse.ok) {
              const altData = await altResponse.json()
              if (altData.items && altData.items.length > 0) {
                console.log(`Using alternative tag: ${alt} for ${tag}`)
                foundAlternative = true
                break
              }
            }
          }
          
          if (!foundAlternative) continue
        }

        // Step 2: Get top answerers (multiple time periods for better coverage)
        const timeFrames = ['all_time', 'month']
        
        for (const timeFrame of timeFrames) {
          const topAnswerersResponse = await fetch(
            `https://api.stackexchange.com/2.3/tags/${encodeURIComponent(tag)}/top-answerers/${timeFrame}?site=stackoverflow&pagesize=30${stackOverflowKey ? `&key=${stackOverflowKey}` : ''}`
          )

          if (!topAnswerersResponse.ok) {
            console.log(`Stack Overflow API error for tag ${tag} (${timeFrame}):`, topAnswerersResponse.status)
            continue
          }

          const topAnswerersData = await topAnswerersResponse.json()
          
          if (topAnswerersData.quota_remaining && topAnswerersData.quota_remaining < 15) {
            console.log('Stack Overflow quota getting low, conserving requests')
            break
          }

          const topAnswerers = topAnswerersData.items || []
          console.log(`Found ${topAnswerers.length} top answerers for tag ${tag} (${timeFrame})`)

          // Process top answerers with enhanced filtering
          for (const answerer of topAnswerers.slice(0, 12)) {
            const userId = answerer.user?.user_id
            if (!userId || seenUsers.has(userId)) continue
            seenUsers.add(userId)

            try {
              // Enhanced user detail fetching
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

              // Get user's top tags for comprehensive skill analysis
              const tagsResponse = await fetch(
                `https://api.stackexchange.com/2.3/users/${userId}/top-tags?site=stackoverflow&pagesize=15${stackOverflowKey ? `&key=${stackOverflowKey}` : ''}`
              )

              let userTags = []
              if (tagsResponse.ok) {
                const tagsData = await tagsResponse.json()
                userTags = (tagsData.items || []).map(item => ({
                  name: item.tag_name,
                  score: item.answer_score,
                  count: item.answer_count
                }))
              }

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

// Enhanced quality contributor validation
function isEnhancedQualityContributor(userInfo, answerer, userTags, searchTag) {
  // Enhanced reputation threshold
  if ((userInfo.reputation || 0) < 300) return false
  
  // Must have substantial answer activity
  if ((answerer.answer_count || 0) < 3) return false
  
  // Enhanced recent activity check (within 18 months)
  const lastActive = new Date(userInfo.last_access_date * 1000)
  const eighteenMonthsAgo = new Date(Date.now() - 18 * 30 * 24 * 60 * 60 * 1000)
  if (lastActive < eighteenMonthsAgo) return false
  
  // Must have expertise in relevant tags
  if (userTags.length === 0) return false
  
  // Enhanced tag relevance check
  const hasRelevantExpertise = userTags.some(tag => 
    tag.name === searchTag || 
    tag.score > 10 || 
    tag.count > 5
  )
  if (!hasRelevantExpertise) return false
  
  return true
}

// Calculate expertise score based on tag performance
function calculateExpertiseScore(userInfo, answerer, userTags, searchTag) {
  let score = 0
  
  // Base reputation component (weighted)
  score += Math.min((userInfo.reputation || 0) / 100, 35)
  
  // Answer quality and quantity
  score += Math.min((answerer.answer_count || 0) * 3, 25)
  score += Math.min((answerer.answer_score || 0) / 10, 20)
  
  // Tag-specific expertise
  const relevantTag = userTags.find(tag => tag.name === searchTag)
  if (relevantTag) {
    score += Math.min(relevantTag.score / 5, 15)
    score += Math.min(relevantTag.count * 2, 10)
  }
  
  // Top tags performance
  const topTagsBonus = userTags.slice(0, 3).reduce((sum, tag) => 
    sum + Math.min(tag.score / 20, 5), 0
  )
  score += topTagsBonus
  
  return Math.min(score, 100)
}

// Enhanced reputation scoring
function calculateEnhancedReputationScore(userInfo) {
  const reputation = userInfo.reputation || 0
  
  // Progressive scoring with diminishing returns
  if (reputation >= 10000) return 100
  if (reputation >= 5000) return 85
  if (reputation >= 2000) return 70
  if (reputation >= 1000) return 55
  if (reputation >= 500) return 40
  
  return Math.min(reputation / 20, 35)
}

// Enhanced activity scoring
function calculateEnhancedSOActivityScore(userInfo, answerer) {
  let score = 0
  
  // Recent activity (enhanced weight)
  const lastActive = new Date(userInfo.last_access_date * 1000)
  const daysSinceActive = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
  
  if (daysSinceActive < 7) score += 40
  else if (daysSinceActive < 30) score += 35
  else if (daysSinceActive < 90) score += 25
  else if (daysSinceActive < 180) score += 15
  else if (daysSinceActive < 365) score += 10
  
  // Answer activity
  score += Math.min((answerer.answer_count || 0) * 2, 25)
  
  // Question activity (shows engagement)
  score += Math.min((userInfo.question_count || 0) * 3, 15)
  
  // Vote participation (community engagement)
  const upVotes = userInfo.up_vote_count || 0
  const downVotes = userInfo.down_vote_count || 0
  if (upVotes > 0) {
    const voteRatio = upVotes / (downVotes + 1)
    score += Math.min(voteRatio * 3, 12)
  }
  
  // Acceptance rate bonus
  if (userInfo.accept_rate && userInfo.accept_rate > 80) {
    score += 8
  }
  
  return Math.min(score, 100)
}

// Enhanced skill matching with semantic understanding
function calculateEnhancedSOSkillMatch(userTags, searchTags, enhancedQuery) {
  if (searchTags.length === 0) return 50
  
  const userTagNames = userTags.map(tag => tag.name.toLowerCase())
  const normalizedSearchTags = searchTags.map(tag => tag.toLowerCase().replace(/[.\s]/g, '-'))
  
  // Direct matches (highest weight)
  const directMatches = normalizedSearchTags.filter(searchTag =>
    userTagNames.some(userTag => 
      userTag.includes(searchTag) || searchTag.includes(userTag)
    )
  )
  
  // Semantic matches
  const semanticMatches = getSemanticTagMatches(userTagNames, normalizedSearchTags)
  
  // Experience level matches
  const experienceMatches = getExperienceLevelMatches(userTags, enhancedQuery)
  
  const totalScore = (directMatches.length * 25) + (semanticMatches * 15) + (experienceMatches * 10)
  return Math.min(totalScore, 100)
}

// Semantic tag matching
function getSemanticTagMatches(userTags, searchTags) {
  const semanticRelations = {
    'javascript': ['node.js', 'reactjs', 'angular', 'vue.js', 'frontend'],
    'python': ['django', 'flask', 'machine-learning', 'data-science'],
    'java': ['spring', 'spring-boot', 'android', 'backend'],
    'backend': ['api', 'rest', 'graphql', 'microservices'],
    'frontend': ['html', 'css', 'ui', 'ux', 'responsive-design'],
    'machine-learning': ['tensorflow', 'pytorch', 'data-science', 'ai']
  }
  
  let matches = 0
  searchTags.forEach(searchTag => {
    const relatedTags = semanticRelations[searchTag] || []
    if (relatedTags.some(related => userTags.includes(related))) {
      matches++
    }
  })
  
  return matches
}

// Experience level matching
function getExperienceLevelMatches(userTags, enhancedQuery) {
  if (!enhancedQuery?.experience_level) return 0
  
  const experienceLevel = enhancedQuery.experience_level.toLowerCase()
  const totalScore = userTags.reduce((sum, tag) => sum + (tag.score || 0), 0)
  
  if (experienceLevel === 'senior' || experienceLevel === 'lead') {
    return totalScore > 100 ? 10 : 5
  } else if (experienceLevel === 'mid') {
    return totalScore > 50 ? 10 : 5
  } else {
    return totalScore > 20 ? 10 : 5
  }
}

// Enhanced title creation
function createEnhancedSOTitle(userTags, answerer, expertiseScore) {
  if (userTags.length === 0) return 'Stack Overflow Contributor'
  
  const primaryTag = userTags[0]
  const answerCount = answerer.answer_count || 0
  const score = primaryTag.score || 0
  
  let level = 'Contributor'
  if (expertiseScore > 80 || score > 50) {
    level = 'Expert'
  } else if (expertiseScore > 60 || answerCount > 25) {
    level = 'Senior'
  } else if (answerCount > 10) {
    level = 'Experienced'
  }
  
  const technology = primaryTag.name.replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
  
  return `${level} ${technology} Developer`
}

// Enhanced summary creation
function createEnhancedSOSummary(userInfo, answerer, userTags, expertiseScore) {
  const parts = []
  
  const level = expertiseScore > 70 ? 'Expert' : 'Active'
  parts.push(`${level} Stack Overflow contributor with ${userInfo.reputation || 0} reputation`)
  
  if (answerer.answer_count > 0) {
    parts.push(`${answerer.answer_count} quality answers`)
  }
  
  if (answerer.answer_score > 10) {
    parts.push(`${answerer.answer_score} answer score`)
  }
  
  if (userTags.length > 0) {
    const topSkills = userTags.slice(0, 4).map(tag => tag.name).join(', ')
    parts.push(`Specialized in: ${topSkills}`)
  }
  
  if (userInfo.accept_rate) {
    parts.push(`${userInfo.accept_rate}% accept rate`)
  }
  
  const yearsActive = Math.floor((Date.now() - userInfo.creation_date * 1000) / (365 * 24 * 60 * 60 * 1000))
  if (yearsActive > 1) {
    parts.push(`${yearsActive} years on Stack Overflow`)
  }
  
  return parts.join('. ').substring(0, 350)
}

// Enhanced skills from tags
function enhanceSkillsFromTags(userTags, searchTags) {
  const skills = new Set()
  
  // Add user's top tags with score weighting
  userTags
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 8)
    .forEach(tag => {
      skills.add(tag.name.replace(/-/g, ' '))
    })
  
  // Add relevant search tags
  searchTags.forEach(tag => {
    skills.add(tag.replace(/-/g, ' '))
  })
  
  return Array.from(skills).slice(0, 10)
}

// Calculate answer quality score
function calculateAnswerQualityScore(answerer, userInfo) {
  const answerCount = answerer.answer_count || 0
  const answerScore = answerer.answer_score || 0
  const reputation = userInfo.reputation || 0
  
  if (answerCount === 0) return 0
  
  const avgScorePerAnswer = answerScore / answerCount
  const reputationFactor = Math.min(reputation / 1000, 5)
  
  return Math.min(avgScorePerAnswer * 10 + reputationFactor, 100)
}

// Generate username variations for cross-platform search
function generateUsernameVariations(displayName) {
  if (!displayName) return []
  
  const variations = []
  const cleaned = displayName.replace(/[^a-zA-Z0-9\s]/g, '').toLowerCase()
  
  // Add original
  variations.push(displayName)
  
  // Add cleaned version
  if (cleaned !== displayName.toLowerCase()) {
    variations.push(cleaned)
  }
  
  // Add without spaces
  variations.push(cleaned.replace(/\s+/g, ''))
  
  // Add with dots
  variations.push(cleaned.replace(/\s+/g, '.'))
  
  // Add with underscores
  variations.push(cleaned.replace(/\s+/g, '_'))
  
  // Add with dashes
  variations.push(cleaned.replace(/\s+/g, '-'))
  
  return [...new Set(variations)].filter(v => v.length > 2)
}

// Enhanced risk flags calculation
function calculateEnhancedSORiskFlags(userInfo, userTags) {
  const flags = []
  
  if (!userInfo.location) flags.push('No location specified')
  if ((userInfo.reputation || 0) < 500) flags.push('Moderate reputation')
  if ((userInfo.answer_count || 0) < 5) flags.push('Limited answers')
  
  const daysSinceAccess = (Date.now() - userInfo.last_access_date * 1000) / (1000 * 60 * 60 * 24)
  if (daysSinceAccess > 180) flags.push('Less active recently')
  
  if (userTags.length < 2) flags.push('Limited expertise areas')
  
  const totalTagScore = userTags.reduce((sum, tag) => sum + (tag.score || 0), 0)
  if (totalTagScore < 20) flags.push('Developing expertise')
  
  return flags
}

// ... keep existing code (cleanLocation, calculateSOFreshness functions)
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
