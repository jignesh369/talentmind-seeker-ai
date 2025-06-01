
import React, { useState } from 'react';
import { 
  MapPin, Calendar, ExternalLink, Github, Globe, AlertTriangle, 
  Info, Star, Mail, Copy, TrendingUp, Award, Clock, Users,
  Code, Briefcase, Heart, Eye
} from 'lucide-react';
import { EmailConfidenceBadge } from './EmailConfidenceBadge';
import { DataQualityIndicator } from './DataQualityIndicator';
import { Candidate } from '../hooks/useCandidates';
import { calculateRefinedRiskFlags } from '../utils/riskAssessment';
import { calculateEmailConfidence } from '../utils/emailConfidence';
import { useToast } from '../hooks/use-toast';

interface ModernCandidateCardProps {
  candidate: Candidate;
  onContact?: (candidate: Candidate) => void;
  onSave?: (candidate: Candidate) => void;
  onView?: (candidate: Candidate) => void;
}

export const ModernCandidateCard: React.FC<ModernCandidateCardProps> = ({ 
  candidate, 
  onContact,
  onSave,
  onView 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showFullSkills, setShowFullSkills] = useState(false);
  const { toast } = useToast();

  const riskFlags = calculateRefinedRiskFlags(candidate);
  const skills = candidate.skills || [];
  const overallScore = candidate.overall_score || 0;
  const sources = candidate.candidate_sources || [];
  
  const emailConfidence = candidate.email ? calculateEmailConfidence(candidate.email, 'profile', candidate) : null;
  const isHighConfidenceEmail = emailConfidence && emailConfidence.score >= 80;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'from-green-500 to-emerald-600';
    if (score >= 60) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-pink-600';
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-gradient-to-r from-green-500 to-emerald-600';
    if (score >= 60) return 'bg-gradient-to-r from-yellow-500 to-orange-500';
    return 'bg-gradient-to-r from-red-500 to-pink-600';
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'github':
        return <Github className="w-4 h-4" />;
      case 'stackoverflow':
        return <Star className="w-4 h-4" />;
      case 'linkedin':
        return <Globe className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  const handleCopyEmail = () => {
    if (candidate.email) {
      navigator.clipboard.writeText(candidate.email);
      toast({
        title: "Email copied",
        description: `${candidate.email} copied to clipboard`
      });
    }
  };

  const handleContactClick = () => {
    if (candidate.email && isHighConfidenceEmail) {
      window.location.href = `mailto:${candidate.email}`;
      onContact?.(candidate);
    } else {
      toast({
        title: "Contact not recommended",
        description: "This email has low confidence. Consider enriching the data first.",
        variant: "destructive"
      });
    }
  };

  const topSkills = skills.slice(0, 5);
  const remainingSkills = skills.slice(5);

  return (
    <div 
      className={`relative bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden transition-all duration-300 transform ${
        isHovered ? 'shadow-2xl scale-105 border-blue-300' : 'hover:shadow-xl'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Score Badge - Floating */}
      <div className={`absolute top-4 right-4 w-16 h-16 ${getScoreBadgeColor(overallScore)} rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg z-10`}>
        {overallScore}
      </div>

      {/* Risk Flag Indicator */}
      {riskFlags.length > 0 && (
        <div className="absolute top-4 left-4 flex items-center space-x-1 text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs font-medium border border-red-200 z-10">
          <AlertTriangle className="w-3 h-3" />
          <span>{riskFlags.length}</span>
        </div>
      )}

      <div className="p-6">
        {/* Header Section */}
        <div className="flex items-start space-x-4 mb-6">
          <div className="relative">
            <img
              src={candidate.avatar_url || '/placeholder.svg'}
              alt={candidate.name}
              className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
            />
            <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-white"></div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-slate-900 truncate">{candidate.name}</h3>
            <p className="text-slate-600 font-medium text-lg">{candidate.title || 'Developer'}</p>
            
            <div className="flex items-center space-x-4 mt-2 text-sm text-slate-500">
              <div className="flex items-center space-x-1">
                <MapPin className="w-4 h-4" />
                <span>{candidate.location || 'Remote'}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>{candidate.last_active ? new Date(candidate.last_active).toLocaleDateString() : 'Recently'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Email Confidence */}
        {candidate.email && (
          <div className="mb-4">
            <EmailConfidenceBadge 
              email={candidate.email} 
              candidate={candidate} 
              source="profile" 
            />
          </div>
        )}

        {/* Summary */}
        <div className="mb-4">
          <p className="text-slate-700 text-sm leading-relaxed line-clamp-3">
            {candidate.summary || 'Passionate developer with expertise in modern technologies and a track record of delivering high-quality solutions.'}
          </p>
        </div>

        {/* Skills Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-slate-900 flex items-center space-x-1">
              <Code className="w-4 h-4" />
              <span>Skills</span>
            </h4>
            {skills.length > 5 && (
              <button
                onClick={() => setShowFullSkills(!showFullSkills)}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                {showFullSkills ? 'Show less' : `+${remainingSkills.length} more`}
              </button>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2">
            {topSkills.map((skill, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 text-xs rounded-full font-medium border border-blue-300"
              >
                {skill}
              </span>
            ))}
            
            {showFullSkills && remainingSkills.map((skill, index) => (
              <span
                key={index + topSkills.length}
                className="px-3 py-1 bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 text-xs rounded-full font-medium border border-purple-300"
              >
                {skill}
              </span>
            ))}
            
            {skills.length === 0 && (
              <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs rounded-full">
                No skills listed
              </span>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">Experience</span>
            </div>
            <p className="text-lg font-bold text-blue-900">{candidate.experience || 0}/100</p>
          </div>
          
          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <Award className="w-4 h-4 text-green-600" />
              <span className="text-xs font-medium text-green-700">Reputation</span>
            </div>
            <p className="text-lg font-bold text-green-900">{candidate.reputation || 0}/100</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <div className="flex items-center space-x-2">
            {sources.length > 0 ? (
              sources.slice(0, 3).map((source, index) => (
                <a
                  key={index}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 text-slate-600 hover:text-blue-600 transition-colors text-xs"
                >
                  {getPlatformIcon(source.platform)}
                  <span className="capitalize">{source.platform}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ))
            ) : (
              <span className="text-xs text-slate-500">No sources</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onView?.(candidate)}
              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="View details"
            >
              <Eye className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => onSave?.(candidate)}
              className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Save candidate"
            >
              <Heart className="w-4 h-4" />
            </button>
            
            {candidate.email && (
              <button 
                onClick={handleCopyEmail}
                className="p-2 text-slate-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title={`Copy ${candidate.email}`}
              >
                <Copy className="w-4 h-4" />
              </button>
            )}
            
            <button
              onClick={handleContactClick}
              disabled={!candidate.email || !isHighConfidenceEmail}
              className={`px-4 py-2 rounded-lg flex items-center space-x-1 transition-all ${
                candidate.email && isHighConfidenceEmail
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg' 
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
              title={
                !candidate.email 
                  ? 'No email available' 
                  : !isHighConfidenceEmail 
                  ? `Low confidence email (${emailConfidence?.score}%)`
                  : `Contact via ${candidate.email}`
              }
            >
              <Mail className="w-4 h-4" />
              <span className="text-sm font-medium">Contact</span>
            </button>
          </div>
        </div>
      </div>

      {/* Hover Overlay with Extra Info */}
      {isHovered && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none">
          <div className="absolute bottom-4 left-4 right-4">
            <DataQualityIndicator candidate={candidate} />
          </div>
        </div>
      )}
    </div>
  );
};
