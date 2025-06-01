
export async function enrichWithApollo(candidate: any, apolloApiKey: string) {
  try {
    console.log(`🔍 Starting Apollo enrichment for ${candidate.name}`)
    
    const searchPayload = {
      q_person_name: candidate.name,
      page: 1,
      per_page: 1,
      person_titles: [candidate.title || ''].filter(Boolean),
      organization_locations: [candidate.location || ''].filter(Boolean)
    }
    
    console.log('Apollo search payload:', JSON.stringify(searchPayload, null, 2))

    const response = await fetch('https://api.apollo.io/v1/mixed_people/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': apolloApiKey
      },
      body: JSON.stringify(searchPayload)
    })

    if (!response.ok) {
      console.error(`Apollo API error: ${response.status} ${response.statusText}`)
      return candidate
    }

    const data = await response.json()
    console.log(`Apollo response for ${candidate.name}: ${data.people?.length || 0} results`)

    if (!data.people || data.people.length === 0) {
      console.log(`No Apollo results found for ${candidate.name}`)
      return candidate
    }

    const apolloData = data.people[0]
    const enrichedCandidate = { ...candidate }

    // Extract and validate email
    if (apolloData.email && isValidEmail(apolloData.email)) {
      console.log(`✅ Found Apollo email for ${candidate.name}: ${apolloData.email}`)
      enrichedCandidate.apollo_email = apolloData.email
      if (!enrichedCandidate.email) {
        enrichedCandidate.email = apolloData.email
      }
    }

    // Extract LinkedIn URL
    if (apolloData.linkedin_url) {
      console.log(`🔗 Found LinkedIn URL for ${candidate.name}: ${apolloData.linkedin_url}`)
      enrichedCandidate.linkedin_url = apolloData.linkedin_url
    }

    // Extract current company information
    if (apolloData.organization?.name) {
      console.log(`🏢 Found company for ${candidate.name}: ${apolloData.organization.name}`)
      enrichedCandidate.current_company = apolloData.organization.name
      
      // Add company size and industry if available
      if (apolloData.organization.num_employees) {
        enrichedCandidate.company_size = apolloData.organization.num_employees
      }
      if (apolloData.organization.industry) {
        enrichedCandidate.company_industry = apolloData.organization.industry
      }
    }

    // Extract phone number if available
    if (apolloData.phone) {
      enrichedCandidate.phone = apolloData.phone
    }

    // Add employment status insights
    if (apolloData.employment_history && apolloData.employment_history.length > 0) {
      const currentRole = apolloData.employment_history[0]
      if (currentRole.current) {
        enrichedCandidate.current_role = currentRole.title
        enrichedCandidate.employment_status = 'employed'
      }
    }

    // Calculate Apollo enrichment score
    let enrichmentScore = 0
    if (enrichedCandidate.apollo_email) enrichmentScore += 30
    if (enrichedCandidate.linkedin_url) enrichmentScore += 20
    if (enrichedCandidate.current_company) enrichmentScore += 25
    if (enrichedCandidate.phone) enrichmentScore += 15
    if (enrichedCandidate.current_role) enrichmentScore += 10

    enrichedCandidate.apollo_enrichment_score = enrichmentScore
    enrichedCandidate.apollo_enriched = true
    
    console.log(`✨ Successfully enriched ${candidate.name} with Apollo.io data (Score: ${enrichmentScore})`)
    return enrichedCandidate

  } catch (error) {
    console.error(`❌ Apollo enrichment failed for ${candidate.name}:`, error)
    return candidate
  }
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && !email.includes('noreply') && email !== 'email_not_unlocked@domain.com'
}

export async function discoverContactMethods(candidate: any): Promise<any> {
  const contactMethods = []
  
  // Check for email variations
  if (candidate.github_username) {
    const emailVariations = generateEmailVariations(candidate.name, candidate.github_username)
    contactMethods.push(...emailVariations.map(email => ({ type: 'email', value: email, confidence: 'medium' })))
  }
  
  // Social media discovery
  const socialProfiles = await discoverSocialProfiles(candidate)
  contactMethods.push(...socialProfiles)
  
  // Professional network discovery
  const professionalContacts = await discoverProfessionalContacts(candidate)
  contactMethods.push(...professionalContacts)
  
  return {
    ...candidate,
    contact_methods: contactMethods,
    contact_discovery_score: calculateContactScore(contactMethods)
  }
}

function generateEmailVariations(name: string, username: string): string[] {
  const variations = []
  const nameParts = name.toLowerCase().split(' ')
  const firstName = nameParts[0]
  const lastName = nameParts[nameParts.length - 1]
  
  const domains = ['gmail.com', 'outlook.com', 'yahoo.com', 'protonmail.com']
  
  domains.forEach(domain => {
    variations.push(`${firstName}@${domain}`)
    variations.push(`${firstName}.${lastName}@${domain}`)
    variations.push(`${firstName}${lastName}@${domain}`)
    variations.push(`${username}@${domain}`)
  })
  
  return variations
}

async function discoverSocialProfiles(candidate: any): Promise<any[]> {
  const profiles = []
  
  // Twitter/X discovery
  if (candidate.github_username) {
    profiles.push({
      type: 'twitter',
      value: `https://twitter.com/${candidate.github_username}`,
      confidence: 'low'
    })
  }
  
  // Dev.to profile
  profiles.push({
    type: 'devto',
    value: `https://dev.to/${candidate.github_username || candidate.name.toLowerCase().replace(' ', '')}`,
    confidence: 'medium'
  })
  
  return profiles
}

async function discoverProfessionalContacts(candidate: any): Promise<any[]> {
  const contacts = []
  
  // Company email inference
  if (candidate.current_company) {
    const companyDomain = inferCompanyDomain(candidate.current_company)
    if (companyDomain) {
      const nameParts = candidate.name.toLowerCase().split(' ')
      const firstName = nameParts[0]
      const lastName = nameParts[nameParts.length - 1]
      
      contacts.push({
        type: 'work_email',
        value: `${firstName}.${lastName}@${companyDomain}`,
        confidence: 'medium'
      })
    }
  }
  
  return contacts
}

function inferCompanyDomain(companyName: string): string | null {
  const domainMap = {
    'google': 'google.com',
    'microsoft': 'microsoft.com',
    'amazon': 'amazon.com',
    'meta': 'meta.com',
    'apple': 'apple.com',
    'netflix': 'netflix.com',
    'uber': 'uber.com',
    'airbnb': 'airbnb.com'
  }
  
  const normalizedName = companyName.toLowerCase()
  for (const [key, domain] of Object.entries(domainMap)) {
    if (normalizedName.includes(key)) {
      return domain
    }
  }
  
  return null
}

function calculateContactScore(contactMethods: any[]): number {
  let score = 0
  
  contactMethods.forEach(method => {
    switch (method.confidence) {
      case 'high': score += 30; break
      case 'medium': score += 20; break
      case 'low': score += 10; break
    }
  })
  
  return Math.min(score, 100)
}
