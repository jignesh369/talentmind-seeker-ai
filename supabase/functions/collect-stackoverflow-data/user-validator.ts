
export interface UserInfo {
  reputation?: number;
  last_access_date: number;
  creation_date: number;
  display_name?: string;
  location?: string;
  profile_image?: string;
  link?: string;
  up_vote_count?: number;
  down_vote_count?: number;
  question_count?: number;
  accept_rate?: number;
}

export interface AnswererStats {
  answer_count?: number;
  answer_score?: number;
  user?: {
    user_id: number;
  };
}

export interface UserTag {
  name: string;
  score?: number;
  count?: number;
  tag_name?: string;
  answer_score?: number;
  answer_count?: number;
}

export function isEnhancedQualityContributor(
  userInfo: UserInfo, 
  answerer: AnswererStats, 
  userTags: UserTag[], 
  searchTag: string
): boolean {
  // Enhanced reputation threshold
  if ((userInfo.reputation || 0) < 300) return false;
  
  // Must have substantial answer activity
  if ((answerer.answer_count || 0) < 3) return false;
  
  // Enhanced recent activity check (within 18 months)
  const lastActive = new Date(userInfo.last_access_date * 1000);
  const eighteenMonthsAgo = new Date(Date.now() - 18 * 30 * 24 * 60 * 60 * 1000);
  if (lastActive < eighteenMonthsAgo) return false;
  
  // Must have expertise in relevant tags
  if (userTags.length === 0) return false;
  
  // Enhanced tag relevance check
  const hasRelevantExpertise = userTags.some(tag => 
    (tag.name || tag.tag_name) === searchTag || 
    (tag.score || tag.answer_score || 0) > 10 || 
    (tag.count || tag.answer_count || 0) > 5
  );
  if (!hasRelevantExpertise) return false;
  
  return true;
}

export function calculateEnhancedSORiskFlags(userInfo: UserInfo, userTags: UserTag[]): string[] {
  const flags = [];
  
  if (!userInfo.location) flags.push('No location specified');
  if ((userInfo.reputation || 0) < 500) flags.push('Moderate reputation');
  if (!userInfo.question_count || userInfo.question_count < 5) flags.push('Limited answers');
  
  const daysSinceAccess = (Date.now() - userInfo.last_access_date * 1000) / (1000 * 60 * 60 * 24);
  if (daysSinceAccess > 180) flags.push('Less active recently');
  
  if (userTags.length < 2) flags.push('Limited expertise areas');
  
  const totalTagScore = userTags.reduce((sum, tag) => sum + (tag.score || tag.answer_score || 0), 0);
  if (totalTagScore < 20) flags.push('Developing expertise');
  
  return flags;
}

export function cleanLocation(location: string | null): string | null {
  if (!location) return null;
  
  // Remove common noise from SO locations
  return location
    .replace(/\b(Earth|World|Planet|Universe)\b/gi, '')
    .replace(/[^\w\s,.-]/g, '')
    .trim()
    .substring(0, 50) || null;
}

export function calculateSOFreshness(lastAccessTimestamp: number): number {
  const daysSinceAccess = (Date.now() - lastAccessTimestamp * 1000) / (1000 * 60 * 60 * 24);
  
  if (daysSinceAccess < 7) return 100;
  if (daysSinceAccess < 30) return 80;
  if (daysSinceAccess < 90) return 60;
  if (daysSinceAccess < 180) return 40;
  if (daysSinceAccess < 365) return 20;
  return 10;
}
