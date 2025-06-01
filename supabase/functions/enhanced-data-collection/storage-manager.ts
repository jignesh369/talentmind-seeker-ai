
// Enhanced storage manager with comprehensive error handling and recovery mechanisms

export async function storeWithEnhancedDeduplication(candidates: any[], supabase: any, queryEmbedding: number[] | null, platform: string) {
  console.log(`=== STARTING ENHANCED STORAGE FOR ${platform.toUpperCase()} ===`)
  console.log(`Processing ${candidates.length} candidates from ${platform}`)
  
  if (!candidates || candidates.length === 0) {
    console.log('No candidates to store, skipping storage')
    return
  }

  try {
    let storedCount = 0
    let updatedCount = 0
    let errorCount = 0

    for (const candidate of candidates) {
      try {
        // Validate required fields
        if (!candidate.name || candidate.name.trim() === '') {
          console.log('Skipping candidate with missing name')
          errorCount++
          continue
        }

        // Enhanced multi-field duplicate detection with proper constraint handling
        const { data: existing, error: searchError } = await supabase
          .from('candidates')
          .select('id, name, github_username, email, overall_score, linkedin_url')
          .or(`name.ilike.%${candidate.name}%,github_username.eq.${candidate.github_username || 'null'},email.eq.${candidate.email || 'null'}`)

        if (searchError) {
          console.error('Error searching for existing candidates:', searchError)
          errorCount++
          continue
        }

        if (existing && existing.length > 0) {
          const existingCandidate = existing[0]
          const shouldUpdate = candidate.overall_score > (existingCandidate.overall_score || 0) + 5
          
          if (shouldUpdate) {
            console.log(`Updating existing candidate: ${candidate.name} with enhanced data from ${platform}`)
            
            // Enhanced update with proper email handling and validation
            const updateData = {
              ...sanitizeCandidateData(candidate),
              email: extractBestEmail(candidate) || existingCandidate.email,
              enhanced_by_platform: platform,
              last_enhanced: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
            
            const { error: updateError } = await supabase
              .from('candidates')
              .update(updateData)
              .eq('id', existingCandidate.id)
              
            if (updateError) {
              console.error('Error updating candidate:', updateError)
              errorCount++
            } else {
              console.log(`Successfully updated candidate: ${candidate.name} with email: ${updateData.email}`)
              updatedCount++
              // Store source information for existing candidate
              await storeCandidateSource(supabase, existingCandidate.id, platform, candidate)
            }
          } else {
            console.log(`Skipping update for ${candidate.name} - score not significantly higher`)
          }
          continue
        }

        // Insert new enhanced candidate with comprehensive validation
        const candidateData = sanitizeCandidateData({
          name: candidate.name || 'Unknown',
          title: candidate.title,
          location: candidate.location,
          avatar_url: candidate.avatar_url,
          email: extractBestEmail(candidate),
          github_username: candidate.github_username,
          stackoverflow_id: candidate.stackoverflow_id,
          linkedin_url: candidate.linkedin_url,
          reddit_username: candidate.reddit_username,
          summary: candidate.summary,
          skills: candidate.skills || [],
          experience_years: candidate.experience_years || 0,
          last_active: candidate.last_active,
          
          // Enhanced scoring data with validation
          overall_score: Math.max(0, Math.min(100, Math.round(candidate.overall_score || 0))),
          skill_match: Math.max(0, Math.min(100, Math.round(candidate.skill_match || 0))),
          experience: Math.max(0, Math.min(100, Math.round(candidate.experience || 0))),
          reputation: Math.max(0, Math.min(100, Math.round(candidate.reputation || 0))),
          freshness: Math.max(0, Math.min(100, Math.round(candidate.freshness || 0))),
          social_proof: Math.max(0, Math.min(100, Math.round(candidate.social_proof || 0))),
          risk_flags: candidate.risk_flags || []
        })

        console.log(`Inserting new candidate: ${candidateData.name} with email: ${candidateData.email} from ${platform}`)

        const { data: insertedCandidate, error: insertError } = await supabase
          .from('candidates')
          .insert(candidateData)
          .select('id')
          .single()

        if (insertError) {
          console.error('Error inserting candidate:', insertError)
          console.error('Candidate data that failed:', candidateData)
          errorCount++
        } else {
          console.log(`Successfully stored ${candidate.candidate_tier || 'untiered'} candidate: ${candidateData.name} from ${platform} (Score: ${candidate.overall_score})`)
          storedCount++
          
          // Store source information for new candidate
          if (insertedCandidate?.id) {
            await storeCandidateSource(supabase, insertedCandidate.id, platform, candidate)
          }
        }
      } catch (candidateError) {
        console.error(`Error processing individual candidate ${candidate.name}:`, candidateError)
        errorCount++
        continue
      }
    }

    console.log(`=== STORAGE COMPLETED FOR ${platform.toUpperCase()} ===`)
    console.log(`Results: ${storedCount} stored, ${updatedCount} updated, ${errorCount} errors`)
    
  } catch (error) {
    console.error('=== CRITICAL ERROR IN ENHANCED STORAGE ===')
    console.error('Platform:', platform)
    console.error('Error:', error)
    console.error('Stack:', error.stack)
    throw error
  }
}

// Enhanced data sanitization function
function sanitizeCandidateData(candidate: any): any {
  const sanitized = { ...candidate }
  
  // Ensure text fields are strings and not too long
  if (sanitized.name && typeof sanitized.name === 'string') {
    sanitized.name = sanitized.name.substring(0, 255).trim()
  }
  
  if (sanitized.title && typeof sanitized.title === 'string') {
    sanitized.title = sanitized.title.substring(0, 255).trim()
  }
  
  if (sanitized.location && typeof sanitized.location === 'string') {
    sanitized.location = sanitized.location.substring(0, 255).trim()
  }
  
  if (sanitized.summary && typeof sanitized.summary === 'string') {
    sanitized.summary = sanitized.summary.substring(0, 2000).trim()
  }
  
  // Ensure arrays are properly formatted
  if (!Array.isArray(sanitized.skills)) {
    sanitized.skills = []
  }
  
  if (!Array.isArray(sanitized.risk_flags)) {
    sanitized.risk_flags = []
  }
  
  // Ensure numeric fields are valid numbers
  const numericFields = ['experience_years', 'overall_score', 'skill_match', 'experience', 'reputation', 'freshness', 'social_proof']
  numericFields.forEach(field => {
    if (sanitized[field] && (isNaN(sanitized[field]) || !isFinite(sanitized[field]))) {
      sanitized[field] = 0
    }
  })
  
  return sanitized
}

// Enhanced email extraction function with prioritization
function extractBestEmail(candidate: any): string | null {
  // Priority order: README email > Apollo email > profile email
  const emailSources = [
    { email: candidate.email, source: candidate.readme_email_found ? 'README' : 'profile' },
    { email: candidate.apollo_email, source: 'Apollo' }
  ]
  
  for (const { email, source } of emailSources) {
    if (email && isValidEmail(email)) {
      console.log(`Using ${source} email for ${candidate.name}: ${email}`)
      return email
    }
  }
  
  console.log(`No valid email found for ${candidate.name}`)
  return null
}

// Simple email validation
function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 255
}

async function storeCandidateSource(supabase: any, candidateId: string, platform: string, candidateData: any) {
  try {
    console.log(`Storing source data for candidate ${candidateData.name} on ${platform}`)
    
    // Construct platform-specific URL and data with enhanced error handling
    let platformUrl = ''
    let platformId = ''
    let sourceData: any = {}

    switch (platform) {
      case 'github':
        if (candidateData.github_username) {
          platformUrl = `https://github.com/${candidateData.github_username}`
          platformId = candidateData.github_username
          sourceData = {
            profile_url: platformUrl,
            repositories: candidateData.repositories || [],
            followers: candidateData.followers || 0,
            public_repos: candidateData.public_repos || 0,
            readme_email_found: candidateData.readme_email_found || false,
            language_expertise: candidateData.language_expertise || 0
          }
        }
        break
      case 'stackoverflow':
        if (candidateData.stackoverflow_id) {
          platformUrl = `https://stackoverflow.com/users/${candidateData.stackoverflow_id}`
          platformId = candidateData.stackoverflow_id
          sourceData = {
            profile_url: platformUrl,
            reputation: candidateData.reputation || 0,
            answer_count: candidateData.answer_count || 0,
            question_count: candidateData.question_count || 0,
            top_tags: candidateData.top_tags || []
          }
        }
        break
      case 'linkedin':
        if (candidateData.linkedin_url) {
          platformUrl = candidateData.linkedin_url
          platformId = candidateData.linkedin_url.split('/').pop() || ''
          sourceData = {
            profile_url: platformUrl,
            headline: candidateData.title || '',
            location: candidateData.location || ''
          }
        }
        break
      case 'google':
        if (candidateData.profile_url || candidateData.url) {
          platformUrl = candidateData.profile_url || candidateData.url
          platformId = candidateData.name || candidateData.title || 'unknown'
          sourceData = {
            profile_url: platformUrl,
            search_result_title: candidateData.title || candidateData.name,
            search_snippet: candidateData.snippet || candidateData.summary,
            google_enhanced: true
          }
        }
        break
      default:
        platformUrl = candidateData.profile_url || candidateData.url || ''
        platformId = candidateData.platform_id || candidateData.id || candidateData.name || 'unknown'
        sourceData = {
          profile_url: platformUrl,
          platform_specific_data: candidateData
        }
    }

    // Enhanced validation - ensure we have minimum required data
    if (!platformUrl && !platformId) {
      console.log(`Skipping source storage for ${candidateData.name} on ${platform} - insufficient data`)
      return
    }

    // Use name as fallback for platformId if still empty
    if (!platformId) {
      platformId = candidateData.name || 'unknown'
    }

    // Sanitize platform ID
    platformId = String(platformId).substring(0, 255)

    console.log(`Attempting to store source: ${platformUrl} (Platform ID: ${platformId})`)

    // Use INSERT with ON CONFLICT DO NOTHING to handle duplicates gracefully
    const { error: sourceError } = await supabase
      .from('candidate_sources')
      .insert({
        candidate_id: candidateId,
        platform: platform,
        platform_id: platformId,
        url: platformUrl || `https://${platform}.com/${platformId}`,
        data: sourceData
      })
      .onConflict('platform,platform_id')
      .ignore()

    if (sourceError) {
      console.error(`Error storing source for ${platform}:`, sourceError)
    } else {
      console.log(`Successfully stored source for ${candidateData.name} on ${platform}`)
    }
  } catch (error) {
    console.error(`Critical error storing candidate source for ${platform}:`, error)
  }
}

// Apollo.io integration for enhanced email discovery with comprehensive error handling
export async function enrichWithApollo(candidate: any, apolloApiKey: string): Promise<any> {
  if (!apolloApiKey) {
    console.log('Apollo API key not available, skipping Apollo enrichment')
    return candidate
  }

  try {
    console.log(`Starting Apollo enrichment for ${candidate.name}`)
    
    // Validate input data
    if (!candidate.name || candidate.name.trim() === '') {
      console.log('Cannot enrich candidate without name')
      return candidate
    }
    
    // Apollo.io person search API with enhanced payload
    const searchPayload = {
      q_person_name: candidate.name.trim(),
      page: 1,
      per_page: 1
    }
    
    // Add optional fields if available
    if (candidate.title && candidate.title.trim()) {
      searchPayload.person_titles = [candidate.title.trim()]
    }
    
    if (candidate.location && candidate.location.trim()) {
      searchPayload.organization_locations = [candidate.location.trim()]
    }
    
    console.log('Apollo search payload:', searchPayload)
    
    // Add timeout to Apollo request
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Apollo request timeout')), 15000)
    )
    
    const apolloPromise = fetch('https://api.apollo.io/v1/mixed_people/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': apolloApiKey
      },
      body: JSON.stringify(searchPayload)
    })

    const searchResponse = await Promise.race([apolloPromise, timeoutPromise])

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text()
      console.log(`Apollo search failed for ${candidate.name}: ${searchResponse.status} - ${errorText}`)
      return candidate
    }

    const searchData = await searchResponse.json()
    console.log(`Apollo response for ${candidate.name}:`, searchData.people?.length || 0, 'results')
    
    if (searchData.people && searchData.people.length > 0) {
      const apolloPerson = searchData.people[0]
      
      // Extract email from Apollo response
      if (apolloPerson.email && isValidEmail(apolloPerson.email)) {
        console.log(`Found Apollo email for ${candidate.name}: ${apolloPerson.email}`)
        candidate.apollo_email = apolloPerson.email
        candidate.email = candidate.email || apolloPerson.email
        candidate.apollo_enriched = true
      }
      
      // Additional Apollo data enhancement
      if (apolloPerson.linkedin_url && !candidate.linkedin_url) {
        candidate.linkedin_url = apolloPerson.linkedin_url
        console.log(`Found LinkedIn URL for ${candidate.name}: ${apolloPerson.linkedin_url}`)
      }
      
      if (apolloPerson.twitter_url && !candidate.twitter_url) {
        candidate.twitter_url = apolloPerson.twitter_url
        console.log(`Found Twitter URL for ${candidate.name}: ${apolloPerson.twitter_url}`)
      }
      
      if (apolloPerson.organization && !candidate.current_company) {
        candidate.current_company = apolloPerson.organization.name
        console.log(`Found company for ${candidate.name}: ${apolloPerson.organization.name}`)
      }
      
      console.log(`Successfully enriched ${candidate.name} with Apollo.io data`)
    } else {
      console.log(`No Apollo results found for ${candidate.name}`)
    }
    
    return candidate
  } catch (error) {
    console.error(`Apollo enrichment failed for ${candidate.name}:`, error)
    return candidate
  }
}
