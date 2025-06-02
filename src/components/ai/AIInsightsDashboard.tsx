
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, Target, TrendingUp, AlertTriangle, Users } from 'lucide-react';
import { EnhancedQuery } from '@/services/ai/AIQueryProcessor';

interface AIInsightsDashboardProps {
  enhancedQuery?: EnhancedQuery | null;
  aiStats?: any;
  searchMetadata?: any;
  className?: string;
}

export const AIInsightsDashboard = ({ 
  enhancedQuery, 
  aiStats, 
  searchMetadata,
  className = "" 
}: AIInsightsDashboardProps) => {
  if (!enhancedQuery && !aiStats) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* AI Query Enhancement */}
      {enhancedQuery && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Brain className="h-5 w-5 text-blue-600" />
              AI Query Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Query Interpretation</span>
                <Badge variant="outline" className="text-xs">
                  {enhancedQuery.aiConfidence}% confidence
                </Badge>
              </div>
              <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                {enhancedQuery.interpretation}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-600">Search Strategy</span>
                <Badge variant="secondary" className="ml-2">
                  {enhancedQuery.searchStrategy}
                </Badge>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Role Level</span>
                <Badge variant="outline" className="ml-2">
                  {enhancedQuery.intent.roleLevel}
                </Badge>
              </div>
            </div>

            {enhancedQuery.expandedSkills.length > 0 && (
              <div>
                <span className="text-sm font-medium text-gray-600">Enhanced Skills</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {enhancedQuery.expandedSkills.slice(0, 8).map((skill, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {enhancedQuery.expandedSkills.length > 8 && (
                    <Badge variant="outline" className="text-xs">
                      +{enhancedQuery.expandedSkills.length - 8} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {enhancedQuery.intent.cultureFit.length > 0 && (
              <div>
                <span className="text-sm font-medium text-gray-600">Culture Fit</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {enhancedQuery.intent.cultureFit.map((fit, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {fit}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Processing Stats */}
      {aiStats && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-green-600" />
              AI Analysis Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {aiStats.totalProcessed}
                </div>
                <div className="text-xs text-gray-600">Total Processed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {aiStats.scored}
                </div>
                <div className="text-xs text-gray-600">AI Scored</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {aiStats.profileEnhanced}
                </div>
                <div className="text-xs text-gray-600">Enhanced</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {Math.round(aiStats.averageConfidence)}%
                </div>
                <div className="text-xs text-gray-600">Avg Confidence</div>
              </div>
            </div>

            {/* Tier Distribution */}
            {aiStats.tierDistribution && (
              <div>
                <span className="text-sm font-medium text-gray-600 mb-2 block">
                  Candidate Tier Distribution
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(aiStats.tierDistribution).map(([tier, count]) => (
                    <div key={tier} className="text-center">
                      <div className={`text-lg font-bold ${
                        tier === 'A' ? 'text-green-600' :
                        tier === 'B' ? 'text-blue-600' :
                        tier === 'C' ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {String(count)}
                      </div>
                      <div className="text-xs text-gray-600">Tier {tier}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Processing Performance</span>
                <span className="text-xs text-gray-500">
                  {Math.round(aiStats.averageProcessingTime)}ms avg
                </span>
              </div>
              <Progress 
                value={Math.min((aiStats.scored / aiStats.totalProcessed) * 100, 100)} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Metadata */}
      {searchMetadata?.aiEnhanced && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
              Search Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Sources Used:</span>
                <div className="font-medium">
                  {searchMetadata.sourcesUsed?.join(', ') || 'Multiple'}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Processing Time:</span>
                <div className="font-medium">
                  {searchMetadata.processingTime || 'N/A'}ms
                </div>
              </div>
              <div>
                <span className="text-gray-600">Search Confidence:</span>
                <div className="font-medium">
                  {searchMetadata.confidence}%
                </div>
              </div>
              <div>
                <span className="text-gray-600">Candidates Found:</span>
                <div className="font-medium">
                  {searchMetadata.candidatesProcessed}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
