
export interface EmailConfidence {
  score: number;
  level: 'high' | 'medium' | 'low';
  type: 'personal' | 'work' | 'generic' | 'mailing_list';
  verified: boolean;
  source: string;
}

export interface EnrichmentRequest {
  candidateId: string;
  candidateName: string;
  existingData: {
    email?: string;
    location?: string;
    title?: string;
    skills: string[];
  };
  enrichmentSources: ('google' | 'linkedin' | 'apollo')[];
  priority: 'low' | 'medium' | 'high';
}

export interface EnrichmentResult {
  candidateId: string;
  newData: {
    linkedinUrl?: string;
    additionalEmails?: string[];
    phoneNumber?: string;
    currentCompany?: string;
    socialProfiles?: { platform: string; url: string }[];
  };
  confidence: number;
  sources: string[];
  enrichedAt: string;
}

export interface DataQualityMetrics {
  completeness: number;
  freshness: number;
  reliability: number;
  lastEnriched?: string;
  apolloLastUsed?: string;
}
