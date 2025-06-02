
export interface CandidateData {
  id?: string; // Make optional so we can generate it if needed
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

export function generateValidUUID(): string {
  return crypto.randomUUID();
}

export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export async function saveCandidateWithSource(
  supabase: any,
  candidate: CandidateData,
  sourceData: CandidateSourceData
): Promise<{ success: boolean; candidateId?: string; error?: string }> {
  try {
    // Generate valid UUID if not provided or invalid
    if (!candidate.id || !validateUUID(candidate.id)) {
      candidate.id = generateValidUUID();
      console.log(`Generated new UUID for candidate: ${candidate.id}`);
    }

    // Validate all data before insertion
    const cleanedCandidate = {
      id: candidate.id,
      name: candidate.name || 'Unknown',
      title: candidate.title || '',
      location: candidate.location || '',
      avatar_url: candidate.avatar_url || null,
      email: candidate.email || null,
      github_username: candidate.github_username || null,
      summary: candidate.summary || '',
      skills: Array.isArray(candidate.skills) ? candidate.skills : [],
      experience_years: Math.round(Number(candidate.experience_years) || 0),
      last_active: candidate.last_active || new Date().toISOString(),
      overall_score: Math.round(Number(candidate.overall_score) || 0),
      skill_match: Math.round(Number(candidate.skill_match) || 0),
      experience: Math.round(Number(candidate.experience) || 0),
      reputation: Math.round(Number(candidate.reputation) || 0),
      freshness: Math.round(Number(candidate.freshness) || 0),
      social_proof: Math.round(Number(candidate.social_proof) || 0),
      risk_flags: Array.isArray(candidate.risk_flags) ? candidate.risk_flags : []
    };

    console.log(`Attempting to save candidate: ${cleanedCandidate.name} with ID: ${cleanedCandidate.id}`);

    // Check for existing candidate by platform username or email
    let existingCandidateId: string | null = null;

    if (cleanedCandidate.github_username) {
      const { data: existing } = await supabase
        .from('candidates')
        .select('id')
        .eq('github_username', cleanedCandidate.github_username)
        .maybeSingle();
      
      if (existing) existingCandidateId = existing.id;
    }

    if (!existingCandidateId && cleanedCandidate.email) {
      const { data: existing } = await supabase
        .from('candidates')
        .select('id')
        .eq('email', cleanedCandidate.email)
        .maybeSingle();
      
      if (existing) existingCandidateId = existing.id;
    }

    if (existingCandidateId) {
      // Update existing candidate
      const { error: updateError } = await supabase
        .from('candidates')
        .update({
          name: cleanedCandidate.name,
          title: cleanedCandidate.title,
          location: cleanedCandidate.location,
          avatar_url: cleanedCandidate.avatar_url,
          email: cleanedCandidate.email,
          summary: cleanedCandidate.summary,
          skills: cleanedCandidate.skills,
          experience_years: cleanedCandidate.experience_years,
          last_active: cleanedCandidate.last_active,
          overall_score: cleanedCandidate.overall_score,
          skill_match: cleanedCandidate.skill_match,
          experience: cleanedCandidate.experience,
          reputation: cleanedCandidate.reputation,
          freshness: cleanedCandidate.freshness,
          social_proof: cleanedCandidate.social_proof,
          risk_flags: cleanedCandidate.risk_flags,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingCandidateId);

      if (updateError) {
        console.error('Error updating candidate:', updateError);
        return { success: false, error: updateError.message };
      }

      console.log(`✅ Updated existing candidate: ${cleanedCandidate.name}`);
      
      // Update source data with existing candidate ID
      sourceData.candidate_id = existingCandidateId;
    } else {
      // Insert new candidate
      const { error: insertError } = await supabase
        .from('candidates')
        .insert(cleanedCandidate);

      if (insertError) {
        console.error('Error inserting candidate:', insertError);
        return { success: false, error: insertError.message };
      }

      console.log(`✅ Inserted new candidate: ${cleanedCandidate.name}`);
      
      // Update source data with new candidate ID
      sourceData.candidate_id = cleanedCandidate.id;
    }

    // Add candidate source record (only if not already exists)
    const { data: existingSourceCheck } = await supabase
      .from('candidate_sources')
      .select('id')
      .eq('candidate_id', sourceData.candidate_id)
      .eq('platform', sourceData.platform)
      .eq('url', sourceData.url)
      .maybeSingle();

    if (!existingSourceCheck) {
      const { error: sourceError } = await supabase
        .from('candidate_sources')
        .insert({
          candidate_id: sourceData.candidate_id,
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

    return { success: true, candidateId: sourceData.candidate_id };
  } catch (error) {
    console.error('Database operation failed:', error);
    return { success: false, error: error.message };
  }
}
