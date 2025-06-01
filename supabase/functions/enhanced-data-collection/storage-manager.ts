
export async function storeWithEnhancedDeduplication(candidates: any[], supabase: any, queryEmbedding: number[] | null, platform: string) {
  try {
    for (const candidate of candidates) {
      // Enhanced multi-field duplicate detection with platform awareness
      const { data: existing } = await supabase
        .from('candidates')
        .select('id, name, github_username, email, overall_score, linkedin_url')
        .or(`name.ilike.%${candidate.name}%,github_username.eq.${candidate.github_username || 'null'},email.eq.${candidate.email || 'null'},linkedin_url.eq.${candidate.linkedin_url || 'null'}`)

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

      const { error } = await supabase
        .from('candidates')
        .insert(candidateData)

      if (error) {
        console.error('Error storing enhanced candidate:', error)
      } else {
        console.log(`Successfully stored enhanced ${candidate.candidate_tier || 'untiered'} candidate: ${candidate.name} from ${platform} (Score: ${candidate.overall_score})`)
      }
    }
  } catch (error) {
    console.error('Error in enhanced deduplication storage:', error)
  }
}
