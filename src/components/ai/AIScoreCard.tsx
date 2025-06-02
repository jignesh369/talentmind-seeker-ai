
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, Star, TrendingUp, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface AIScoreCardProps {
  candidate: any;
  className?: string;
}

export const AIScoreCard = ({ candidate, className = "" }: AIScoreCardProps) => {
  if (!candidate.ai_processed) {
    return null;
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'A': return 'text-green-600 bg-green-50';
      case 'B': return 'text-blue-600 bg-blue-50';
      case 'C': return 'text-yellow-600 bg-yellow-50';
      case 'D': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className={`border-l-4 border-l-indigo-500 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-indigo-600" />
            AI Analysis
          </div>
          {candidate.ai_tier && (
            <Badge className={getTierColor(candidate.ai_tier)}>
              Tier {candidate.ai_tier}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Score */}
        {candidate.ai_overall_score && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall AI Score</span>
              <span className={`text-lg font-bold ${getScoreColor(candidate.ai_overall_score)}`}>
                {candidate.ai_overall_score}%
              </span>
            </div>
            <Progress value={candidate.ai_overall_score} className="h-2" />
          </div>
        )}

        {/* Score Breakdown */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {candidate.ai_technical_fit && (
            <div>
              <span className="text-gray-600">Technical Fit</span>
              <div className={`font-medium ${getScoreColor(candidate.ai_technical_fit)}`}>
                {candidate.ai_technical_fit}%
              </div>
            </div>
          )}
          {candidate.ai_experience_level && (
            <div>
              <span className="text-gray-600">Experience Level</span>
              <div className={`font-medium ${getScoreColor(candidate.ai_experience_level)}`}>
                {candidate.ai_experience_level}%
              </div>
            </div>
          )}
          {candidate.ai_risk_assessment && (
            <div>
              <span className="text-gray-600">Risk Assessment</span>
              <div className={`font-medium ${getScoreColor(candidate.ai_risk_assessment)}`}>
                {candidate.ai_risk_assessment}%
              </div>
            </div>
          )}
          {candidate.ai_confidence && (
            <div>
              <span className="text-gray-600">AI Confidence</span>
              <div className="font-medium text-purple-600">
                {candidate.ai_confidence}%
              </div>
            </div>
          )}
        </div>

        {/* AI Reasoning */}
        {candidate.ai_reasoning && (
          <div>
            <span className="text-sm font-medium text-gray-600 mb-1 block">AI Assessment</span>
            <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
              {candidate.ai_reasoning}
            </p>
          </div>
        )}

        {/* Strengths */}
        {candidate.ai_strengths && candidate.ai_strengths.length > 0 && (
          <div>
            <span className="text-sm font-medium text-gray-600 mb-1 block">Key Strengths</span>
            <div className="flex flex-wrap gap-1">
              {candidate.ai_strengths.slice(0, 4).map((strength: string, index: number) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {strength}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Concerns */}
        {candidate.ai_concerns && candidate.ai_concerns.length > 0 && (
          <div>
            <span className="text-sm font-medium text-gray-600 mb-1 block">Areas of Concern</span>
            <div className="flex flex-wrap gap-1">
              {candidate.ai_concerns.slice(0, 3).map((concern: string, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {concern}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Enhanced Profile Summary */}
        {candidate.enhanced_summary && (
          <div>
            <span className="text-sm font-medium text-gray-600 mb-1 block">Enhanced Profile</span>
            <p className="text-sm text-gray-700 bg-blue-50 p-2 rounded border-l-2 border-blue-200">
              {candidate.enhanced_summary.length > 150 
                ? `${candidate.enhanced_summary.substring(0, 150)}...` 
                : candidate.enhanced_summary}
            </p>
          </div>
        )}

        {/* Processing Info */}
        <div className="text-xs text-gray-500 pt-2 border-t">
          AI processed in {candidate.processing_time}ms • Confidence: {candidate.ai_confidence}%
        </div>
      </CardContent>
    </Card>
  );
};
