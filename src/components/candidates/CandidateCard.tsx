
import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  MapPin, 
  Calendar, 
  Github, 
  Linkedin, 
  ExternalLink,
  Brain,
  Star,
  TrendingUp,
  Mail,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { AIScoreCard } from '../ai/AIScoreCard';

interface CandidateCardProps {
  candidate: any;
}

export const CandidateCard = ({ candidate }: CandidateCardProps) => {
  const [showAIDetails, setShowAIDetails] = useState(false);
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'A': return 'bg-green-100 text-green-800';
      case 'B': return 'bg-blue-100 text-blue-800';
      case 'C': return 'bg-yellow-100 text-yellow-800';
      case 'D': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Use AI score if available, otherwise fall back to original
  const displayScore = candidate.ai_overall_score || candidate.overall_score || 0;
  const isAIEnhanced = candidate.ai_processed;

  return (
    <Card className="h-full hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={candidate.avatar_url} />
              <AvatarFallback>
                {candidate.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-lg">{candidate.name}</h3>
              <p className="text-gray-600 text-sm">{candidate.title}</p>
              {candidate.location && (
                <div className="flex items-center text-gray-500 text-xs mt-1">
                  <MapPin className="h-3 w-3 mr-1" />
                  {candidate.location}
                </div>
              )}
            </div>
          </div>
          
          <div className="text-right space-y-1">
            <div className="flex items-center gap-2">
              <div className={`text-lg font-bold ${getScoreColor(displayScore)}`}>
                {displayScore}%
              </div>
              {isAIEnhanced && (
                <Brain className="h-4 w-4 text-indigo-600" title="AI Enhanced" />
              )}
            </div>
            
            {candidate.ai_tier && (
              <Badge className={`text-xs ${getTierColor(candidate.ai_tier)}`}>
                Tier {candidate.ai_tier}
              </Badge>
            )}
            
            {candidate.platform && (
              <div className="text-xs text-gray-500">
                via {candidate.platform}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Enhanced Summary or Original Summary */}
        {(candidate.enhanced_summary || candidate.summary) && (
          <div>
            <p className="text-sm text-gray-700 line-clamp-3">
              {candidate.enhanced_summary || candidate.summary}
            </p>
            {isAIEnhanced && candidate.enhanced_summary && (
              <div className="text-xs text-indigo-600 mt-1">
                ✨ AI-Enhanced Profile
              </div>
            )}
          </div>
        )}

        {/* Skills */}
        {candidate.skills && candidate.skills.length > 0 && (
          <div>
            <div className="flex flex-wrap gap-1">
              {candidate.skills.slice(0, 6).map((skill: string, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">
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

        {/* AI Strengths (if available) */}
        {candidate.ai_strengths && candidate.ai_strengths.length > 0 && (
          <div>
            <div className="text-sm font-medium text-gray-600 mb-1">AI-Identified Strengths</div>
            <div className="flex flex-wrap gap-1">
              {candidate.ai_strengths.slice(0, 3).map((strength: string, index: number) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  <Star className="h-3 w-3 mr-1" />
                  {strength}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Score Breakdown */}
        <div className="space-y-2">
          {isAIEnhanced && candidate.ai_technical_fit && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Technical Fit</span>
                <span className={`font-medium ${getScoreColor(candidate.ai_technical_fit)}`}>
                  {candidate.ai_technical_fit}%
                </span>
              </div>
              <Progress value={candidate.ai_technical_fit} className="h-1.5" />
            </div>
          )}
          
          {candidate.experience_years && (
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="h-4 w-4 mr-2" />
              {candidate.experience_years} years experience
            </div>
          )}
          
          {candidate.last_active && (
            <div className="text-xs text-gray-500">
              Last active: {new Date(candidate.last_active).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Links */}
        <div className="flex items-center space-x-4 pt-2">
          {candidate.github_username && (
            <a
              href={`https://github.com/${candidate.github_username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <Github className="h-4 w-4 mr-1" />
              <span className="text-sm">GitHub</span>
            </a>
          )}
          
          {candidate.linkedin_url && (
            <a
              href={candidate.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <Linkedin className="h-4 w-4 mr-1" />
              <span className="text-sm">LinkedIn</span>
            </a>
          )}
          
          {candidate.email && (
            <a
              href={`mailto:${candidate.email}`}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <Mail className="h-4 w-4 mr-1" />
              <span className="text-sm">Email</span>
            </a>
          )}
        </div>

        {/* AI Details Toggle */}
        {isAIEnhanced && (
          <div className="pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAIDetails(!showAIDetails)}
              className="w-full flex items-center justify-center gap-2"
            >
              <Brain className="h-4 w-4" />
              {showAIDetails ? 'Hide' : 'Show'} AI Analysis
              {showAIDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            
            {showAIDetails && (
              <div className="mt-3">
                <AIScoreCard candidate={candidate} />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
