
export async function searchGitHubUsers(searchQuery: string, githubToken: string) {
  const response = await fetch(
    `https://api.github.com/search/users?q=${encodeURIComponent(searchQuery)}&per_page=40&sort=repositories`,
    {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'TalentMind-App'
      }
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.error('GitHub API error:', response.status, errorText)
    
    if (response.status === 403) {
      console.log('Rate limit hit')
      return { rateLimitHit: true, users: [] }
    }
    return { rateLimitHit: false, users: [] }
  }

  const data = await response.json()
  return { rateLimitHit: false, users: data.items || [] }
}

export async function getUserDetails(userUrl: string, githubToken: string) {
  const userResponse = await fetch(userUrl, {
    headers: {
      'Authorization': `token ${githubToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'TalentMind-App'
    }
  })

  if (!userResponse.ok) {
    return null
  }

  return await userResponse.json()
}

export async function getUserRepositories(userUrl: string, githubToken: string) {
  const reposResponse = await fetch(`${userUrl}/repos?sort=updated&per_page=15`, {
    headers: {
      'Authorization': `token ${githubToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'TalentMind-App'
    }
  })

  if (!reposResponse.ok) {
    return []
  }

  return await reposResponse.json()
}
