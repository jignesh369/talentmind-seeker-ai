
export interface StackOverflowUser {
  user_id: number
  display_name: string
  reputation: number
  user_type: string
  accept_rate?: number
  profile_image: string
  link: string
}

export interface StackOverflowUserDetails {
  user_id: number
  display_name: string
  reputation: number
  creation_date: number
  last_access_date: number
  location?: string
  website_url?: string
  link: string
  profile_image: string
  answer_count: number
  question_count: number
  up_vote_count: number
  down_vote_count: number
  badge_counts: {
    bronze: number
    silver: number
    gold: number
  }
  tags: Array<{
    name: string
    count: number
  }>
}

export async function searchStackOverflowUsers(query: string): Promise<StackOverflowUser[]> {
  try {
    const searchUrl = `https://api.stackexchange.com/2.3/users?order=desc&sort=reputation&site=stackoverflow&inname=${encodeURIComponent(query)}&pagesize=20`
    
    const response = await fetch(searchUrl)
    if (!response.ok) {
      throw new Error(`Stack Overflow API error: ${response.status}`)
    }
    
    const data = await response.json()
    return data.items || []
    
  } catch (error) {
    console.error('Error searching Stack Overflow users:', error)
    return []
  }
}

export async function getStackOverflowUserDetails(userId: number): Promise<StackOverflowUserDetails | null> {
  try {
    const userUrl = `https://api.stackexchange.com/2.3/users/${userId}?order=desc&sort=reputation&site=stackoverflow&filter=!40nQnM6B5tZK2M_M`
    const tagsUrl = `https://api.stackexchange.com/2.3/users/${userId}/tags?order=desc&sort=popular&site=stackoverflow&pagesize=20`
    
    const [userResponse, tagsResponse] = await Promise.all([
      fetch(userUrl),
      fetch(tagsUrl)
    ])
    
    if (!userResponse.ok || !tagsResponse.ok) {
      throw new Error('Failed to fetch user details')
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
    console.error(`Error fetching Stack Overflow user ${userId}:`, error)
    return null
  }
}
