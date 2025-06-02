
import { supabase } from '@/integrations/supabase/client';

interface StackOverflowProfile {
  user_id: number;
  display_name: string;
  reputation: number;
  badge_counts: {
    bronze: number;
    silver: number;
    gold: number;
  };
  tags: Array<{
    name: string;
    count: number;
  }>;
  answer_count: number;
  question_count: number;
  last_access_date: number;
  profile_image: string;
  link: string;
}

interface EnrichmentResult {
  success: boolean;
  stackoverflowProfile?: StackOverflowProfile;
  confidence: number;
  matchMethod: string;
  error?: string;
}

export class StackOverflowEnrichmentService {
  private static instance: StackOverflowEnrichmentService;

  static getInstance(): StackOverflowEnrichmentService {
    if (!StackOverflowEnrichmentService.instance) {
      StackOverflowEnrichmentService.instance = new StackOverflowEnrichmentService();
    }
    return StackOverflowEnrichmentService.instance;
  }

  async enrichCandidate(candidate: any): Promise<EnrichmentResult> {
    console.log(`🔍 Attempting StackOverflow enrichment for: ${candidate.name}`);

    // Only enrich candidates in technical roles
    if (!this.isTechnicalCandidate(candidate)) {
      return {
        success: false,
        confidence: 0,
        matchMethod: 'not_technical',
        error: 'Candidate not in technical role'
      };
    }

    try {
      // Try multiple matching strategies
      const matchingStrategies = [
        () => this.searchByEmail(candidate.email),
        () => this.searchByDisplayName(candidate.name),
        () => this.searchByUsername(candidate.github_username),
        () => this.searchByDisplayNameVariations(candidate.name)
      ];

      for (const strategy of matchingStrategies) {
        const result = await strategy();
        if (result.success && result.confidence > 60) {
          console.log(`✅ StackOverflow enrichment successful for ${candidate.name} via ${result.matchMethod}`);
          return result;
        }
      }

      console.log(`⚠️ No high-confidence StackOverflow match found for ${candidate.name}`);
      return {
        success: false,
        confidence: 0,
        matchMethod: 'no_match',
        error: 'No matching StackOverflow profile found'
      };

    } catch (error) {
      console.error(`❌ StackOverflow enrichment failed for ${candidate.name}:`, error);
      return {
        success: false,
        confidence: 0,
        matchMethod: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async searchByEmail(email?: string): Promise<EnrichmentResult> {
    if (!email) {
      return { success: false, confidence: 0, matchMethod: 'email_missing' };
    }

    // StackOverflow API doesn't expose emails, so this would require cross-referencing
    // with other data sources or using heuristics
    return { success: false, confidence: 0, matchMethod: 'email_not_supported' };
  }

  private async searchByDisplayName(name: string): Promise<EnrichmentResult> {
    if (!name || name.length < 3) {
      return { success: false, confidence: 0, matchMethod: 'name_too_short' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('enrich-stackoverflow-profile', {
        body: {
          searchType: 'display_name',
          searchValue: name,
          candidateContext: { name }
        }
      });

      if (error) throw error;

      if (data?.profile && data.confidence > 60) {
        return {
          success: true,
          stackoverflowProfile: data.profile,
          confidence: data.confidence,
          matchMethod: 'display_name'
        };
      }

      return { success: false, confidence: data?.confidence || 0, matchMethod: 'display_name_low_confidence' };

    } catch (error) {
      return { 
        success: false, 
        confidence: 0, 
        matchMethod: 'display_name_error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async searchByUsername(username?: string): Promise<EnrichmentResult> {
    if (!username) {
      return { success: false, confidence: 0, matchMethod: 'username_missing' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('enrich-stackoverflow-profile', {
        body: {
          searchType: 'username',
          searchValue: username,
          candidateContext: { github_username: username }
        }
      });

      if (error) throw error;

      if (data?.profile && data.confidence > 70) {
        return {
          success: true,
          stackoverflowProfile: data.profile,
          confidence: data.confidence,
          matchMethod: 'username'
        };
      }

      return { success: false, confidence: data?.confidence || 0, matchMethod: 'username_low_confidence' };

    } catch (error) {
      return { 
        success: false, 
        confidence: 0, 
        matchMethod: 'username_error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async searchByDisplayNameVariations(name: string): Promise<EnrichmentResult> {
    const variations = this.generateNameVariations(name);
    
    for (const variation of variations) {
      const result = await this.searchByDisplayName(variation);
      if (result.success && result.confidence > 65) {
        result.matchMethod = 'name_variation';
        return result;
      }
    }

    return { success: false, confidence: 0, matchMethod: 'name_variations_exhausted' };
  }

  private generateNameVariations(name: string): string[] {
    const variations = [];
    const parts = name.split(' ').filter(part => part.length > 1);
    
    // Add original name
    variations.push(name);
    
    // Add first name only
    if (parts.length > 1) {
      variations.push(parts[0]);
    }
    
    // Add last name only
    if (parts.length > 1) {
      variations.push(parts[parts.length - 1]);
    }
    
    // Add first + last initial
    if (parts.length > 1) {
      variations.push(`${parts[0]} ${parts[parts.length - 1][0]}`);
    }
    
    // Add initials + last name
    if (parts.length > 1) {
      variations.push(`${parts[0][0]} ${parts[parts.length - 1]}`);
    }

    return variations.slice(0, 5); // Limit to 5 variations
  }

  private isTechnicalCandidate(candidate: any): boolean {
    const technicalKeywords = [
      'developer', 'engineer', 'programmer', 'architect', 'devops',
      'frontend', 'backend', 'fullstack', 'software', 'tech',
      'react', 'javascript', 'python', 'java', 'node', 'angular',
      'vue', 'typescript', 'golang', 'rust', 'kotlin', 'swift'
    ];

    const title = (candidate.title || '').toLowerCase();
    const skills = (candidate.skills || []).map((s: string) => s.toLowerCase());
    const summary = (candidate.summary || '').toLowerCase();

    return technicalKeywords.some(keyword => 
      title.includes(keyword) || 
      skills.some(skill => skill.includes(keyword)) ||
      summary.includes(keyword)
    );
  }

  calculateEnhancedScores(candidate: any, stackoverflowProfile: StackOverflowProfile): any {
    const baseScore = candidate.overall_score || 0;
    const reputationBonus = Math.min(stackoverflowProfile.reputation / 100, 30); // Max 30 points
    const badgeBonus = (stackoverflowProfile.badge_counts.gold * 5) + 
                      (stackoverflowProfile.badge_counts.silver * 2) + 
                      (stackoverflowProfile.badge_counts.bronze * 0.5);
    
    const activityScore = Math.min(
      (stackoverflowProfile.answer_count * 2) + stackoverflowProfile.question_count,
      20
    );

    const enhancedScore = Math.min(baseScore + reputationBonus + badgeBonus + activityScore, 100);

    return {
      ...candidate,
      overall_score: Math.round(enhancedScore),
      stackoverflow_reputation: stackoverflowProfile.reputation,
      stackoverflow_badges: stackoverflowProfile.badge_counts,
      stackoverflow_activity: {
        answers: stackoverflowProfile.answer_count,
        questions: stackoverflowProfile.question_count
      },
      technical_credibility_score: Math.round(reputationBonus + badgeBonus),
      stackoverflow_profile_url: stackoverflowProfile.link,
      enrichment_sources: [...(candidate.enrichment_sources || []), 'stackoverflow']
    };
  }
}

export const stackOverflowEnrichmentService = StackOverflowEnrichmentService.getInstance();
