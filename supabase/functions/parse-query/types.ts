
export interface ParsedCriteria {
  skills: string[];
  semantic_skills: string[];
  contextual_skills: string[];
  location?: string;
  experience_min?: number;
  experience_max?: number;
  job_titles: string[];
  keywords: string[];
  semantic_keywords: string[];
  contextual_keywords: string[];
  industries: string[];
  company_types: string[];
  role_types: string[];
  seniority_level: string;
  must_have_skills: string[];
  nice_to_have_skills: string[];
  search_intent: string;
  confidence_score: number;
  role_cluster: string[];
  technology_stack: string[];
}
