
export async function extractEmailFromReadmes(repositories: any[], githubToken: string): Promise<string | null> {
  for (const repo of repositories.slice(0, 5)) { // Check top 5 repos
    try {
      const readmeResponse = await fetch(
        `https://api.github.com/repos/${repo.full_name}/readme`,
        {
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'TalentMind-App'
          }
        }
      )

      if (readmeResponse.ok) {
        const readmeData = await readmeResponse.json()
        const content = atob(readmeData.content)
        
        // Extract email using regex
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
        const emails = content.match(emailRegex)
        
        if (emails && emails.length > 0) {
          // Filter out common non-personal emails
          const personalEmail = emails.find(email => 
            !email.includes('noreply') && 
            !email.includes('example') && 
            !email.includes('test') &&
            !email.includes('github.com')
          )
          
          if (personalEmail) {
            console.log(`Found email in README: ${personalEmail}`)
            return personalEmail
          }
        }
      }
    } catch (error) {
      console.log(`Error checking README for ${repo.full_name}:`, error.message)
    }
  }
  return null
}
