
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface StackOverflowUser {
  user_id: number
  display_name: string
  reputation: number
  badge_counts: {
    bronze: number
    silver: number
    gold: number
  }
  answer_count: number
  question_count: number
  last_access_date: number
  profile_image: string
  link: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { searchType, searchValue, candidateContext } = await req.json()

    if (!searchType || !searchValue) {
      return new Response(
        JSON.stringify({ error: 'searchType and searchValue are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`🔍 StackOverflow enrichment search: ${searchType} = "${searchValue}"`)

    let profile = null
    let confidence = 0

    switch (searchType) {
      case 'display_name':
        ({ profile, confidence } = await searchByDisplayName(searchValue))
        break
      case 'username':
        ({ profile, confidence } = await searchByUsername(searchValue, candidateContext))
        break
      default:
        throw new Error(`Unsupported search type: ${searchType}`)
    }

    if (profile && confidence > 50) {
      // Enhance with additional details
      const enhancedProfile = await getEnhancedProfile(profile.user_id)
      
      return new Response(
        JSON.stringify({
          profile: enhancedProfile || profile,
          confidence,
          searchType,
          matchFound: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        profile: null,
        confidence,
        searchType,
        matchFound: false,
        message: 'No high-confidence match found'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ StackOverflow enrichment error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'StackOverflow enrichment failed',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function searchByDisplayName(displayName: string): Promise<{ profile: StackOverflowUser | null, confidence: number }> {
  try {
    const searchUrl = `https://api.stackexchange.com/2.3/users?order=desc&sort=reputation&site=stackoverflow&inname=${encodeURIComponent(displayName)}&pagesize=10`
    
    const response = await fetch(searchUrl)
    if (!response.ok) {
      throw new Error(`StackOverflow API error: ${response.status}`)
    }
    
    const data = await response.json()
    const users = data.items || []

    if (users.length === 0) {
      return { profile: null, confidence: 0 }
    }

    // Find best match based on exact name match and reputation
    let bestMatch = null
    let highestConfidence = 0

    for (const user of users) {
      let confidence = calculateNameMatchConfidence(displayName, user.display_name)
      
      // Boost confidence for higher reputation users
      if (user.reputation > 1000) confidence += 10
      if (user.reputation > 5000) confidence += 10
      if (user.reputation > 10000) confidence += 10

      if (confidence > highestConfidence) {
        highestConfidence = confidence
        bestMatch = user
      }
    }

    return { profile: bestMatch, confidence: highestConfidence }

  } catch (error) {
    console.error('Error searching StackOverflow by display name:', error)
    return { profile: null, confidence: 0 }
  }
}

async function searchByUsername(username: string, candidateContext: any): Promise<{ profile: StackOverflowUser | null, confidence: number }> {
  // Try searching by username as display name first
  const nameResult = await searchByDisplayName(username)
  
  if (nameResult.profile && nameResult.confidence > 60) {
    return { 
      profile: nameResult.profile, 
      confidence: nameResult.confidence + 10 // Boost for username match
    }
  }

  // Try variations of the username
  const variations = [
    username.toLowerCase(),
    username.replace(/[_-]/g, ''),
    username.replace(/[_-]/g, ' '),
    candidateContext?.name?.split(' ')[0] // First name from full name
  ].filter(Boolean)

  for (const variation of variations) {
    const result = await searchByDisplayName(variation)
    if (result.profile && result.confidence > 50) {
      return { 
        profile: result.profile, 
        confidence: result.confidence - 5 // Slight penalty for variation
      }
    }
  }

  return { profile: null, confidence: 0 }
}

async function getEnhancedProfile(userId: number): Promise<StackOverflowUser | null> {
  try {
    const userUrl = `https://api.stackexchange.com/2.3/users/${userId}?order=desc&sort=reputation&site=stackoverflow&filter=!40nQnM6B5tZK2M_M`
    const tagsUrl = `https://api.stackexchange.com/2.3/users/${userId}/tags?order=desc&sort=popular&site=stackoverflow&pagesize=20`
    
    const [userResponse, tagsResponse] = await Promise.all([
      fetch(userUrl),
      fetch(tagsUrl)
    ])
    
    if (!userResponse.ok || !tagsResponse.ok) {
      return null
    }
    
    const userData = await userResponse.json()
    const tagsData = await tagsResponse.json()
    
    const user = userData.items?.[0]
    if (!user) return null
    
    return {
      ...user,
      tags: tagsData.items || []
    }
    
  } catch (error) {
    console.error(`Error fetching enhanced StackOverflow profile ${userId}:`, error)
    return null
  }
}

function calculateNameMatchConfidence(searchName: string, stackOverflowName: string): number {
  if (!searchName || !stackOverflowName) return 0

  const search = searchName.toLowerCase().trim()
  const stackoverflow = stackOverflowName.toLowerCase().trim()

  // Exact match
  if (search === stackoverflow) return 95

  // One contains the other
  if (search.includes(stackoverflow) || stackoverflow.includes(search)) return 80

  // Word-by-word comparison
  const searchWords = search.split(/\s+/)
  const stackoverflowWords = stackoverflow.split(/\s+/)
  
  let matchingWords = 0
  for (const searchWord of searchWords) {
    if (stackoverflowWords.some(soWord => 
      soWord.includes(searchWord) || searchWord.includes(soWord)
    )) {
      matchingWords++
    }
  }

  const wordMatchPercentage = (matchingWords / Math.max(searchWords.length, stackoverflowWords.length)) * 100
  return Math.round(wordMatchPercentage * 0.7) // Scale down for partial matches
}
