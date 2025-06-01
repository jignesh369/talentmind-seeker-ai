
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

    // Extract data science related skills
    const skills = enhancedQuery?.skills || []
    const keywords = enhancedQuery?.keywords || []
    const searchTerms = [...skills, ...keywords].filter(Boolean)

    const candidates = []
    const seenProfiles = new Set()

    // Search for active Kaggle users
    try {
      console.log('Searching Kaggle for data science talent...')

      // Search Kaggle competitions for active participants
      const competitionResponse = await fetch('https://www.kaggle.com/api/v1/competitions/list?sortBy=latestDeadline&category=all')
      
      if (competitionResponse.ok) {
        const competitions = await competitionResponse.json()
        
        for (const competition of competitions.slice(0, 5)) {
          try {
            // Get competition leaderboard
            const leaderboardResponse = await fetch(`https://www.kaggle.com/api/v1/competitions/${competition.ref}/leaderboard`)
            
            if (leaderboardResponse.ok) {
              const leaderboard = await leaderboardResponse.json()
              
              for (const entry of leaderboard.slice(0, 20)) {
                if (seenProfiles.has(entry.teamName)) continue
                seenProfiles.add(entry.teamName)

                // Get user profile
                try {
                  const userResponse = await fetch(`https://www.kaggle.com/api/v1/users/${entry.teamName}`)
                  
                  if (userResponse.ok) {
                    const userProfile = await userResponse.json()
                    
                    // Extract skills from Kaggle profile
                    const extractedSkills = extractSkillsFromKaggleProfile(userProfile, searchTerms)
                    
                    if (extractedSkills.length === 0) continue

                    const candidate = {
                      name: userProfile.displayName || entry.teamName,
                      title: determineKaggleTitle(userProfile),
                      summary: userProfile.bio || 'Kaggle Data Science Competitor',
                      location: userProfile.location || location || '',
                      skills: extractedSkills,
                      experience_years: estimateKaggleExperience(userProfile),
                      last_active: userProfile.lastLogin || new Date().toISOString(),
                      overall_score: calculateKaggleScore(userProfile, entry),
                      skill_match: calculateSkillMatch(extractedSkills, searchTerms),
                      experience: calculateExperienceScore(userProfile),
                      reputation: Math.min(userProfile.tier === 'GRANDMASTER' ? 95 : userProfile.tier === 'MASTER' ? 85 : 70, 100),
                      freshness: calculateFreshnessScore(userProfile.lastLogin),
                      social_proof: Math.min((userProfile.followersCount || 0) / 10, 80),
                      risk_flags: [],
                      kaggle_username: entry.teamName,
                      kaggle_tier: userProfile.tier,
                      kaggle_ranking: entry.score
                    }

                    candidates.push(candidate)

                    // Save source data
                    await supabase
                      .from('candidate_sources')
                      .upsert({
                        candidate_id: entry.teamName,
                        platform: 'kaggle',
                        platform_id: entry.teamName,
                        url: `https://www.kaggle.com/${entry.teamName}`,
                        data: { profile: userProfile, competition: competition.ref, ranking: entry }
                      }, { onConflict: 'platform,platform_id' })
                  }
                } catch (userError) {
                  console.error(`Error fetching Kaggle user ${entry.teamName}:`, userError)
                }
              }
            }
          } catch (competitionError) {
            console.error(`Error processing competition ${competition.ref}:`, competitionError)
          }
        }
      }

      // Also search Kaggle datasets for active contributors
      const datasetsResponse = await fetch('https://www.kaggle.com/api/v1/datasets/list?sortBy=hottest&maxSize=100000')
      
      if (datasetsResponse.ok) {
        const datasets = await datasetsResponse.json()
        
        for (const dataset of datasets.slice(0, 10)) {
          try {
            if (seenProfiles.has(dataset.ownerName)) continue
            seenProfiles.add(dataset.ownerName)

            const userResponse = await fetch(`https://www.kaggle.com/api/v1/users/${dataset.ownerName}`)
            
            if (userResponse.ok) {
              const userProfile = await userResponse.json()
              const extractedSkills = extractSkillsFromKaggleProfile(userProfile, searchTerms)
              
              if (extractedSkills.length === 0) continue

              const candidate = {
                name: userProfile.displayName || dataset.ownerName,
                title: determineKaggleTitle(userProfile),
                summary: userProfile.bio || 'Kaggle Dataset Contributor',
                location: userProfile.location || location || '',
                skills: extractedSkills,
                experience_years: estimateKaggleExperience(userProfile),
                last_active: userProfile.lastLogin || new Date().toISOString(),
                overall_score: calculateKaggleScore(userProfile, { score: dataset.voteCount }),
                skill_match: calculateSkillMatch(extractedSkills, searchTerms),
                experience: calculateExperienceScore(userProfile),
                reputation: Math.min(userProfile.tier === 'GRANDMASTER' ? 95 : userProfile.tier === 'MASTER' ? 85 : 70, 100),
                freshness: calculateFreshnessScore(userProfile.lastLogin),
                social_proof: Math.min((userProfile.followersCount || 0) / 10, 80),
                risk_flags: [],
                kaggle_username: dataset.ownerName,
                kaggle_tier: userProfile.tier
              }

              candidates.push(candidate)

              await supabase
                .from('candidate_sources')
                .upsert({
                  candidate_id: dataset.ownerName,
                  platform: 'kaggle',
                  platform_id: dataset.ownerName,
                  url: `https://www.kaggle.com/${dataset.ownerName}`,
                  data: { profile: userProfile, dataset: dataset }
                }, { onConflict: 'platform,platform_id' })
            }
          } catch (datasetError) {
            console.error(`Error processing dataset contributor:`, datasetError)
          }
        }
      }

    } catch (error) {
      console.error('Error collecting Kaggle data:', error)
    }

    console.log(`Collected ${candidates.length} Kaggle candidates`)

    return new Response(
      JSON.stringify({ 
        candidates,
        total: candidates.length,
        source: 'kaggle'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error collecting Kaggle data:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to collect Kaggle data' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function extractSkillsFromKaggleProfile(profile, searchTerms) {
  const skills = []
  const bio = (profile.bio || '').toLowerCase()
  
  const dataSkills = [
    'python', 'r', 'sql', 'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'scikit-learn',
    'pandas', 'numpy', 'matplotlib', 'seaborn', 'plotly', 'jupyter', 'data science', 'statistics',
    'neural networks', 'nlp', 'computer vision', 'xgboost', 'lightgbm', 'catboost', 'keras',
    'data analysis', 'data visualization', 'feature engineering', 'model deployment'
  ]

  for (const skill of dataSkills) {
    if (bio.includes(skill)) {
      skills.push(skill)
    }
  }

  // Add relevant search terms
  for (const term of searchTerms) {
    if (bio.includes(term.toLowerCase()) && !skills.includes(term)) {
      skills.push(term)
    }
  }

  return skills.slice(0, 8)
}

function determineKaggleTitle(profile) {
  const tier = profile.tier || 'NOVICE'
  
  switch (tier) {
    case 'GRANDMASTER': return 'Kaggle Grandmaster - Data Science Expert'
    case 'MASTER': return 'Kaggle Master - Senior Data Scientist'
    case 'EXPERT': return 'Kaggle Expert - Data Scientist'
    case 'CONTRIBUTOR': return 'Data Science Contributor'
    default: return 'Data Science Enthusiast'
  }
}

function estimateKaggleExperience(profile) {
  const tier = profile.tier || 'NOVICE'
  const yearsOnKaggle = profile.performanceTier?.dateFirstRanked ? 
    Math.floor((Date.now() - new Date(profile.performanceTier.dateFirstRanked).getTime()) / (1000 * 60 * 60 * 24 * 365)) : 1

  const baseExperience = {
    'GRANDMASTER': 8,
    'MASTER': 6,
    'EXPERT': 4,
    'CONTRIBUTOR': 2,
    'NOVICE': 1
  }[tier] || 1

  return Math.min(baseExperience + yearsOnKaggle, 15)
}

function calculateKaggleScore(profile, competitionData) {
  let score = 30

  const tierBonus = {
    'GRANDMASTER': 40,
    'MASTER': 30,
    'EXPERT': 20,
    'CONTRIBUTOR': 10,
    'NOVICE': 5
  }[profile.tier || 'NOVICE'] || 5

  score += tierBonus
  score += Math.min((profile.followersCount || 0) / 50, 15)
  score += competitionData?.score ? Math.min(competitionData.score / 100, 15) : 0

  return Math.min(score, 100)
}

function calculateSkillMatch(extractedSkills, searchTerms) {
  const matches = searchTerms.filter(term => 
    extractedSkills.some(skill => 
      skill.toLowerCase().includes(term.toLowerCase()) || 
      term.toLowerCase().includes(skill.toLowerCase())
    )
  )
  
  return Math.min((matches.length / Math.max(searchTerms.length, 1)) * 100, 100)
}

function calculateExperienceScore(profile) {
  const years = estimateKaggleExperience(profile)
  return Math.min(years * 10, 90)
}

function calculateFreshnessScore(lastLogin) {
  if (!lastLogin) return 30
  
  const daysSinceLogin = Math.floor((Date.now() - new Date(lastLogin).getTime()) / (1000 * 60 * 60 * 24))
  
  if (daysSinceLogin <= 7) return 90
  if (daysSinceLogin <= 30) return 70
  if (daysSinceLogin <= 90) return 50
  return 30
}
