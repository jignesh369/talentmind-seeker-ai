
import { UserInfo, AnswererStats, UserTag } from './user-validator.ts';
import { EnhancedQuery, getSemanticTagMatches } from './tag-mapper.ts';

export function calculateExpertiseScore(
  userInfo: UserInfo, 
  answerer: AnswererStats, 
  userTags: UserTag[], 
  searchTag: string
): number {
  let score = 0;
  
  // Base reputation component (weighted)
  score += Math.min((userInfo.reputation || 0) / 100, 35);
  
  // Answer quality and quantity
  score += Math.min((answerer.answer_count || 0) * 3, 25);
  score += Math.min((answerer.answer_score || 0) / 10, 20);
  
  // Tag-specific expertise
  const relevantTag = userTags.find(tag => (tag.name || tag.tag_name) === searchTag);
  if (relevantTag) {
    score += Math.min((relevantTag.score || relevantTag.answer_score || 0) / 5, 15);
    score += Math.min((relevantTag.count || relevantTag.answer_count || 0) * 2, 10);
  }
  
  // Top tags performance
  const topTagsBonus = userTags.slice(0, 3).reduce((sum, tag) => 
    sum + Math.min((tag.score || tag.answer_score || 0) / 20, 5), 0
  );
  score += topTagsBonus;
  
  return Math.min(score, 100);
}

export function calculateEnhancedReputationScore(userInfo: UserInfo): number {
  const reputation = userInfo.reputation || 0;
  
  // Progressive scoring with diminishing returns
  if (reputation >= 10000) return 100;
  if (reputation >= 5000) return 85;
  if (reputation >= 2000) return 70;
  if (reputation >= 1000) return 55;
  if (reputation >= 500) return 40;
  
  return Math.min(reputation / 20, 35);
}

export function calculateEnhancedSOActivityScore(userInfo: UserInfo, answerer: AnswererStats): number {
  let score = 0;
  
  // Recent activity (enhanced weight)
  const lastActive = new Date(userInfo.last_access_date * 1000);
  const daysSinceActive = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysSinceActive < 7) score += 40;
  else if (daysSinceActive < 30) score += 35;
  else if (daysSinceActive < 90) score += 25;
  else if (daysSinceActive < 180) score += 15;
  else if (daysSinceActive < 365) score += 10;
  
  // Answer activity
  score += Math.min((answerer.answer_count || 0) * 2, 25);
  
  // Question activity (shows engagement)
  score += Math.min((userInfo.question_count || 0) * 3, 15);
  
  // Vote participation (community engagement)
  const upVotes = userInfo.up_vote_count || 0;
  const downVotes = userInfo.down_vote_count || 0;
  if (upVotes > 0) {
    const voteRatio = upVotes / (downVotes + 1);
    score += Math.min(voteRatio * 3, 12);
  }
  
  // Acceptance rate bonus
  if (userInfo.accept_rate && userInfo.accept_rate > 80) {
    score += 8;
  }
  
  return Math.min(score, 100);
}

export function calculateEnhancedSOSkillMatch(
  userTags: UserTag[], 
  searchTags: string[], 
  enhancedQuery: EnhancedQuery | null
): number {
  if (searchTags.length === 0) return 50;
  
  const userTagNames = userTags.map(tag => (tag.name || tag.tag_name || '').toLowerCase());
  const normalizedSearchTags = searchTags.map(tag => tag.toLowerCase().replace(/[.\s]/g, '-'));
  
  // Direct matches (highest weight)
  const directMatches = normalizedSearchTags.filter(searchTag =>
    userTagNames.some(userTag => 
      userTag.includes(searchTag) || searchTag.includes(userTag)
    )
  );
  
  // Semantic matches
  const semanticMatches = getSemanticTagMatches(userTagNames, normalizedSearchTags);
  
  // Experience level matches
  const experienceMatches = getExperienceLevelMatches(userTags, enhancedQuery);
  
  const totalScore = (directMatches.length * 25) + (semanticMatches * 15) + (experienceMatches * 10);
  return Math.min(totalScore, 100);
}

export function getExperienceLevelMatches(userTags: UserTag[], enhancedQuery: EnhancedQuery | null): number {
  if (!enhancedQuery?.experience_level) return 0;
  
  const experienceLevel = enhancedQuery.experience_level.toLowerCase();
  const totalScore = userTags.reduce((sum, tag) => sum + (tag.score || tag.answer_score || 0), 0);
  
  if (experienceLevel === 'senior' || experienceLevel === 'lead') {
    return totalScore > 100 ? 10 : 5;
  } else if (experienceLevel === 'mid') {
    return totalScore > 50 ? 10 : 5;
  } else {
    return totalScore > 20 ? 10 : 5;
  }
}

export function calculateAnswerQualityScore(answerer: AnswererStats, userInfo: UserInfo): number {
  const answerCount = answerer.answer_count || 0;
  const answerScore = answerer.answer_score || 0;
  const reputation = userInfo.reputation || 0;
  
  if (answerCount === 0) return 0;
  
  const avgScorePerAnswer = answerScore / answerCount;
  const reputationFactor = Math.min(reputation / 1000, 5);
  
  return Math.min(avgScorePerAnswer * 10 + reputationFactor, 100);
}
