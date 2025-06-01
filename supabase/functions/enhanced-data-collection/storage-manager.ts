
export async function storeWithEnhancedDeduplication(candidates: any[], supabase: any, queryEmbedding: number[] | null, platform: string) {
  try {
    for (const candidate of candidates) {
      // Enhanced multi-field duplicate detection with platform awareness
      const { data: existing } = await supabase
        .from('candidates')
        .select('id, name, github_username, email, overall_score, linkedin_url')
        .or(`name.ilike.%${candidate.name}%,github_username.eq.${candidate.github_username || 'null'},email.eq.${candidate.email || 'null'}`)

      if (existing && existing.length > 0) {
        const existingCandidate = existing[0]
        const shouldUpdate = candidate.overall_score > (existingCandidate.overall_score || 0) + 5 // Higher threshold for updates
        
        if (shouldUpdate) {
          console.log(`Updating existing candidate: ${candidate.name} with enhanced data from ${platform}`)
          const { error } = await supabase
            .from('candidates')
            .update({
              ...candidate,
              enhanced_by_platform: platform,
              last_enhanced: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingCandidate.id)
            
          if (error) {
            console.error('Error updating enhanced candidate:', error)
          } else {
            // Store source information for existing candidate
            await storeCandidateSource(supabase, existingCandidate.id, platform, candidate)
          }
        }
        continue
      }

      // Insert new enhanced candidate
      const candidateData = {
        name: candidate.name,
        title: candidate.title,
        location: candidate.location,
        avatar_url: candidate.avatar_url,
        email: candidate.email,
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

      const { data: insertedCandidate, error } = await supabase
        .from('candidates')
        .insert(candidateData)
        .select('id')
        .single()

      if (error) {
        console.error('Error storing enhanced candidate:', error)
      } else {
        console.log(`Successfully stored enhanced ${candidate.candidate_tier || 'untiered'} candidate: ${candidate.name} from ${platform} (Score: ${candidate.overall_score})`)
        
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

async function storeCandidateSource(supabase: any, candidateId: string, platform: string, candidateData: any) {
  try {
    // Construct platform-specific URL and data
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
            readme_email_found: candidateData.readme_email_found || false
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
      default:
        // For other platforms, use available data
        platformUrl = candidateData.profile_url || candidateData.url || ''
        platformId = candidateData.platform_id || candidateData.id || candidateData.name
        sourceData = {
          profile_url: platformUrl,
          platform_specific_data: candidateData
        }
    }

    if (platformUrl && platformId) {
      // Check if source already exists
      const { data: existingSource } = await supabase
        .from('candidate_sources')
        .select('id')
        .eq('candidate_id', candidateId)
        .eq('platform', platform)
        .eq('platform_id', platformId)
        .single()

      if (!existingSource) {
        const { error: sourceError } = await supabase
          .from('candidate_sources')
          .insert({
            candidate_id: candidateId,
            platform: platform,
            platform_id: platformId,
            url: platformUrl,
            data: sourceData
          })

        if (sourceError) {
          console.error(`Error storing source for ${platform}:`, sourceError)
        } else {
          console.log(`Successfully stored source for ${candidateData.name} on ${platform}`)
        }
      }
    }
  } catch (error) {
    console.error(`Error storing candidate source for ${platform}:`, error)
  }
}
