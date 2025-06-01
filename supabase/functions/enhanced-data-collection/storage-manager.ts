
export async function storeWithEnhancedDeduplication(candidates: any[], supabase: any, queryEmbedding: number[] | null, platform: string) {
  console.log(`Starting enhanced deduplication storage for ${candidates.length} candidates from ${platform}`)
  
  try {
    for (const candidate of candidates) {
      // Enhanced multi-field duplicate detection with platform awareness
      const { data: existing } = await supabase
        .from('candidates')
        .select('id, name, github_username, email, overall_score, linkedin_url')
        .or(`name.ilike.%${candidate.name}%,github_username.eq.${candidate.github_username || 'null'},email.eq.${candidate.email || 'null'}`)

      if (existing && existing.length > 0) {
        const existingCandidate = existing[0]
        const shouldUpdate = candidate.overall_score > (existingCandidate.overall_score || 0) + 5
        
        if (shouldUpdate) {
          console.log(`Updating existing candidate: ${candidate.name} with enhanced data from ${platform}`)
          
          // Enhanced update with proper email handling
          const updateData = {
            ...candidate,
            email: candidate.email || existingCandidate.email, // Preserve existing email if new one is empty
            enhanced_by_platform: platform,
            last_enhanced: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          
          const { error } = await supabase
            .from('candidates')
            .update(updateData)
            .eq('id', existingCandidate.id)
            
          if (error) {
            console.error('Error updating enhanced candidate:', error)
          } else {
            console.log(`Successfully updated candidate: ${candidate.name} with email: ${updateData.email}`)
            // Store source information for existing candidate
            await storeCandidateSource(supabase, existingCandidate.id, platform, candidate)
          }
        }
        continue
      }

      // Insert new enhanced candidate with proper email extraction
      const candidateData = {
        name: candidate.name || 'Unknown',
        title: candidate.title,
        location: candidate.location,
        avatar_url: candidate.avatar_url,
        email: extractBestEmail(candidate), // Enhanced email extraction
        github_username: candidate.github_username,
        stackoverflow_id: candidate.stackoverflow_id,
        linkedin_url: candidate.linkedin_url,
        reddit_username: candidate.reddit_username,
        summary: candidate.summary,
        skills: candidate.skills || [],
        experience_years: candidate.experience_years || 0,
        last_active: candidate.last_active,
        
        // Enhanced scoring data
        overall_score: Math.round(candidate.overall_score || 0),
        skill_match: Math.round(candidate.skill_match || 0),
        experience: Math.round(candidate.experience || 0),
        reputation: Math.round(candidate.reputation || 0),
        freshness: Math.round(candidate.freshness || 0),
        social_proof: Math.round(candidate.social_proof || 0),
        risk_flags: candidate.risk_flags || []
      }

      console.log(`Inserting new candidate: ${candidateData.name} with email: ${candidateData.email}`)

      const { data: insertedCandidate, error } = await supabase
        .from('candidates')
        .insert(candidateData)
        .select('id')
        .single()

      if (error) {
        console.error('Error storing enhanced candidate:', error)
      } else {
        console.log(`Successfully stored enhanced ${candidate.candidate_tier || 'untiered'} candidate: ${candidateData.name} from ${platform} (Score: ${candidate.overall_score})`)
        
        // Store source information for new candidate
        if (insertedCandidate?.id) {
          await storeCandidateSource(supabase, insertedCandidate.id, platform, candidate)
        }
      }
    }
  } catch (error) {
    console.error('Error in enhanced deduplication storage:', error)
  }
}

// Enhanced email extraction function
function extractBestEmail(candidate: any): string | null {
  // Priority order: README email > profile email > Apollo email
  if (candidate.readme_email_found && candidate.email) {
    console.log(`Using README email for ${candidate.name}: ${candidate.email}`)
    return candidate.email
  }
  
  if (candidate.apollo_email) {
    console.log(`Using Apollo email for ${candidate.name}: ${candidate.apollo_email}`)
    return candidate.apollo_email
  }
  
  if (candidate.email) {
    console.log(`Using profile email for ${candidate.name}: ${candidate.email}`)
    return candidate.email
  }
  
  console.log(`No email found for ${candidate.name}`)
  return null
}

async function storeCandidateSource(supabase: any, candidateId: string, platform: string, candidateData: any) {
  try {
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
        // Enhanced Google source handling
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
        // For other platforms, use available data
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

    console.log(`Storing source for ${candidateData.name} on ${platform}: ${platformUrl}`)

    // Check if source already exists
    const { data: existingSource } = await supabase
      .from('candidate_sources')
      .select('id')
      .eq('candidate_id', candidateId)
      .eq('platform', platform)
      .eq('platform_id', platformId)
      .maybeSingle()

    if (!existingSource) {
      const { error: sourceError } = await supabase
        .from('candidate_sources')
        .insert({
          candidate_id: candidateId,
          platform: platform,
          platform_id: platformId,
          url: platformUrl || `https://${platform}.com/${platformId}`,
          data: sourceData
        })

      if (sourceError) {
        console.error(`Error storing source for ${platform}:`, sourceError)
      } else {
        console.log(`Successfully stored source for ${candidateData.name} on ${platform}`)
      }
    } else {
      console.log(`Source already exists for ${candidateData.name} on ${platform}`)
    }
  } catch (error) {
    console.error(`Error storing candidate source for ${platform}:`, error)
  }
}

// Apollo.io integration for enhanced email discovery
export async function enrichWithApollo(candidate: any, apolloApiKey: string): Promise<any> {
  if (!apolloApiKey) {
    console.log('Apollo API key not available, skipping Apollo enrichment')
    return candidate
  }

  try {
    console.log(`Enriching ${candidate.name} with Apollo.io`)
    
    // Apollo.io person search API
    const searchResponse = await fetch('https://api.apollo.io/v1/mixed_people/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': apolloApiKey
      },
      body: JSON.stringify({
        q_person_name: candidate.name,
        page: 1,
        per_page: 1,
        person_titles: [candidate.title].filter(Boolean),
        organization_locations: [candidate.location].filter(Boolean)
      })
    })

    if (!searchResponse.ok) {
      console.log(`Apollo search failed for ${candidate.name}: ${searchResponse.status}`)
      return candidate
    }

    const searchData = await searchResponse.json()
    
    if (searchData.people && searchData.people.length > 0) {
      const apolloPerson = searchData.people[0]
      
      // Extract email from Apollo response
      if (apolloPerson.email) {
        console.log(`Found Apollo email for ${candidate.name}: ${apolloPerson.email}`)
        candidate.apollo_email = apolloPerson.email
        candidate.email = candidate.email || apolloPerson.email // Use as fallback
      }
      
      // Additional Apollo data
      if (apolloPerson.linkedin_url) {
        candidate.linkedin_url = candidate.linkedin_url || apolloPerson.linkedin_url
      }
      
      if (apolloPerson.twitter_url) {
        candidate.twitter_url = apolloPerson.twitter_url
      }
      
      candidate.apollo_enriched = true
    }
    
    return candidate
  } catch (error) {
    console.error(`Apollo enrichment failed for ${candidate.name}:`, error)
    return candidate
  }
}
