
export const SEARCH_INTENT_PATTERNS = {
  'active_hiring': ['hire', 'recruit', 'join', 'hiring', 'position', 'role', 'job'],
  'talent_research': ['research', 'market', 'talent pool', 'analysis', 'benchmark'],
  'competitive_intelligence': ['competitor', 'company', 'team', 'organization'],
  'skill_assessment': ['expert', 'specialist', 'advanced', 'proficient', 'experienced'],
  'location_specific': ['remote', 'onsite', 'hybrid', 'relocate', 'local'],
  'project_based': ['contract', 'freelance', 'project', 'consulting', 'temporary']
};

export function detectSearchIntent(query: string): string {
  const queryLower = query.toLowerCase();
  
  for (const [intent, patterns] of Object.entries(SEARCH_INTENT_PATTERNS)) {
    if (patterns.some(pattern => queryLower.includes(pattern))) {
      return intent;
    }
  }
  
  return 'general_talent_discovery';
}
