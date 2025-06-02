
export interface CandidateData {
  id?: string;
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

export function sanitizeIntegerValue(value: any): number {
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  
  const num = Number(value);
  if (isNaN(num)) {
    return 0;
  }
  
  // Ensure it's a whole number and within reasonable bounds
  return Math.max(0, Math.min(999, Math.floor(Math.abs(num))));
}

export function sanitizeStringValue(value: any, defaultValue: string = ''): string {
  if (value === null || value === undefined) {
    return defaultValue;
  }
  return String(value).trim();
}

export async function saveCandidateWithSource(
  supabase: any,
  candidate: CandidateData,
  sourceData: CandidateSourceData
): Promise<{ success: boolean; candidateId?: string; error?: string }> {
  try {
    // Always generate a fresh UUID for new candidates
    const candidateId = generateValidUUID();
    
    console.log(`🔧 Processing candidate: ${candidate.name || 'Unknown'}`);
    
    // Thoroughly sanitize all data before insertion
    const cleanedCandidate = {
      id: candidateId,
      name: sanitizeStringValue(candidate.name, 'Unknown'),
      title: sanitizeStringValue(candidate.title, ''),
      location: sanitizeStringValue(candidate.location, ''),
      avatar_url: candidate.avatar_url ? sanitizeStringValue(candidate.avatar_url) : null,
      email: candidate.email ? sanitizeStringValue(candidate.email) : null,
      github_username: candidate.github_username ? sanitizeStringValue(candidate.github_username) : null,
      summary: sanitizeStringValue(candidate.summary, ''),
      skills: Array.isArray(candidate.skills) ? candidate.skills.filter(s => s && typeof s === 'string') : [],
      experience_years: sanitizeIntegerValue(candidate.experience_years),
      last_active: candidate.last_active || new Date().toISOString(),
      overall_score: sanitizeIntegerValue(candidate.overall_score),
      skill_match: sanitizeIntegerValue(candidate.skill_match),
      experience: sanitizeIntegerValue(candidate.experience),
      reputation: sanitizeIntegerValue(candidate.reputation),
      freshness: sanitizeIntegerValue(candidate.freshness),
      social_proof: sanitizeIntegerValue(candidate.social_proof),
      risk_flags: Array.isArray(candidate.risk_flags) ? candidate.risk_flags.filter(r => r && typeof r === 'string') : []
    };

    console.log(`💾 Sanitized data for ${cleanedCandidate.name}:`, {
      id: cleanedCandidate.id,
      experience_years: cleanedCandidate.experience_years,
      scores: {
        overall: cleanedCandidate.overall_score,
        skill_match: cleanedCandidate.skill_match,
        experience: cleanedCandidate.experience,
        reputation: cleanedCandidate.reputation,
        freshness: cleanedCandidate.freshness,
        social_proof: cleanedCandidate.social_proof
      }
    });

    // Check for existing candidate by unique identifiers
    let existingCandidateId: string | null = null;

    if (cleanedCandidate.github_username) {
      const { data: existing } = await supabase
        .from('candidates')
        .select('id')
        .eq('github_username', cleanedCandidate.github_username)
        .maybeSingle();
      
      if (existing) {
        existingCandidateId = existing.id;
        console.log(`🔄 Found existing candidate by GitHub username: ${cleanedCandidate.github_username}`);
      }
    }

    if (!existingCandidateId && cleanedCandidate.email) {
      const { data: existing } = await supabase
        .from('candidates')
        .select('id')
        .eq('email', cleanedCandidate.email)
        .maybeSingle();
      
      if (existing) {
        existingCandidateId = existing.id;
        console.log(`🔄 Found existing candidate by email: ${cleanedCandidate.email}`);
      }
    }

    if (existingCandidateId) {
      // Update existing candidate with new information
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
        console.error(`❌ Error updating candidate ${cleanedCandidate.name}:`, updateError);
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
        console.error(`❌ Error inserting candidate ${cleanedCandidate.name}:`, insertError);
        return { success: false, error: insertError.message };
      }

      console.log(`✅ Inserted new candidate: ${cleanedCandidate.name}`);
      
      // Update source data with new candidate ID
      sourceData.candidate_id = candidateId;
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
          data: sourceData.data || {}
        });

      if (sourceError) {
        console.error(`⚠️ Warning: Failed to save source for ${cleanedCandidate.name}:`, sourceError);
        // Don't fail the whole operation for source save issues
      } else {
        console.log(`📝 Saved source record for ${sourceData.platform}`);
      }
    }

    return { success: true, candidateId: sourceData.candidate_id };
  } catch (error) {
    console.error(`💥 Database operation failed for candidate:`, error);
    return { success: false, error: error.message };
  }
}
