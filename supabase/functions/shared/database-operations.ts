
export interface CandidateData {
  id: string;
  name: string;
  title: string;
  location: string;
  avatar_url?: string;
  email?: string;
  github_username?: string;
  summary: string;
  skills: string[];
  experience_years: number;
  last_active: string;
  overall_score: number;
  skill_match: number;
  experience: number;
  reputation: number;
  freshness: number;
  social_proof: number;
  risk_flags: string[];
  platform: string;
}

export interface CandidateSourceData {
  candidate_id: string;
  platform: string;
  platform_id: string;
  url: string;
  data: any;
}

export async function saveCandidateWithSource(
  supabase: any,
  candidate: CandidateData,
  sourceData: CandidateSourceData
): Promise<{ success: boolean; candidateId?: string; error?: string }> {
  try {
    // Check for existing candidate by platform username
    let existingCandidateId: string | null = null;

    if (candidate.github_username) {
      const { data: existing } = await supabase
        .from('candidates')
        .select('id')
        .eq('github_username', candidate.github_username)
        .maybeSingle();
      
      if (existing) existingCandidateId = existing.id;
    }

    // Also check by source URL to avoid duplicates
    if (!existingCandidateId) {
      const { data: existingSource } = await supabase
        .from('candidate_sources')
        .select('candidate_id')
        .eq('url', sourceData.url)
        .maybeSingle();
      
      if (existingSource) existingCandidateId = existingSource.candidate_id;
    }

    if (existingCandidateId) {
      // Update existing candidate
      const { error: updateError } = await supabase
        .from('candidates')
        .update({
          name: candidate.name,
          title: candidate.title,
          location: candidate.location,
          avatar_url: candidate.avatar_url,
          email: candidate.email,
          summary: candidate.summary,
          skills: candidate.skills,
          experience_years: candidate.experience_years,
          last_active: candidate.last_active,
          overall_score: candidate.overall_score,
          skill_match: candidate.skill_match,
          experience: candidate.experience,
          reputation: candidate.reputation,
          freshness: candidate.freshness,
          social_proof: candidate.social_proof,
          risk_flags: candidate.risk_flags,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingCandidateId);

      if (updateError) {
        console.error('Error updating candidate:', updateError);
        return { success: false, error: updateError.message };
      }

      console.log(`✅ Updated existing candidate: ${candidate.name}`);
      return { success: true, candidateId: existingCandidateId };
    } else {
      // Insert new candidate
      const { error: insertError } = await supabase
        .from('candidates')
        .insert({
          id: candidate.id,
          name: candidate.name,
          title: candidate.title,
          location: candidate.location,
          avatar_url: candidate.avatar_url,
          email: candidate.email,
          github_username: candidate.github_username,
          summary: candidate.summary,
          skills: candidate.skills,
          experience_years: candidate.experience_years,
          last_active: candidate.last_active,
          overall_score: candidate.overall_score,
          skill_match: candidate.skill_match,
          experience: candidate.experience,
          reputation: candidate.reputation,
          freshness: candidate.freshness,
          social_proof: candidate.social_proof,
          risk_flags: candidate.risk_flags
        });

      if (insertError) {
        console.error('Error inserting candidate:', insertError);
        return { success: false, error: insertError.message };
      }

      console.log(`✅ Inserted new candidate: ${candidate.name}`);
    }

    // Add candidate source record (only if not already exists)
    const { data: existingSourceCheck } = await supabase
      .from('candidate_sources')
      .select('id')
      .eq('candidate_id', candidate.id)
      .eq('platform', sourceData.platform)
      .maybeSingle();

    if (!existingSourceCheck) {
      const { error: sourceError } = await supabase
        .from('candidate_sources')
        .insert({
          candidate_id: candidate.id,
          platform: sourceData.platform,
          platform_id: sourceData.platform_id,
          url: sourceData.url,
          data: sourceData.data
        });

      if (sourceError) {
        console.error('Warning: Failed to save source:', sourceError);
        // Don't fail the whole operation for source save issues
      } else {
        console.log(`📝 Saved source record for ${sourceData.platform}`);
      }
    }

    return { success: true, candidateId: candidate.id };
  } catch (error) {
    console.error('Database operation failed:', error);
    return { success: false, error: error.message };
  }
}

export function generateUUID(): string {
  return crypto.randomUUID();
}
