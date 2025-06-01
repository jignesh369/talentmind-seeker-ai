
import React from 'react';
import { MapPin, Mail, Star } from 'lucide-react';
import { Candidate } from '../hooks/useCandidates';
import { calculateEmailConfidence } from '../utils/emailConfidence';
import { useToast } from '../hooks/use-toast';

interface ModernCandidateCardProps {
  candidate: Candidate;
  onContact?: (candidate: Candidate) => void;
  onView?: (candidate: Candidate) => void;
}

export const ModernCandidateCard: React.FC<ModernCandidateCardProps> = ({ 
  candidate, 
  onContact,
  onView 
}) => {
  const { toast } = useToast();
  const skills = candidate.skills || [];
  const overallScore = candidate.overall_score || 0;
  const emailConfidence = candidate.email ? calculateEmailConfidence(candidate.email, 'profile', candidate) : null;
  const isHighConfidenceEmail = emailConfidence && emailConfidence.score >= 80;

  const handleContactClick = () => {
    if (candidate.email && isHighConfidenceEmail) {
      window.location.href = `mailto:${candidate.email}`;
      onContact?.(candidate);
    } else {
      toast({
        title: "Contact not available",
        description: "No verified email address available",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-6 hover:border-gray-200 hover:shadow-sm transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-4">
          <img
            src={candidate.avatar_url || '/placeholder.svg'}
            alt={candidate.name}
            className="w-12 h-12 rounded-full object-cover border border-gray-100"
          />
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">{candidate.name}</h3>
            <p className="text-gray-600">{candidate.title || 'Developer'}</p>
            {candidate.location && (
              <div className="flex items-center text-gray-500 text-sm mt-1">
                <MapPin className="w-3 h-3 mr-1" />
                <span>{candidate.location}</span>
              </div>
            )}
          </div>
        </div>
        
        {overallScore > 0 && (
          <div className="text-right">
            <div className="flex items-center">
              <Star className="w-4 h-4 text-gray-400 mr-1" />
              <span className="font-medium text-gray-900">{overallScore}</span>
            </div>
            <span className="text-xs text-gray-500">Score</span>
          </div>
        )}
      </div>

      {/* Skills */}
      {skills.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {skills.slice(0, 6).map((skill, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-gray-50 text-gray-700 text-sm rounded-md border border-gray-100"
              >
                {skill}
              </span>
            ))}
            {skills.length > 6 && (
              <span className="px-3 py-1 bg-gray-50 text-gray-500 text-sm rounded-md border border-gray-100">
                +{skills.length - 6}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Summary */}
      {candidate.summary && (
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {candidate.summary}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-50">
        <button
          onClick={() => onView?.(candidate)}
          className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
        >
          View Profile
        </button>
        
        <button
          onClick={handleContactClick}
          disabled={!candidate.email || !isHighConfidenceEmail}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            candidate.email && isHighConfidenceEmail
              ? 'bg-gray-900 text-white hover:bg-gray-800' 
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Contact</span>
        </button>
      </div>
    </div>
  );
};
