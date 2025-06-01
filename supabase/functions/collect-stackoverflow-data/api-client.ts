
const STACKOVERFLOW_API_KEY = Deno.env.get('STACKOVERFLOW_API_KEY')

export interface StackOverflowUser {
  user_id: number
  display_name: string
  reputation: number
  profile_image?: string
  location?: string
  website_url?: string
  link: string
  last_access_date: number
  answer_count: number
  question_count: number
  up_vote_count: number
  down_vote_count: number
  creation_date: number
}

export interface StackOverflowAnswer {
  answer_id: number
  question_id: number
  score: number
  is_accepted: boolean
  creation_date: number
  title?: string
  tags?: string[]
}

export interface StackOverflowQuestion {
  question_id: number
  title: string
  score: number
  view_count: number
  answer_count: number
  tags: string[]
  creation_date: number
}

export async function searchStackOverflowUsers(tag: string) {
  try {
    const response = await fetch(
      `https://api.stackexchange.com/2.3/tags/${encodeURIComponent(tag)}/top-answerers/all_time?site=stackoverflow&pagesize=30${STACKOVERFLOW_API_KEY ? `&key=${STACKOVERFLOW_API_KEY}` : ''}`
    )

    if (!response.ok) {
      console.log(`Stack Overflow API error for tag ${tag}:`, response.status)
      return null
    }

    const data = await response.json()
    
    if (!data.items) {
      return { users: [], hasMore: false, quotaRemaining: data.quota_remaining || 0 }
    }

    return {
      users: data.items.map((item: any) => ({
        user_id: item.user.user_id,
        display_name: item.user.display_name,
        reputation: item.user.reputation || 0,
        profile_image: item.user.profile_image,
        location: item.user.location,
        website_url: item.user.website_url,
        link: item.user.link,
        last_access_date: item.user.last_access_date || Date.now() / 1000,
        answer_count: item.user.answer_count || 0,
        question_count: item.user.question_count || 0,
        up_vote_count: item.user.up_vote_count || 0,
        down_vote_count: item.user.down_vote_count || 0,
        creation_date: item.user.creation_date || Date.now() / 1000
      })),
      hasMore: data.has_more || false,
      quotaRemaining: data.quota_remaining || 0
    }
  } catch (error) {
    console.error(`Error searching Stack Overflow users for tag ${tag}:`, error)
    return null
  }
}

export async function getUserProfile(userId: number): Promise<StackOverflowUser | null> {
  try {
    const response = await fetch(
      `https://api.stackexchange.com/2.3/users/${userId}?site=stackoverflow&filter=!*MxJLn4C3Kt3tQV${STACKOVERFLOW_API_KEY ? `&key=${STACKOVERFLOW_API_KEY}` : ''}`
    )

    if (!response.ok) {
      console.log(`Failed to get user profile for ${userId}`)
      return null
    }

    const data = await response.json()
    const user = data.items?.[0]
    
    if (!user) return null

    return {
      user_id: user.user_id,
      display_name: user.display_name,
      reputation: user.reputation || 0,
      profile_image: user.profile_image,
      location: user.location,
      website_url: user.website_url,
      link: user.link,
      last_access_date: user.last_access_date || Date.now() / 1000,
      answer_count: user.answer_count || 0,
      question_count: user.question_count || 0,
      up_vote_count: user.up_vote_count || 0,
      down_vote_count: user.down_vote_count || 0,
      creation_date: user.creation_date || Date.now() / 1000
    }
  } catch (error) {
    console.error(`Error getting user profile for ${userId}:`, error)
    return null
  }
}

export async function getUserAnswers(userId: number): Promise<StackOverflowAnswer[]> {
  try {
    const response = await fetch(
      `https://api.stackexchange.com/2.3/users/${userId}/answers?site=stackoverflow&pagesize=20&sort=votes&order=desc${STACKOVERFLOW_API_KEY ? `&key=${STACKOVERFLOW_API_KEY}` : ''}`
    )

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    return (data.items || []).map((answer: any) => ({
      answer_id: answer.answer_id,
      question_id: answer.question_id,
      score: answer.score || 0,
      is_accepted: answer.is_accepted || false,
      creation_date: answer.creation_date || Date.now() / 1000,
      title: answer.title,
      tags: answer.tags || []
    }))
  } catch (error) {
    console.error(`Error getting user answers for ${userId}:`, error)
    return []
  }
}

export async function getUserQuestions(userId: number): Promise<StackOverflowQuestion[]> {
  try {
    const response = await fetch(
      `https://api.stackexchange.com/2.3/users/${userId}/questions?site=stackoverflow&pagesize=10&sort=votes&order=desc${STACKOVERFLOW_API_KEY ? `&key=${STACKOVERFLOW_API_KEY}` : ''}`
    )

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    return (data.items || []).map((question: any) => ({
      question_id: question.question_id,
      title: question.title || '',
      score: question.score || 0,
      view_count: question.view_count || 0,
      answer_count: question.answer_count || 0,
      tags: question.tags || [],
      creation_date: question.creation_date || Date.now() / 1000
    }))
  } catch (error) {
    console.error(`Error getting user questions for ${userId}:`, error)
    return []
  }
}

export async function getTagInfo(tag: string) {
  try {
    const response = await fetch(
      `https://api.stackexchange.com/2.3/tags/${encodeURIComponent(tag)}/info?site=stackoverflow${STACKOVERFLOW_API_KEY ? `&key=${STACKOVERFLOW_API_KEY}` : ''}`
    )

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data.items?.[0] || null
  } catch (error) {
    console.error(`Error getting tag info for ${tag}:`, error)
    return null
  }
}
