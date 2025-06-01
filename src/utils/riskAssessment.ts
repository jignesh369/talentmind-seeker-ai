
export function calculateRefinedRiskFlags(candidate: any): string[] {
  const risks: string[] = [];
  
  // Profile age and activity risks
  const lastActive = candidate.last_active ? new Date(candidate.last_active) : null;
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  
  if (lastActive && lastActive < twoYearsAgo) {
    risks.push('Inactive for >2 years');
  }
  
  // Incomplete profile risks
  const skills = candidate.skills || [];
  if (skills.length < 3) {
    risks.push('Incomplete skill information');
  }
  
  if (!candidate.summary || candidate.summary.length < 50) {
    risks.push('Minimal profile description');
  }
  
  // Experience consistency risks
  if (candidate.experience_years && candidate.experience_years < 1) {
    risks.push('Limited experience');
  }
  
  // Location and activity pattern risks
  if (!candidate.location) {
    risks.push('Location not specified');
  }
  
  // Reputation risks (very low scores)
  if (candidate.overall_score && candidate.overall_score < 30) {
    risks.push('Low overall score');
  }
  
  return risks;
}

export function calculateDataQualityMetrics(candidate: any): {
  completeness: number;
  freshness: number;
  reliability: number;
} {
  const fields = ['name', 'title', 'location', 'email', 'summary', 'skills', 'github_username'];
  const filledFields = fields.filter(field => {
    const value = candidate[field];
    return value && (Array.isArray(value) ? value.length > 0 : value.toString().trim().length > 0);
  }).length;
  
  const completeness = Math.round((filledFields / fields.length) * 100);
  
  // Calculate freshness based on last_active
  const lastActive = candidate.last_active ? new Date(candidate.last_active) : new Date(candidate.created_at);
  const daysSinceActive = Math.floor((Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
  const freshness = Math.max(0, Math.min(100, 100 - (daysSinceActive / 365) * 50));
  
  // Calculate reliability based on source diversity and validation
  const sources = candidate.candidate_sources || [];
  const reliability = Math.min(100, (sources.length * 25) + (candidate.overall_score || 0) / 2);
  
  return {
    completeness: Math.round(completeness),
    freshness: Math.round(freshness),
    reliability: Math.round(reliability)
  };
}
