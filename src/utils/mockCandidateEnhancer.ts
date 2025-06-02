
import { EnhancedCandidate, CandidateEducation, CandidateExperience, CandidateAchievement, RiskFactor, CandidateSource } from '../types/candidate';

const mockEducationOptions: CandidateEducation[] = [
  {
    institution: "Stanford University",
    degree: "MS Computer Science",
    field: "Machine Learning",
    year: "2019-2021",
    verified: true
  },
  {
    institution: "MIT",
    degree: "BS Computer Science",
    field: "Software Engineering",
    year: "2015-2019",
    verified: true
  },
  {
    institution: "UC Berkeley",
    degree: "BS Electrical Engineering",
    field: "Computer Systems",
    year: "2016-2020",
    verified: false
  }
];

const mockExperienceOptions: CandidateExperience[] = [
  {
    company: "Google",
    title: "Senior Software Engineer",
    duration: "2 years 3 months",
    startDate: "2022-01",
    current: true,
    description: "Leading development of ML infrastructure for Google Search",
    logo: "https://logo.clearbit.com/google.com"
  },
  {
    company: "Meta",
    title: "Software Engineer",
    duration: "1 year 8 months",
    startDate: "2020-05",
    endDate: "2021-12",
    description: "Built recommendation systems for Facebook Feed",
    logo: "https://logo.clearbit.com/meta.com"
  },
  {
    company: "Microsoft",
    title: "Software Development Engineer",
    duration: "2 years",
    startDate: "2019-01",
    endDate: "2021-01",
    description: "Developed cloud infrastructure for Azure services",
    logo: "https://logo.clearbit.com/microsoft.com"
  }
];

const mockAchievements: CandidateAchievement[] = [
  {
    type: "project",
    title: "TensorFlow Contributor",
    description: "Major contributor to TensorFlow core library with 50+ merged PRs",
    url: "https://github.com/tensorflow/tensorflow",
    date: "2023",
    verified: true
  },
  {
    type: "award",
    title: "Best Paper Award",
    description: "NeurIPS 2022 for work on distributed training optimization",
    date: "2022",
    verified: true
  },
  {
    type: "certification",
    title: "AWS Solutions Architect",
    description: "Professional level certification for cloud architecture",
    date: "2023",
    verified: false
  }
];

const mockRiskFactors: RiskFactor[] = [
  {
    type: "low",
    reason: "Frequent job changes",
    impact: "Has changed jobs 3 times in last 5 years",
    mitigation: "Career progression is consistent and strategic"
  },
  {
    type: "medium",
    reason: "Limited team leadership experience",
    impact: "Most experience is individual contributor roles",
    mitigation: "Strong technical skills could translate to tech lead role"
  }
];

const generateCandidateSources = (candidate: any): CandidateSource[] => {
  const sources: CandidateSource[] = [];
  
  if (candidate.github_username) {
    sources.push({
      platform: "github",
      url: `https://github.com/${candidate.github_username}`,
      verified: true,
      last_updated: "2024-01-15",
      profile_completeness: 95
    });
  }
  
  if (candidate.linkedin_url) {
    sources.push({
      platform: "linkedin",
      url: candidate.linkedin_url,
      verified: true,
      last_updated: "2024-01-10",
      profile_completeness: 88
    });
  }
  
  sources.push({
    platform: "stackoverflow",
    url: "https://stackoverflow.com/users/12345",
    verified: false,
    last_updated: "2023-12-20",
    profile_completeness: 60
  });
  
  return sources;
};

export const enhanceCandidateData = (baseCandidate: any): EnhancedCandidate => {
  // Generate AI summaries
  const skills = baseCandidate.skills || ['JavaScript', 'React', 'Node.js'];
  const aiSummary = `Experienced ${baseCandidate.title || 'Software Engineer'} with ${baseCandidate.experience_years || 3}+ years in tech. Strong background in ${skills.slice(0, 2).join(' and ')}, with proven ability to deliver scalable solutions.`;
  
  const suitabilitySummary = `Excellent fit for senior engineering roles. Demonstrated expertise in ${skills[0] || 'software development'} with strong open-source contributions and collaborative work style.`;

  // Calculate enhanced scores
  const baseScore = baseCandidate.overall_score || 70;
  const technicalScore = Math.min(100, baseScore + Math.random() * 15);
  const experienceScore = Math.min(100, (baseCandidate.experience_years || 3) * 12 + Math.random() * 20);
  const culturalFitScore = Math.min(100, 65 + Math.random() * 30);
  const riskScore = Math.max(0, 25 - Math.random() * 15);

  // Select random education and experience
  const education = [mockEducationOptions[Math.floor(Math.random() * mockEducationOptions.length)]];
  const workExperience = mockExperienceOptions.slice(0, 2 + Math.floor(Math.random() * 2));
  
  // Generate achievements
  const achievements = mockAchievements.slice(0, 1 + Math.floor(Math.random() * 3));
  
  // Generate risk factors based on risk score
  const riskFactors = riskScore > 20 ? [mockRiskFactors[Math.floor(Math.random() * mockRiskFactors.length)]] : [];
  const riskLevel = riskScore > 30 ? 'high' : riskScore > 15 ? 'medium' : 'low';

  return {
    ...baseCandidate,
    ai_summary: aiSummary,
    suitability_summary: suitabilitySummary,
    
    // Company info
    company: workExperience[0]?.company || "Google",
    company_logo: workExperience[0]?.logo || "https://logo.clearbit.com/google.com",
    company_size: "Large (10,000+ employees)",
    
    // Enhanced experience
    total_experience: `${baseCandidate.experience_years || 3} years`,
    education,
    work_experience: workExperience,
    
    // Achievements and contributions
    achievements,
    contributions_count: 50 + Math.floor(Math.random() * 200),
    
    // Enhanced scoring
    technical_score: Math.round(technicalScore),
    experience_score: Math.round(experienceScore),
    cultural_fit_score: Math.round(culturalFitScore),
    risk_score: Math.round(riskScore),
    
    // Risk assessment
    risk_factors: riskFactors,
    risk_level: riskLevel as 'low' | 'medium' | 'high',
    
    // Source information
    candidate_sources: generateCandidateSources(baseCandidate),
    data_freshness: Math.round(75 + Math.random() * 25),
    profile_completeness: Math.round(80 + Math.random() * 20),
    
    // Metadata
    verified: Math.random() > 0.4,
  };
};

export const enhanceCandidatesBatch = (candidates: any[]): EnhancedCandidate[] => {
  return candidates.map(candidate => enhanceCandidateData(candidate));
};
