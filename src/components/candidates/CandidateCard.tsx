import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { MapPin, Calendar, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface CandidateCardProps {
  candidate: any;
}

export const CandidateCard = ({ candidate }: CandidateCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);

  const handleAddToDraft = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to add candidates to drafts",
        variant: "destructive",
      });
      return;
    }

    setIsDrafting(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: "Candidate added to drafts",
        description: `${candidate.name} has been added to your drafts.`,
      });
    } catch (error) {
      toast({
        title: "Failed to add candidate to drafts",
        description: "There was an error adding this candidate to your drafts.",
        variant: "destructive",
      });
    } finally {
      setIsDrafting(false);
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200 border-slate-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-4">
            {/* Avatar */}
            <Avatar className="w-16 h-16">
              <AvatarImage src={candidate.avatar_url} alt={candidate.name} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg font-semibold">
                {candidate.name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">
                    {candidate.name || 'Unknown Name'}
                  </h3>
                  <p className="text-slate-600 mb-2">{candidate.title || 'No title available'}</p>
                  
                  {/* Enhanced match explanation */}
                  {candidate.matchExplanation && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-green-600 font-medium">Match:</span>
                      <span className="text-xs text-slate-600">{candidate.matchExplanation}</span>
                      {candidate.relevanceScore && (
                        <Badge variant="outline" className="text-xs">
                          Score: {Math.round(candidate.relevanceScore)}
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
                    {candidate.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{candidate.location}</span>
                      </div>
                    )}
                    {candidate.experience_years !== undefined && candidate.experience_years !== null && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{candidate.experience_years} years exp</span>
                      </div>
                    )}
                    {candidate.last_active && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>Active {formatDistanceToNow(new Date(candidate.last_active), { addSuffix: true })}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Skills */}
              {candidate.skills && candidate.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {candidate.skills.slice(0, isExpanded ? candidate.skills.length : 8).map((skill: string, index: number) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {candidate.skills.length > 8 && !isExpanded && (
                    <button
                      onClick={() => setIsExpanded(true)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      +{candidate.skills.length - 8} more
                    </button>
                  )}
                </div>
              )}

              {/* Summary */}
              {candidate.summary && (
                <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                  {candidate.summary}
                </p>
              )}
            </div>
          </div>

          {/* Score indicators */}
          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <div className="text-lg font-bold text-slate-900">
                {candidate.overall_score || 0}
              </div>
              <div className="text-xs text-slate-500">Overall Score</div>
            </div>
            
            {/* Search strategy indicator */}
            {candidate.search_strategy && (
              <Badge variant="outline" className="text-xs">
                {candidate.search_strategy.replace(/_/g, ' ')}
              </Badge>
            )}
          </div>
        </div>

        {/* Score metrics */}
        {isExpanded && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-xs font-medium text-slate-700">Skill Match</div>
              <div className="text-sm text-slate-600">{candidate.skill_match || 0}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-700">Experience</div>
              <div className="text-sm text-slate-600">{candidate.experience || 0}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-700">Reputation</div>
              <div className="text-sm text-slate-600">{candidate.reputation || 0}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-700">Freshness</div>
              <div className="text-sm text-slate-600">{candidate.freshness || 0}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-700">Social Proof</div>
              <div className="text-sm text-slate-600">{candidate.social_proof || 0}</div>
            </div>
          </div>
        )}

        {/* Expanded details */}
        {isExpanded && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Additional Details</h4>
            <div className="text-sm text-slate-600 space-y-2">
              <div>
                <strong>Email:</strong> {candidate.email || 'Not available'}
              </div>
              <div>
                <strong>Github Username:</strong> {candidate.github_username || 'Not available'}
              </div>
              <div>
                <strong>Platform:</strong> {candidate.platform || 'Unknown'}
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-end space-x-2">
          <Button variant="outline" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? 'Show Less' : 'Show More'}
          </Button>
          <Button variant="primary" size="sm" disabled={isDrafting} onClick={handleAddToDraft}>
            {isDrafting ? 'Adding...' : 'Add to Draft'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
