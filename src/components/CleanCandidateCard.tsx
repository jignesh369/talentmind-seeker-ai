
import React, { useState } from 'react';
import { 
  MapPin, Star, Mail, ExternalLink, Eye, Heart
} from 'lucide-react';
import { Candidate } from '../hooks/useCandidates';
import { calculateEmailConfidence } from '../utils/emailConfidence';
import { useToast } from '../hooks/use-toast';

interface CleanCandidateCardProps {
  candidate: Candidate;
  onContact?: (candidate: Candidate) => void;
  onSave?: (candidate: Candidate) => void;
  onView?: (candidate: Candidate) => void;
}

export const CleanCandidateCard: React.FC<CleanCandidateCardProps> = ({ 
  candidate, 
  onContact,
  onSave,
  onView 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const { toast } = useToast();

  const skills = candidate.skills || [];
  const overallScore = candidate.overall_score || 0;
  const emailConfidence = candidate.email ? calculateEmailConfidence(candidate.email, 'profile', candidate) : null;
  const isHighConfidenceEmail = emailConfidence && emailConfidence.score >= 80;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'from-green-500 to-emerald-600';
    if (score >= 60) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-pink-600';
  };

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

  const topSkills = skills.slice(0, 3);

  return (
    <div 
      className={`bg-white rounded-xl border border-slate-200 overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-blue-300 ${
        isHovered ? 'scale-102' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <img
              src={candidate.avatar_url || '/placeholder.svg'}
              alt={candidate.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md"
            />
            <div>
              <h3 className="font-semibold text-slate-900 text-lg">{candidate.name}</h3>
              <p className="text-slate-600">{candidate.title || 'Developer'}</p>
            </div>
          </div>
          
          <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${getScoreColor(overallScore)} flex items-center justify-center text-white font-bold shadow-md`}>
            {overallScore}
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center text-slate-500 text-sm mb-4">
          <MapPin className="w-4 h-4 mr-1" />
          <span>{candidate.location || 'Remote'}</span>
        </div>

        {/* Skills */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {topSkills.map((skill, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full border border-blue-200"
              >
                {skill}
              </span>
            ))}
            {skills.length > 3 && (
              <span className="px-3 py-1 bg-slate-100 text-slate-600 text-sm rounded-full">
                +{skills.length - 3} more
              </span>
            )}
          </div>
        </div>

        {/* Summary */}
        <p className="text-slate-600 text-sm line-clamp-2 mb-4">
          {candidate.summary || 'Experienced developer with a passion for creating innovative solutions.'}
        </p>
      </div>

      {/* Actions */}
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onView?.(candidate)}
              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg transition-colors"
              title="View profile"
            >
              <Eye className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => onSave?.(candidate)}
              className="p-2 text-slate-500 hover:text-red-500 hover:bg-white rounded-lg transition-colors"
              title="Save candidate"
            >
              <Heart className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleContactClick}
            disabled={!candidate.email || !isHighConfidenceEmail}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-all font-medium ${
              candidate.email && isHighConfidenceEmail
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' 
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Contact</span>
          </button>
        </div>
      </div>
    </div>
  );
};
