
import { AIQueryProcessor, EnhancedQuery } from './AIQueryProcessor';
import { AICandidateScorer, AIScoreBreakdown } from './AICandidateScorer';
import { AIProfileEnhancer, EnhancedProfile } from './AIProfileEnhancer';

export interface AIIntelligenceConfig {
  openaiApiKey: string;
  enableQueryEnhancement: boolean;
  enableCandidateScoring: boolean;
  enableProfileEnhancement: boolean;
  enableOutreachGeneration: boolean;
}

export interface AIProcessedCandidate {
  originalCandidate: any;
  aiScoring?: AIScoreBreakdown;
  enhancedProfile?: EnhancedProfile;
  personalizedOutreach?: string;
  processingMetadata: {
    queryEnhanced: boolean;
    scored: boolean;
    profileEnhanced: boolean;
    outreachGenerated: boolean;
    processingTime: number;
    confidence: number;
  };
}

export class AIIntelligenceService {
  private queryProcessor: AIQueryProcessor;
  private candidateScorer: AICandidateScorer;
  private profileEnhancer: AIProfileEnhancer;
  private config: AIIntelligenceConfig;

  constructor(config: AIIntelligenceConfig) {
    this.config = config;
    
    if (config.openaiApiKey) {
      this.queryProcessor = new AIQueryProcessor(config.openaiApiKey);
      this.candidateScorer = new AICandidateScorer(config.openaiApiKey);
      this.profileEnhancer = new AIProfileEnhancer(config.openaiApiKey);
    }
  }

  async enhanceSearchQuery(query: string): Promise<EnhancedQuery | null> {
    if (!this.config.enableQueryEnhancement || !this.queryProcessor) {
      return null;
    }

    try {
      console.log('🤖 Enhancing search query with AI...');
      const enhanced = await this.queryProcessor.enhanceQuery(query);
      console.log('✅ Query enhancement completed:', enhanced.interpretation);
      return enhanced;
    } catch (error) {
      console.error('❌ Query enhancement failed:', error);
      return null;
    }
  }

  async processCandidate(
    candidate: any, 
    searchQuery: any, 
    jobContext?: any
  ): Promise<AIProcessedCandidate> {
    const startTime = Date.now();
    const metadata = {
      queryEnhanced: false,
      scored: false,
      profileEnhanced: false,
      outreachGenerated: false,
      processingTime: 0,
      confidence: 0
    };

    let result: AIProcessedCandidate = {
      originalCandidate: candidate,
      processingMetadata: metadata
    };

    try {
      // AI Scoring
      if (this.config.enableCandidateScoring && this.candidateScorer) {
        try {
          console.log(`🔍 AI scoring candidate: ${candidate.name}`);
          result.aiScoring = await this.candidateScorer.scoreCandidate(candidate, searchQuery);
          metadata.scored = true;
          metadata.confidence += 30;
          console.log(`✅ AI scoring completed: ${result.aiScoring.tier} tier (${result.aiScoring.overallScore}%)`);
        } catch (error) {
          console.error(`❌ AI scoring failed for ${candidate.name}:`, error);
        }
      }

      // Profile Enhancement
      if (this.config.enableProfileEnhancement && this.profileEnhancer) {
        try {
          console.log(`🎯 Enhancing profile: ${candidate.name}`);
          result.enhancedProfile = await this.profileEnhancer.enhanceProfile(candidate);
          metadata.profileEnhanced = true;
          metadata.confidence += 25;
          console.log(`✅ Profile enhancement completed`);
        } catch (error) {
          console.error(`❌ Profile enhancement failed for ${candidate.name}:`, error);
        }
      }

      // Outreach Generation
      if (this.config.enableOutreachGeneration && this.profileEnhancer && result.enhancedProfile && jobContext) {
        try {
          console.log(`📧 Generating outreach for: ${candidate.name}`);
          result.personalizedOutreach = await this.profileEnhancer.generateOutreachMessage(
            candidate, 
            result.enhancedProfile, 
            jobContext
          );
          metadata.outreachGenerated = true;
          metadata.confidence += 15;
          console.log(`✅ Outreach generation completed`);
        } catch (error) {
          console.error(`❌ Outreach generation failed for ${candidate.name}:`, error);
        }
      }

    } catch (error) {
      console.error(`❌ AI processing failed for ${candidate.name}:`, error);
    }

    metadata.processingTime = Date.now() - startTime;
    result.processingMetadata = metadata;

    return result;
  }

  async processCandidateBatch(
    candidates: any[], 
    searchQuery: any, 
    jobContext?: any,
    batchSize: number = 5
  ): Promise<AIProcessedCandidate[]> {
    console.log(`🚀 Processing ${candidates.length} candidates with AI intelligence (batch size: ${batchSize})`);
    
    const results: AIProcessedCandidate[] = [];
    
    for (let i = 0; i < candidates.length; i += batchSize) {
      const batch = candidates.slice(i, i + batchSize);
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(candidates.length / batchSize)}`);
      
      const batchPromises = batch.map(candidate => 
        this.processCandidate(candidate, searchQuery, jobContext)
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < candidates.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`✅ AI processing completed for ${results.length} candidates`);
    return results;
  }

  getProcessingStats(results: AIProcessedCandidate[]) {
    const stats = {
      totalProcessed: results.length,
      scored: results.filter(r => r.processingMetadata.scored).length,
      profileEnhanced: results.filter(r => r.processingMetadata.profileEnhanced).length,
      outreachGenerated: results.filter(r => r.processingMetadata.outreachGenerated).length,
      averageConfidence: results.reduce((sum, r) => sum + r.processingMetadata.confidence, 0) / results.length,
      averageProcessingTime: results.reduce((sum, r) => sum + r.processingMetadata.processingTime, 0) / results.length,
      tierDistribution: {
        A: results.filter(r => r.aiScoring?.tier === 'A').length,
        B: results.filter(r => r.aiScoring?.tier === 'B').length,
        C: results.filter(r => r.aiScoring?.tier === 'C').length,
        D: results.filter(r => r.aiScoring?.tier === 'D').length
      }
    };

    return stats;
  }
}
