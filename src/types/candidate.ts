
export interface CandidateEducation {
  institution: string;
  degree: string;
  field: string;
  year: string;
  verified?: boolean;
}

export interface CandidateExperience {
  company: string;
  title: string;
  duration: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  current?: boolean;
  logo?: string;
}

export interface CandidateAchievement {
  type: 'project' | 'contribution' | 'award' | 'certification';
  title: string;
  description: string;
  url?: string;
  date?: string;
  verified?: boolean;
}

export interface RiskFactor {
  type: 'low' | 'medium' | 'high';
  reason: string;
  impact: string;
  mitigation?: string;
}

export interface CandidateSource {
  platform: string;
  url: string;
  verified: boolean;
  last_updated?: string;
  profile_completeness?: number;
}

export interface EnhancedCandidate {
  id: string;
  name: string;
  title?: string;
  email?: string;
  location?: string;
  avatar_url?: string;
  summary?: string;
  ai_summary?: string;
  suitability_summary?: string;
  
  // Company Information
  company?: string;
  company_logo?: string;
  company_size?: string;
  
  // Experience & Education
  experience_years?: number;
  total_experience?: string;
  education?: CandidateEducation[];
  work_experience?: CandidateExperience[];
  
  // Skills & Achievements
  skills?: string[];
  achievements?: CandidateAchievement[];
  contributions_count?: number;
  
  // Scoring
  overall_score?: number;
  technical_score?: number;
  experience_score?: number;
  cultural_fit_score?: number;
  risk_score?: number;
  
  // Risk Assessment
  risk_factors?: RiskFactor[];
  risk_level?: 'low' | 'medium' | 'high';
  
  // Source Information
  candidate_sources?: CandidateSource[];
  data_freshness?: number;
  profile_completeness?: number;
  
  // Platform Data
  github_username?: string;
  linkedin_url?: string;
  stackoverflow_id?: string;
  
  // Metadata
  last_active?: string;
  verified?: boolean;
}
