
const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN')

export interface GitHubUser {
  login: string
  id: number
  avatar_url: string
  html_url: string
  type: string
  site_admin: boolean
  name?: string
  company?: string
  blog?: string
  location?: string
  email?: string
  hireable?: boolean
  bio?: string
  twitter_username?: string
  public_repos: number
  public_gists: number
  followers: number
  following: number
  created_at: string
  updated_at: string
}

export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  private: boolean
  html_url: string
  description?: string
  fork: boolean
  created_at: string
  updated_at: string
  pushed_at: string
  size: number
  stargazers_count: number
  watchers_count: number
  language?: string
  forks_count: number
  archived: boolean
  disabled: boolean
  open_issues_count: number
  license?: {
    key: string
    name: string
  }
  topics: string[]
  default_branch: string
}

export interface GitHubSearchResult {
  users: GitHubUser[]
  hasMore: boolean
  total_count: number
}

async function githubRequest(url: string): Promise<any> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Supabase-Function'
  }

  if (GITHUB_TOKEN) {
    headers['Authorization'] = `token ${GITHUB_TOKEN}`
  }

  const response = await fetch(url, { headers })

  if (!response.ok) {
    if (response.status === 403) {
      const resetTime = response.headers.get('X-RateLimit-Reset')
      console.log(`GitHub API rate limit exceeded. Reset time: ${resetTime}`)
      throw new Error('GitHub API rate limit exceeded')
    }
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

export async function searchGitHubUsers(query: string, sort: string = 'followers', page: number = 1): Promise<GitHubSearchResult> {
  try {
    const encodedQuery = encodeURIComponent(query)
    const url = `https://api.github.com/search/users?q=${encodedQuery}&sort=${sort}&order=desc&page=${page}&per_page=20`
    
    console.log(`🔍 Searching GitHub users: ${url}`)
    
    const data = await githubRequest(url)
    
    return {
      users: data.items || [],
      hasMore: data.items?.length === 20,
      total_count: data.total_count || 0
    }
  } catch (error) {
    console.error('Error searching GitHub users:', error)
    return { users: [], hasMore: false, total_count: 0 }
  }
}

export async function getGitHubUserProfile(username: string): Promise<GitHubUser | null> {
  try {
    const url = `https://api.github.com/users/${username}`
    console.log(`👤 Fetching GitHub profile: ${username}`)
    
    const data = await githubRequest(url)
    return data
  } catch (error) {
    console.error(`Error fetching GitHub profile for ${username}:`, error)
    return null
  }
}

export async function getGitHubUserRepos(username: string, page: number = 1): Promise<GitHubRepo[]> {
  try {
    const url = `https://api.github.com/users/${username}/repos?sort=updated&direction=desc&page=${page}&per_page=10`
    console.log(`📚 Fetching GitHub repos for: ${username}`)
    
    const data = await githubRequest(url)
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error(`Error fetching GitHub repos for ${username}:`, error)
    return []
  }
}
