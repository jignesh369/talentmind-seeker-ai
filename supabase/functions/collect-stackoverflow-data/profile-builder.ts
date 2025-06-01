
import { UserInfo, AnswererStats, UserTag } from './user-validator.ts';

export function createEnhancedSOTitle(userTags: UserTag[], answerer: AnswererStats, expertiseScore: number): string {
  if (userTags.length === 0) return 'Stack Overflow Contributor';
  
  const primaryTag = userTags[0];
  const answerCount = answerer.answer_count || 0;
  const score = primaryTag.score || primaryTag.answer_score || 0;
  
  let level = 'Contributor';
  if (expertiseScore > 80 || score > 50) {
    level = 'Expert';
  } else if (expertiseScore > 60 || answerCount > 25) {
    level = 'Senior';
  } else if (answerCount > 10) {
    level = 'Experienced';
  }
  
  const technology = (primaryTag.name || primaryTag.tag_name || '').replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  return `${level} ${technology} Developer`;
}

export function createEnhancedSOSummary(
  userInfo: UserInfo, 
  answerer: AnswererStats, 
  userTags: UserTag[], 
  expertiseScore: number
): string {
  const parts = [];
  
  const level = expertiseScore > 70 ? 'Expert' : 'Active';
  parts.push(`${level} Stack Overflow contributor with ${userInfo.reputation || 0} reputation`);
  
  if (answerer.answer_count && answerer.answer_count > 0) {
    parts.push(`${answerer.answer_count} quality answers`);
  }
  
  if (answerer.answer_score && answerer.answer_score > 10) {
    parts.push(`${answerer.answer_score} answer score`);
  }
  
  if (userTags.length > 0) {
    const topSkills = userTags.slice(0, 4).map(tag => tag.name || tag.tag_name).join(', ');
    parts.push(`Specialized in: ${topSkills}`);
  }
  
  if (userInfo.accept_rate) {
    parts.push(`${userInfo.accept_rate}% accept rate`);
  }
  
  const yearsActive = Math.floor((Date.now() - userInfo.creation_date * 1000) / (365 * 24 * 60 * 60 * 1000));
  if (yearsActive > 1) {
    parts.push(`${yearsActive} years on Stack Overflow`);
  }
  
  return parts.join('. ').substring(0, 350);
}

export function enhanceSkillsFromTags(userTags: UserTag[], searchTags: string[]): string[] {
  const skills = new Set<string>();
  
  // Add user's top tags with score weighting
  userTags
    .sort((a, b) => (b.score || b.answer_score || 0) - (a.score || a.answer_score || 0))
    .slice(0, 8)
    .forEach(tag => {
      const tagName = tag.name || tag.tag_name || '';
      skills.add(tagName.replace(/-/g, ' '));
    });
  
  // Add relevant search tags
  searchTags.forEach(tag => {
    skills.add(tag.replace(/-/g, ' '));
  });
  
  return Array.from(skills).slice(0, 10);
}
