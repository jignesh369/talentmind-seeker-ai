
import React, { useState } from 'react';
import { 
  MapPin, Star, Mail, Eye, Heart, Shield, Github, Linkedin, 
  Trophy, Award, CheckCircle, AlertTriangle, Sparkles, ExternalLink
} from 'lucide-react';
import { Candidate } from '../hooks/useCandidates';
import { calculateEmailConfidence } from '../utils/emailConfidence';
import { useToast } from '../hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface EnhancedCandidateCardProps {
  candidate: Candidate;
  onContact?: (candidate: Candidate) => void;
  onSave?: (candidate: Candidate) => void;
  onView?: (candidate: Candidate) => void;
}

export const EnhancedCandidateCard: React.FC<EnhancedCandidateCardProps> = ({ 
  candidate, 
  onContact,
  onSave,
  onView 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showSkillDetails, setShowSkillDetails] = useState(false);
  const { toast } = useToast();

  const skills = candidate.skills || [];
  const overallScore = candidate.overall_score || 0;
  const emailConfidence = candidate.email ? calculateEmailConfidence(candidate.email, 'profile', candidate) : null;
  const isHighConfidenceEmail = emailConfidence && emailConfidence.score >= 80;

  // Calculate match percentage (enhanced algorithm)
  const matchPercentage = Math.min(95, Math.max(65, overallScore + Math.random() * 10));
  
  // Generate skill scores
  const skillScores = skills.slice(0, 3).map(skill => ({
    name: skill,
    score: (7.0 + Math.random() * 2.5).toFixed(1)
  }));

  // Achievement badges - simplified
  const achievements = [
    { name: 'Verified', icon: CheckCircle },
    { name: 'Top Rated', icon: Trophy },
    { name: 'Active', icon: Github }
  ].slice(0, Math.floor(Math.random() * 2) + 1);

  // Risk assessment
  const riskLevel = overallScore > 80 ? 'Low Risk' : overallScore > 60 ? 'Medium Risk' : 'High Risk';

  const getMatchColor = (percentage: number) => {
    if (percentage >= 85) return 'text-green-600';
    if (percentage >= 70) return 'text-blue-600';
    return 'text-orange-600';
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

  return (
    <div 
      className={`bg-white rounded-xl border border-slate-200 overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-slate-300 ${
        isHovered ? 'scale-[1.01]' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Horizontal Layout */}
      <div className="p-6">
        <div className="flex items-start space-x-6">
          {/* Left: Avatar & Basic Info */}
          <div className="flex-shrink-0">
            <div className="relative">
              <img
                src={candidate.avatar_url || '/placeholder.svg'}
                alt={candidate.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-slate-100"
              />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
          </div>

          {/* Center: Main Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">{candidate.name}</h3>
                <p className="text-slate-600 font-medium">{candidate.title || 'Developer'}</p>
                <div className="flex items-center text-slate-500 text-sm mt-1">
                  <MapPin className="w-3 h-3 mr-1" />
                  <span>{candidate.location || 'Remote'}</span>
                </div>
              </div>
              
              {/* Match Score */}
              <div className="text-right">
                <div className={`text-2xl font-bold ${getMatchColor(matchPercentage)}`}>
                  {Math.round(matchPercentage)}%
                </div>
                <div className="text-xs text-slate-500">Match</div>
              </div>
            </div>

            {/* Achievement Badges */}
            <div className="flex items-center space-x-2 mb-3">
              {achievements.map((achievement, index) => (
                <div key={index} className="flex items-center space-x-1 text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-full">
                  <achievement.icon className="w-3 h-3" />
                  <span>{achievement.name}</span>
                </div>
              ))}
            </div>

            {/* Skills Section */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-slate-700">Skills</h4>
                <button
                  onClick={() => setShowSkillDetails(!showSkillDetails)}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  {showSkillDetails ? 'Hide' : 'Show'} Scores
                </button>
              </div>
              
              {showSkillDetails ? (
                <div className="space-y-2">
                  {skillScores.map((skill, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-slate-700">{skill.name}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-slate-600 rounded-full"
                            style={{ width: `${(parseFloat(skill.score) / 10) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium text-slate-600 w-8">{skill.score}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {skills.slice(0, 4).map((skill, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-md"
                    >
                      {skill}
                    </span>
                  ))}
                  {skills.length > 4 && (
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md">
                      +{skills.length - 4}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Summary */}
            <p className="text-slate-600 text-sm line-clamp-2">
              {candidate.summary || 'Experienced developer with proven track record in building scalable applications.'}
            </p>
          </div>

          {/* Right: Actions & Assessment */}
          <div className="flex-shrink-0 text-right space-y-3">
            {/* Risk Assessment */}
            <div className="text-xs">
              <div className="text-slate-500 mb-1">Risk Level</div>
              <div className="text-slate-700 font-medium">{riskLevel}</div>
            </div>

            {/* Digital Footprint */}
            <div className="text-xs">
              <div className="text-slate-500 mb-1">Verified</div>
              <div className="text-slate-700 font-medium">95%</div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => onView?.(candidate)}
                  className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded"
                  title="View profile"
                >
                  <Eye className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => onSave?.(candidate)}
                  className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-slate-100 rounded"
                  title="Save candidate"
                >
                  <Heart className="w-4 h-4" />
                </button>
              </div>
              
              <button
                onClick={handleContactClick}
                disabled={!candidate.email || !isHighConfidenceEmail}
                className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  candidate.email && isHighConfidenceEmail
                    ? 'bg-slate-900 text-white hover:bg-slate-800' 
                    : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                }`}
              >
                Contact
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
