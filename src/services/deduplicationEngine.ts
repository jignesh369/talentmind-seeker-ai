export interface CandidateProfile {
  id: string;
  name: string;
  email?: string;
  location?: string;
  github_username?: string;
  linkedin_url?: string;
  skills: string[];
  platform: string;
  [key: string]: any;
}

export interface DeduplicationResult {
  originalCount: number;
  deduplicatedCount: number;
  mergedProfiles: CandidateProfile[];
  duplicatesFound: number;
  mergeDecisions: Array<{
    masterProfile: string;
    mergedProfiles: string[];
    confidence: number;
    reason: string;
  }>;
}

export class DeduplicationEngine {
  private static readonly SIMILARITY_THRESHOLDS = {
    name: 0.85,
    email: 1.0, // Exact match required
    location: 0.75,
    overall: 0.8
  };

  static deduplicate(candidates: CandidateProfile[]): DeduplicationResult {
    console.log(`🔄 Starting deduplication of ${candidates.length} candidates...`);
    
    const mergeDecisions: DeduplicationResult['mergeDecisions'] = [];
    const processed = new Set<string>();
    const mergedProfiles: CandidateProfile[] = [];

    for (const candidate of candidates) {
      if (processed.has(candidate.id)) continue;

      // Find all duplicates for this candidate
      const duplicates = this.findDuplicates(candidate, candidates, processed);
      
      if (duplicates.length > 0) {
        // Merge all duplicates into the best profile
        const mergedProfile = this.mergeCandidates([candidate, ...duplicates]);
        mergedProfiles.push(mergedProfile);

        // Mark all as processed
        processed.add(candidate.id);
        duplicates.forEach(dup => processed.add(dup.id));

        // Record merge decision
        mergeDecisions.push({
          masterProfile: mergedProfile.id,
          mergedProfiles: [candidate.id, ...duplicates.map(d => d.id)],
          confidence: this.calculateMergeConfidence([candidate, ...duplicates]),
          reason: this.generateMergeReason([candidate, ...duplicates])
        });

        console.log(`🔗 Merged ${duplicates.length + 1} profiles into: ${mergedProfile.name}`);
      } else {
        // No duplicates found, keep original
        mergedProfiles.push(candidate);
        processed.add(candidate.id);
      }
    }

    const result: DeduplicationResult = {
      originalCount: candidates.length,
      deduplicatedCount: mergedProfiles.length,
      mergedProfiles,
      duplicatesFound: candidates.length - mergedProfiles.length,
      mergeDecisions
    };

    console.log(`✅ Deduplication completed: ${result.originalCount} → ${result.deduplicatedCount} (-${result.duplicatesFound} duplicates)`);
    return result;
  }

  private static findDuplicates(
    target: CandidateProfile, 
    candidates: CandidateProfile[], 
    processed: Set<string>
  ): CandidateProfile[] {
    const duplicates: CandidateProfile[] = [];

    for (const candidate of candidates) {
      if (candidate.id === target.id || processed.has(candidate.id)) continue;

      const similarity = this.calculateSimilarity(target, candidate);
      if (similarity >= this.SIMILARITY_THRESHOLDS.overall) {
        duplicates.push(candidate);
      }
    }

    return duplicates;
  }

  private static calculateSimilarity(a: CandidateProfile, b: CandidateProfile): number {
    let totalWeight = 0;
    let weightedScore = 0;

    // Name similarity (high weight)
    const nameWeight = 0.4;
    const nameSimilarity = this.calculateNameSimilarity(a.name, b.name);
    weightedScore += nameSimilarity * nameWeight;
    totalWeight += nameWeight;

    // Email similarity (highest weight if available)
    if (a.email && b.email) {
      const emailWeight = 0.3;
      const emailSimilarity = this.calculateEmailSimilarity(a.email, b.email);
      weightedScore += emailSimilarity * emailWeight;
      totalWeight += emailWeight;
    }

    // Platform username similarity
    const usernameWeight = 0.2;
    const usernameSimilarity = this.calculateUsernameSimilarity(a, b);
    weightedScore += usernameSimilarity * usernameWeight;
    totalWeight += usernameWeight;

    // Location similarity (lower weight)
    if (a.location && b.location) {
      const locationWeight = 0.1;
      const locationSimilarity = this.calculateLocationSimilarity(a.location, b.location);
      weightedScore += locationSimilarity * locationWeight;
      totalWeight += locationWeight;
    }

    return totalWeight > 0 ? weightedScore / totalWeight : 0;
  }

  private static calculateNameSimilarity(name1: string, name2: string): number {
    const normalized1 = this.normalizeName(name1);
    const normalized2 = this.normalizeName(name2);

    // Exact match
    if (normalized1 === normalized2) return 1.0;

    // Levenshtein distance similarity
    const levenshteinSim = 1 - (this.levenshteinDistance(normalized1, normalized2) / Math.max(normalized1.length, normalized2.length));

    // Token-based similarity (for reordered names)
    const tokens1 = normalized1.split(' ').filter(t => t.length > 1);
    const tokens2 = normalized2.split(' ').filter(t => t.length > 1);
    const tokenSimilarity = this.calculateTokenOverlap(tokens1, tokens2);

    // Return the maximum of both approaches
    return Math.max(levenshteinSim, tokenSimilarity);
  }

  private static calculateEmailSimilarity(email1: string, email2: string): number {
    const norm1 = email1.toLowerCase().trim();
    const norm2 = email2.toLowerCase().trim();
    
    // Exact email match
    if (norm1 === norm2) return 1.0;

    // Same domain + similar username
    const [user1, domain1] = norm1.split('@');
    const [user2, domain2] = norm2.split('@');

    if (domain1 === domain2) {
      const userSimilarity = this.levenshteinDistance(user1, user2) <= 2 ? 0.8 : 0;
      return userSimilarity;
    }

    return 0;
  }

  private static calculateUsernameSimilarity(a: CandidateProfile, b: CandidateProfile): number {
    const usernames1 = [a.github_username, a.linkedin_url?.split('/').pop()].filter(Boolean);
    const usernames2 = [b.github_username, b.linkedin_url?.split('/').pop()].filter(Boolean);

    let maxSimilarity = 0;
    for (const u1 of usernames1) {
      for (const u2 of usernames2) {
        if (u1 && u2) {
          const similarity = u1.toLowerCase() === u2.toLowerCase() ? 1.0 : 
            1 - (this.levenshteinDistance(u1.toLowerCase(), u2.toLowerCase()) / Math.max(u1.length, u2.length));
          maxSimilarity = Math.max(maxSimilarity, similarity);
        }
      }
    }

    return maxSimilarity;
  }

  private static calculateLocationSimilarity(loc1: string, loc2: string): number {
    const norm1 = loc1.toLowerCase().trim();
    const norm2 = loc2.toLowerCase().trim();

    if (norm1 === norm2) return 1.0;

    // City/Country extraction and comparison
    const tokens1 = norm1.split(/[,\s]+/).filter(t => t.length > 2);
    const tokens2 = norm2.split(/[,\s]+/).filter(t => t.length > 2);

    return this.calculateTokenOverlap(tokens1, tokens2);
  }

  private static calculateTokenOverlap(tokens1: string[], tokens2: string[]): number {
    if (tokens1.length === 0 || tokens2.length === 0) return 0;

    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));

    return intersection.size / Math.max(set1.size, set2.size);
  }

  private static mergeCandidates(candidates: CandidateProfile[]): CandidateProfile {
    // Select the most complete profile as base
    const baseProfile = candidates.reduce((best, current) => {
      const bestScore = this.calculateCompletenessScore(best);
      const currentScore = this.calculateCompletenessScore(current);
      return currentScore > bestScore ? current : best;
    });

    // Merge data from all profiles
    const merged: CandidateProfile = { ...baseProfile };

    for (const candidate of candidates) {
      // Merge emails (prefer non-generic ones)
      if (!merged.email && candidate.email) {
        merged.email = candidate.email;
      } else if (candidate.email && this.isEmailBetter(candidate.email, merged.email)) {
        merged.email = candidate.email;
      }

      // Merge locations (prefer more specific ones)
      if (!merged.location && candidate.location) {
        merged.location = candidate.location;
      } else if (candidate.location && candidate.location.length > (merged.location?.length || 0)) {
        merged.location = candidate.location;
      }

      // Merge skills (union)
      if (candidate.skills) {
        merged.skills = [...new Set([...merged.skills, ...candidate.skills])];
      }

      // Merge platform usernames
      if (candidate.github_username && !merged.github_username) {
        merged.github_username = candidate.github_username;
      }
      if (candidate.linkedin_url && !merged.linkedin_url) {
        merged.linkedin_url = candidate.linkedin_url;
      }

      // Take highest scores
      if (candidate.overall_score && candidate.overall_score > (merged.overall_score || 0)) {
        merged.overall_score = candidate.overall_score;
      }
    }

    // Update merge metadata
    merged.platforms_merged = candidates.map(c => c.platform);
    merged.merge_confidence = this.calculateMergeConfidence(candidates);

    return merged;
  }

  private static calculateCompletenessScore(profile: CandidateProfile): number {
    let score = 0;
    if (profile.name) score += 1;
    if (profile.email) score += 2;
    if (profile.location) score += 1;
    if (profile.github_username) score += 1;
    if (profile.linkedin_url) score += 1;
    if (profile.skills?.length > 0) score += profile.skills.length * 0.1;
    return score;
  }

  private static isEmailBetter(newEmail?: string, currentEmail?: string): boolean {
    if (!newEmail) return false;
    if (!currentEmail) return true;

    // Prefer non-generic domains
    const genericDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    const newDomain = newEmail.split('@')[1];
    const currentDomain = currentEmail.split('@')[1];

    const newIsGeneric = genericDomains.includes(newDomain);
    const currentIsGeneric = genericDomains.includes(currentDomain);

    return !newIsGeneric && currentIsGeneric;
  }

  private static calculateMergeConfidence(candidates: CandidateProfile[]): number {
    if (candidates.length < 2) return 1.0;

    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < candidates.length; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        totalSimilarity += this.calculateSimilarity(candidates[i], candidates[j]);
        comparisons++;
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  private static generateMergeReason(candidates: CandidateProfile[]): string {
    const reasons = [];
    
    if (candidates.some(c => c.email) && candidates.filter(c => c.email).length > 1) {
      reasons.push('email similarity');
    }
    if (candidates.some(c => c.github_username)) {
      reasons.push('GitHub username match');
    }
    if (candidates.every(c => this.normalizeName(c.name) === this.normalizeName(candidates[0].name))) {
      reasons.push('exact name match');
    } else {
      reasons.push('name similarity');
    }

    return reasons.join(', ');
  }

  private static normalizeName(name: string): string {
    return name.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }
}
