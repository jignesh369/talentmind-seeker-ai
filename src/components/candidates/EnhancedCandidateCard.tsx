
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Star, GitBranch, Brain, Rocket, MapPin, Clock } from 'lucide-react';

interface EnhancedCandidateCardProps {
  candidate: any;
  searchQuery?: string;
}

export const EnhancedCandidateCard = ({ candidate, searchQuery }: EnhancedCandidateCardProps) => {
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'A': return 'bg-green-100 text-green-800 border-green-200';
      case 'B': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'C': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'D': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const enhancedScore = candidate.enhanced_overall_score || candidate.ai_overall_score || candidate.overall_score || 0;
  const tier = candidate.enhanced_tier || candidate.ai_tier || 'C';

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-slate-900">{candidate.name}</h3>
              <Badge className={getTierColor(tier)}>
                Tier {tier}
              </Badge>
              <span className={`text-sm font-medium ${getScoreColor(enhancedScore)}`}>
                {enhancedScore}%
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
              {candidate.title && <span>{candidate.title}</span>}
              {candidate.location && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {candidate.location}
                  </span>
                </>
              )}
              {candidate.experience_years && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {candidate.experience_years}y exp
                  </span>
                </>
              )}
            </div>

            {candidate.summary && (
              <p className="text-sm text-slate-700 line-clamp-2 mb-3">
                {candidate.summary}
              </p>
            )}
          </div>
          
          {candidate.avatar_url && (
            <img
              src={candidate.avatar_url}
              alt={candidate.name}
              className="w-12 h-12 rounded-full object-cover"
            />
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Enhanced Scoring Insights */}
        {candidate.enhanced_processed && (
          <div className="space-y-3 mb-4">
            {/* Specialized Scores */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {candidate.open_source_score > 0 && (
                <div className="flex items-center gap-1">
                  <GitBranch className="h-3 w-3 text-purple-500" />
                  <span className={getScoreColor(candidate.open_source_score)}>
                    Open Source {candidate.open_source_score}%
                  </span>
                </div>
              )}
              {candidate.ai_expertise_score > 0 && (
                <div className="flex items-center gap-1">
                  <Brain className="h-3 w-3 text-blue-500" />
                  <span className={getScoreColor(candidate.ai_expertise_score)}>
                    AI Expertise {candidate.ai_expertise_score}%
                  </span>
                </div>
              )}
              {candidate.startup_fit_score > 0 && (
                <div className="flex items-center gap-1">
                  <Rocket className="h-3 w-3 text-orange-500" />
                  <span className={getScoreColor(candidate.startup_fit_score)}>
                    Startup Fit {candidate.startup_fit_score}%
                  </span>
                </div>
              )}
              {candidate.location_match_score > 0 && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-green-500" />
                  <span className={getScoreColor(candidate.location_match_score)}>
                    Location {candidate.location_match_score}%
                  </span>
                </div>
              )}
            </div>

            {/* AI Insights */}
            {candidate.enhanced_strengths && candidate.enhanced_strengths.length > 0 && (
              <div>
                <h5 className="text-xs font-medium text-slate-700 mb-1">AI Insights:</h5>
                <div className="flex flex-wrap gap-1">
                  {candidate.enhanced_strengths.slice(0, 3).map((strength: string, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs py-0 px-2">
                      {strength}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Open Source Details */}
            {candidate.open_source_level && candidate.open_source_level !== 'none' && (
              <div>
                <h5 className="text-xs font-medium text-slate-700 mb-1">Open Source:</h5>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs capitalize">
                    {candidate.open_source_level}
                  </Badge>
                  {candidate.open_source_evidence && candidate.open_source_evidence.length > 0 && (
                    <span className="text-xs text-slate-600">
                      {candidate.open_source_evidence[0]}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* AI Specializations */}
            {candidate.ai_specializations && candidate.ai_specializations.length > 0 && (
              <div>
                <h5 className="text-xs font-medium text-slate-700 mb-1">AI Specializations:</h5>
                <div className="flex flex-wrap gap-1">
                  {candidate.ai_specializations.slice(0, 3).map((spec: string, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs py-0 px-2 bg-blue-50">
                      {spec}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Traditional Skills */}
        {candidate.skills && candidate.skills.length > 0 && (
          <div className="mb-4">
            <h5 className="text-xs font-medium text-slate-700 mb-2">Skills:</h5>
            <div className="flex flex-wrap gap-1">
              {candidate.skills.slice(0, 6).map((skill: string, index: number) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {candidate.skills.length > 6 && (
                <Badge variant="outline" className="text-xs">
                  +{candidate.skills.length - 6} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Platform Links */}
        <div className="flex gap-2 text-xs">
          {candidate.github_username && (
            <a
              href={`https://github.com/${candidate.github_username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800"
            >
              GitHub
            </a>
          )}
          {candidate.linkedin_url && (
            <a
              href={candidate.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800"
            >
              LinkedIn
            </a>
          )}
          {candidate.email && (
            <a
              href={`mailto:${candidate.email}`}
              className="text-blue-600 hover:text-blue-800"
            >
              Email
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
