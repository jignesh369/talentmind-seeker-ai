
import { generateUUID } from './database-operations.ts';

export interface CandidateInput {
  name: string;
  title?: string;
  location?: string;
  avatar_url?: string;
  email?: string;
  github_username?: string;
  summary?: string;
  skills?: string[];
  experience_years?: number;
  last_active?: string;
  platform: string;
  platformSpecificData?: any;
}

export function buildCandidate(input: CandidateInput) {
  // Calculate basic scores
  const skillScore = Math.min((input.skills?.length || 0) * 15, 100);
  const experienceScore = Math.min((input.experience_years || 1) * 10, 100);
  
  // Platform-specific scoring
  let reputationScore = 50; // default
  let socialProofScore = 50; // default
  let activityScore = 75; // default
  
  if (input.platform === 'github' && input.platformSpecificData) {
    const data = input.platformSpecificData;
    reputationScore = Math.min((data.public_repos || 0) * 3, 100);
    socialProofScore = Math.min((data.followers || 0) * 2, 100);
  } else if (input.platform === 'stackoverflow' && input.platformSpecificData) {
    const data = input.platformSpecificData;
    reputationScore = Math.min((data.reputation || 0) / 100, 100);
    socialProofScore = Math.min((data.badge_counts?.gold || 0) * 20, 100);
  }
  
  const overallScore = Math.round((skillScore + experienceScore + reputationScore + activityScore) / 4);

  return {
    id: generateUUID(),
    name: input.name || 'Unknown',
    title: input.title || `${input.platform} Developer`,
    location: input.location || '',
    avatar_url: input.avatar_url,
    email: input.email,
    github_username: input.github_username,
    summary: input.summary || `Active developer on ${input.platform}`,
    skills: input.skills || [],
    experience_years: Math.max(1, input.experience_years || 1),
    last_active: input.last_active || new Date().toISOString(),
    overall_score: overallScore,
    skill_match: skillScore,
    experience: experienceScore,
    reputation: reputationScore,
    freshness: activityScore,
    social_proof: socialProofScore,
    risk_flags: [],
    platform: input.platform
  };
}
