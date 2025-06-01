
export interface CandidateProfile {
  name: string;
  email?: string;
  location?: string;
  skills: string[];
  platforms: { [platform: string]: any };
  confidence_score: number;
  authenticity_score: number;
  availability_signals: string[];
}

export class CrossPlatformValidator {
  private static readonly CONFIDENCE_WEIGHTS = {
    name_match: 0.25,
    email_match: 0.30,
    location_match: 0.15,
    skill_overlap: 0.20,
    profile_consistency: 0.10
  };

  private static readonly AVAILABILITY_SIGNALS = [
    'open to work',
    'looking for opportunities',
    'available for hire',
    'seeking new role',
    'job seeking',
    'career change',
    'new opportunities',
    'ready for next challenge'
  ];

  static validateCandidateAcrossPlatforms(
    candidates: { [platform: string]: any[] }
  ): CandidateProfile[] {
    const validatedProfiles: CandidateProfile[] = [];
    const nameToProfiles = this.groupCandidatesByName(candidates);

    for (const [name, profiles] of nameToProfiles) {
      if (profiles.length < 2) continue; // Need at least 2 platform matches

      const consolidatedProfile = this.consolidateProfiles(name, profiles);
      if (consolidatedProfile.confidence_score >= 70) {
        validatedProfiles.push(consolidatedProfile);
      }
    }

    return validatedProfiles.sort((a, b) => b.confidence_score - a.confidence_score);
  }

  static calculateAutenticityScore(profile: CandidateProfile): number {
    let score = 50; // Base score

    // Platform diversity bonus
    const platformCount = Object.keys(profile.platforms).length;
    score += Math.min(platformCount * 15, 30);

    // Profile completeness
    if (profile.email) score += 15;
    if (profile.location) score += 10;
    if (profile.skills.length >= 5) score += 10;

    // Consistency checks
    const locationConsistency = this.checkLocationConsistency(profile);
    const skillConsistency = this.checkSkillConsistency(profile);
    
    score += locationConsistency * 10;
    score += skillConsistency * 15;

    // Activity recency
    const activityScore = this.calculateActivityScore(profile);
    score += activityScore;

    return Math.min(score, 100);
  }

  static detectAvailabilitySignals(profile: CandidateProfile): string[] {
    const signals = [];
    const allText = this.extractAllTextFromProfile(profile).toLowerCase();

    for (const signal of this.AVAILABILITY_SIGNALS) {
      if (allText.includes(signal)) {
        signals.push(signal);
      }
    }

    // Additional LinkedIn-specific signals
    if (profile.platforms.linkedin) {
      const linkedinData = profile.platforms.linkedin;
      if (linkedinData.headline?.includes('#OpenToWork')) {
        signals.push('linkedin_open_to_work');
      }
      if (linkedinData.activity?.includes('job search')) {
        signals.push('active_job_search');
      }
    }

    // GitHub activity signals
    if (profile.platforms.github) {
      const githubData = profile.platforms.github;
      if (githubData.bio?.includes('looking for')) {
        signals.push('github_looking_for_work');
      }
      if (githubData.recent_activity?.includes('resume')) {
        signals.push('recent_resume_activity');
      }
    }

    return signals;
  }

  static assessCandidateTier(profile: CandidateProfile): 'gold' | 'silver' | 'bronze' {
    const availabilityScore = profile.availability_signals.length * 20;
    const authenticityScore = profile.authenticity_score;
    const platformScore = Object.keys(profile.platforms).length * 10;

    const totalScore = availabilityScore + authenticityScore + platformScore;

    if (totalScore >= 90 && profile.availability_signals.length >= 2) return 'gold';
    if (totalScore >= 70 || profile.availability_signals.length >= 1) return 'silver';
    return 'bronze';
  }

  private static groupCandidatesByName(
    candidates: { [platform: string]: any[] }
  ): Map<string, Array<{ platform: string; data: any }>> {
    const nameToProfiles = new Map();

    for (const [platform, platformCandidates] of Object.entries(candidates)) {
      for (const candidate of platformCandidates) {
        const normalizedName = this.normalizeName(candidate.name);
        if (!nameToProfiles.has(normalizedName)) {
          nameToProfiles.set(normalizedName, []);
        }
        nameToProfiles.get(normalizedName).push({ platform, data: candidate });
      }
    }

    return nameToProfiles;
  }

  private static consolidateProfiles(
    name: string, 
    profiles: Array<{ platform: string; data: any }>
  ): CandidateProfile {
    const consolidatedProfile: CandidateProfile = {
      name,
      skills: [],
      platforms: {},
      confidence_score: 0,
      authenticity_score: 0,
      availability_signals: []
    };

    // Consolidate data from all platforms
    for (const { platform, data } of profiles) {
      consolidatedProfile.platforms[platform] = data;
      
      // Merge skills
      if (data.skills) {
        consolidatedProfile.skills.push(...data.skills);
      }

      // Use first available email/location
      if (data.email && !consolidatedProfile.email) {
        consolidatedProfile.email = data.email;
      }
      if (data.location && !consolidatedProfile.location) {
        consolidatedProfile.location = data.location;
      }
    }

    // Remove duplicate skills
    consolidatedProfile.skills = [...new Set(consolidatedProfile.skills)];

    // Calculate confidence score
    consolidatedProfile.confidence_score = this.calculateConfidenceScore(consolidatedProfile);
    
    // Calculate authenticity score
    consolidatedProfile.authenticity_score = this.calculateAutenticityScore(consolidatedProfile);
    
    // Detect availability signals
    consolidatedProfile.availability_signals = this.detectAvailabilitySignals(consolidatedProfile);

    return consolidatedProfile;
  }

  private static calculateConfidenceScore(profile: CandidateProfile): number {
    let score = 0;

    // Name consistency (always 100% since we group by name)
    score += this.CONFIDENCE_WEIGHTS.name_match * 100;

    // Email presence and consistency
    if (profile.email) {
      score += this.CONFIDENCE_WEIGHTS.email_match * 100;
    }

    // Location consistency
    const locationScore = this.checkLocationConsistency(profile) * 100;
    score += this.CONFIDENCE_WEIGHTS.location_match * locationScore;

    // Skill overlap between platforms
    const skillScore = this.checkSkillConsistency(profile) * 100;
    score += this.CONFIDENCE_WEIGHTS.skill_overlap * skillScore;

    // Profile consistency
    const consistencyScore = this.checkProfileConsistency(profile) * 100;
    score += this.CONFIDENCE_WEIGHTS.profile_consistency * consistencyScore;

    return Math.round(score);
  }

  private static normalizeName(name: string): string {
    return name.toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private static checkLocationConsistency(profile: CandidateProfile): number {
    const locations = Object.values(profile.platforms)
      .map(data => data.location)
      .filter(Boolean)
      .map(loc => loc.toLowerCase().trim());

    if (locations.length <= 1) return 1;

    // Check if locations are similar
    const uniqueLocations = [...new Set(locations)];
    return uniqueLocations.length === 1 ? 1 : 0.5;
  }

  private static checkSkillConsistency(profile: CandidateProfile): number {
    const platformSkills = Object.values(profile.platforms)
      .map(data => data.skills || [])
      .filter(skills => skills.length > 0);

    if (platformSkills.length <= 1) return 1;

    // Calculate overlap between platform skills
    const allSkills = platformSkills.flat();
    const uniqueSkills = [...new Set(allSkills)];
    const overlapRatio = uniqueSkills.length / allSkills.length;

    return Math.max(0, 1 - overlapRatio);
  }

  private static checkProfileConsistency(profile: CandidateProfile): number {
    let consistencyScore = 1;

    // Check for contradictory information
    const titles = Object.values(profile.platforms)
      .map(data => data.title)
      .filter(Boolean);

    if (titles.length > 1) {
      const uniqueTitles = [...new Set(titles.map(t => t.toLowerCase()))];
      if (uniqueTitles.length > titles.length * 0.8) {
        consistencyScore *= 0.7; // Penalize for too many different titles
      }
    }

    return consistencyScore;
  }

  private static calculateActivityScore(profile: CandidateProfile): number {
    let score = 0;

    // GitHub activity
    if (profile.platforms.github) {
      const github = profile.platforms.github;
      if (github.last_active) {
        const daysSinceActive = this.daysSince(github.last_active);
        score += Math.max(0, 10 - daysSinceActive / 10);
      }
    }

    // LinkedIn activity
    if (profile.platforms.linkedin) {
      const linkedin = profile.platforms.linkedin;
      if (linkedin.last_activity) {
        const daysSinceActive = this.daysSince(linkedin.last_activity);
        score += Math.max(0, 5 - daysSinceActive / 20);
      }
    }

    return Math.min(score, 15);
  }

  private static extractAllTextFromProfile(profile: CandidateProfile): string {
    const texts = [];
    
    for (const platformData of Object.values(profile.platforms)) {
      if (platformData.summary) texts.push(platformData.summary);
      if (platformData.bio) texts.push(platformData.bio);
      if (platformData.title) texts.push(platformData.title);
      if (platformData.about) texts.push(platformData.about);
    }

    return texts.join(' ');
  }

  private static daysSince(dateString: string): number {
    const date = new Date(dateString);
    const now = new Date();
    return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  }
}
