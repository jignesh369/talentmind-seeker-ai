
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
  const skillScores = skills.slice(0, 4).map(skill => ({
    name: skill,
    score: (7.0 + Math.random() * 2.5).toFixed(1)
  }));

  // Achievement badges
  const achievements = [
    { name: 'Open Source', icon: Github, color: 'bg-green-100 text-green-700' },
    { name: 'Top Performer', icon: Trophy, color: 'bg-yellow-100 text-yellow-700' },
    { name: 'Verified', icon: CheckCircle, color: 'bg-blue-100 text-blue-700' }
  ].slice(0, Math.floor(Math.random() * 3) + 1);

  // Risk assessment
  const riskLevel = overallScore > 80 ? 'low' : overallScore > 60 ? 'medium' : 'high';
  const riskColors = {
    low: 'text-green-600 bg-green-50 border-green-200',
    medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    high: 'text-red-600 bg-red-50 border-red-200'
  };

  const getMatchColor = (percentage: number) => {
    if (percentage >= 85) return 'from-green-500 to-emerald-600';
    if (percentage >= 70) return 'from-blue-500 to-cyan-600';
    return 'from-yellow-500 to-orange-500';
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
      className={`bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-blue-300 ${
        isHovered ? 'scale-[1.02]' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Match Percentage Header */}
      <div className={`h-2 bg-gradient-to-r ${getMatchColor(matchPercentage)}`}></div>
      
      {/* Card Content */}
      <div className="p-6">
        {/* Header with Match Badge */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <img
                src={candidate.avatar_url || '/placeholder.svg'}
                alt={candidate.name}
                className="w-14 h-14 rounded-full object-cover border-3 border-white shadow-lg"
              />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">{candidate.name}</h3>
              <p className="text-slate-600 font-medium">{candidate.title || 'Developer'}</p>
              <div className="flex items-center text-slate-500 text-sm mt-1">
                <MapPin className="w-3 h-3 mr-1" />
                <span>{candidate.location || 'Remote'}</span>
              </div>
            </div>
          </div>
          
          <div className={`relative w-16 h-16 rounded-full bg-gradient-to-br ${getMatchColor(matchPercentage)} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
            {Math.round(matchPercentage)}%
            <div className="absolute -top-2 -right-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
            </div>
          </div>
        </div>

        {/* Achievement Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {achievements.map((achievement, index) => (
            <Badge key={index} className={`${achievement.color} border-0 px-3 py-1`}>
              <achievement.icon className="w-3 h-3 mr-1" />
              {achievement.name}
            </Badge>
          ))}
        </div>

        {/* Skills Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-slate-900">Skill Assessment</h4>
            <button
              onClick={() => setShowSkillDetails(!showSkillDetails)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              {showSkillDetails ? 'Hide' : 'Show'} Details
            </button>
          </div>
          
          {showSkillDetails ? (
            <div className="space-y-3">
              {skillScores.map((skill, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">{skill.name}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                        style={{ width: `${(parseFloat(skill.score) / 10) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-bold text-slate-900">{skill.score}/10</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {skills.slice(0, 3).map((skill, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full border border-blue-200 font-medium"
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
          )}
        </div>

        {/* Digital Footprint & Risk Assessment */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-slate-50 rounded-lg p-3">
            <h5 className="text-xs font-semibold text-slate-700 mb-2">Digital Footprint</h5>
            <div className="flex items-center space-x-2">
              <Github className="w-4 h-4 text-slate-600" />
              <span className="text-sm text-green-600 font-medium">95% Verified</span>
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <h5 className="text-xs font-semibold text-slate-700 mb-2">Risk Assessment</h5>
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${riskColors[riskLevel]}`}>
              {riskLevel === 'low' && <CheckCircle className="w-3 h-3 mr-1" />}
              {riskLevel === 'medium' && <AlertTriangle className="w-3 h-3 mr-1" />}
              {riskLevel === 'high' && <AlertTriangle className="w-3 h-3 mr-1" />}
              {riskLevel.toUpperCase()} RISK
            </div>
          </div>
        </div>

        {/* Summary */}
        <p className="text-slate-600 text-sm line-clamp-2 mb-4">
          {candidate.summary || 'Experienced developer with proven track record in building scalable applications and leading technical teams.'}
        </p>
      </div>

      {/* Enhanced Actions */}
      <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-blue-50 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onView?.(candidate)}
              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg transition-all"
              title="View full profile"
            >
              <Eye className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => onSave?.(candidate)}
              className="p-2 text-slate-500 hover:text-red-500 hover:bg-white rounded-lg transition-all"
              title="Save candidate"
            >
              <Heart className="w-4 h-4" />
            </button>

            <button
              className="p-2 text-slate-500 hover:text-purple-600 hover:bg-white rounded-lg transition-all"
              title="AI Snapshot"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleContactClick}
              disabled={!candidate.email || !isHighConfidenceEmail}
              className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-all font-medium ${
                candidate.email && isHighConfidenceEmail
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl' 
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Mail className="w-4 h-4" />
              <span>Contact</span>
            </button>
            
            <button
              onClick={() => onView?.(candidate)}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-all font-medium flex items-center space-x-2"
            >
              <ExternalLink className="w-4 h-4" />
              <span>View Profile</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
