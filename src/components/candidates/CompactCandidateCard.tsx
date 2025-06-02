
import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MapPin, 
  Github, 
  Linkedin, 
  Mail,
  ChevronDown,
  ChevronUp,
  Brain,
  Star
} from 'lucide-react';

interface CompactCandidateCardProps {
  candidate: any;
}

export const CompactCandidateCard = ({ candidate }: CompactCandidateCardProps) => {
  const [showDetails, setShowDetails] = useState(false);
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-blue-600 bg-blue-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const displayScore = candidate.ai_overall_score || candidate.overall_score || 0;
  const isAIEnhanced = candidate.ai_processed;

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <Avatar className="h-10 w-10">
              <AvatarImage src={candidate.avatar_url} />
              <AvatarFallback>
                {candidate.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate">{candidate.name}</h3>
              <p className="text-gray-600 text-sm truncate">{candidate.title}</p>
              {candidate.location && (
                <div className="flex items-center text-gray-500 text-xs mt-1">
                  <MapPin className="h-3 w-3 mr-1" />
                  {candidate.location}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`px-2 py-1 rounded-lg font-semibold text-sm ${getScoreColor(displayScore)}`}>
              {displayScore}%
            </div>
            {isAIEnhanced && (
              <Brain className="h-4 w-4 text-indigo-600" />
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Summary */}
        {(candidate.enhanced_summary || candidate.summary) && (
          <p className="text-sm text-gray-700 line-clamp-2">
            {candidate.enhanced_summary || candidate.summary}
          </p>
        )}

        {/* Top Skills */}
        {candidate.skills && candidate.skills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {candidate.skills.slice(0, 4).map((skill: string, index: number) => (
              <Badge key={index} variant="outline" className="text-xs">
                {skill}
              </Badge>
            ))}
            {candidate.skills.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{candidate.skills.length - 4}
              </Badge>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-3">
            {candidate.github_username && (
              <a
                href={`https://github.com/${candidate.github_username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-900"
              >
                <Github className="h-4 w-4" />
              </a>
            )}
            
            {candidate.linkedin_url && (
              <a
                href={candidate.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-900"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            )}
            
            {candidate.email && (
              <a
                href={`mailto:${candidate.email}`}
                className="text-gray-600 hover:text-gray-900"
              >
                <Mail className="h-4 w-4" />
              </a>
            )}
          </div>

          <div className="flex items-center gap-2">
            {candidate.email && (
              <Button size="sm" className="text-xs">
                Contact
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs"
            >
              {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Expanded Details */}
        {showDetails && (
          <div className="border-t pt-3 mt-3 space-y-3 text-sm">
            {/* AI Insights */}
            {isAIEnhanced && candidate.ai_strengths && (
              <div>
                <h4 className="font-medium text-gray-600 mb-1">AI-Identified Strengths</h4>
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

            {/* All Skills */}
            {candidate.skills && candidate.skills.length > 4 && (
              <div>
                <h4 className="font-medium text-gray-600 mb-1">All Skills</h4>
                <div className="flex flex-wrap gap-1">
                  {candidate.skills.map((skill: string, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Experience */}
            {candidate.experience_years && (
              <div className="text-gray-600">
                <strong>Experience:</strong> {candidate.experience_years} years
              </div>
            )}

            {/* Last Active */}
            {candidate.last_active && (
              <div className="text-gray-600">
                <strong>Last Active:</strong> {new Date(candidate.last_active).toLocaleDateString()}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
