
import { Candidate } from '@/hooks/useCandidates';
import { EnhancedCandidate } from '@/types/candidate';

/**
 * Adapts an EnhancedCandidate to be compatible with the base Candidate interface
 */
export const adaptEnhancedToCandidate = (enhanced: EnhancedCandidate): Candidate => {
  return {
    id: enhanced.id,
    name: enhanced.name,
    title: enhanced.title,
    location: enhanced.location,
    avatar_url: enhanced.avatar_url,
    email: enhanced.email,
    github_username: enhanced.github_username,
    stackoverflow_id: enhanced.stackoverflow_id,
    linkedin_url: enhanced.linkedin_url,
    reddit_username: '', // Not in EnhancedCandidate, use empty string
    summary: enhanced.summary,
    skills: enhanced.skills || [],
    experience_years: enhanced.experience_years,
    last_active: enhanced.last_active,
    overall_score: enhanced.overall_score || 0,
    skill_match: enhanced.technical_score || 0, // Map technical_score to skill_match
    experience: enhanced.experience_score || 0,
    reputation: enhanced.cultural_fit_score || 0, // Map cultural_fit_score to reputation
    freshness: enhanced.data_freshness || 0,
    social_proof: enhanced.profile_completeness || 0, // Map profile_completeness to social_proof
    risk_flags: enhanced.risk_factors?.map(rf => rf.reason) || [],
    created_at: new Date().toISOString(), // Default since not in EnhancedCandidate
    updated_at: new Date().toISOString(), // Default since not in EnhancedCandidate
    candidate_sources: enhanced.candidate_sources?.map(cs => ({
      id: cs.url, // Use URL as fallback ID
      platform: cs.platform,
      platform_id: cs.url,
      url: cs.url,
      data: {}
    })) || []
  };
};

/**
 * Checks if a candidate has risk assessment data
 */
export const hasRiskData = (candidate: EnhancedCandidate): boolean => {
  return !!(candidate.risk_factors && candidate.risk_factors.length > 0) ||
         !!(candidate.risk_level && candidate.risk_level !== 'low') ||
         !!(candidate.risk_score && candidate.risk_score > 0);
};

/**
 * Gets risk indicator color based on risk level
 */
export const getRiskIndicatorColor = (riskLevel?: string): string => {
  switch (riskLevel) {
    case 'high': return 'bg-red-500';
    case 'medium': return 'bg-yellow-500';
    case 'low': return 'bg-green-500';
    default: return 'bg-gray-300';
  }
};
