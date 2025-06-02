import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  MapPin, 
  Briefcase, 
  Calendar, 
  Star, 
  AlertTriangle, 
  ChevronDown, 
  ChevronRight,
  Github,
  Mail,
  ExternalLink,
  Award,
  BookOpen,
  TrendingUp,
  Shield,
  Brain,
  Zap,
  Building,
  Globe,
  Clock,
  CheckCircle,
  Copy
} from 'lucide-react';
import { EnhancedCandidate } from '../../types/candidate';
import { useEmailOutreach } from '../../hooks/useEmailOutreach';
import { useToast } from '../../hooks/use-toast';
import { UnifiedEmailModal } from '../UnifiedEmailModal';
import { adaptEnhancedToCandidate, hasRiskData, getRiskIndicatorColor } from '../../utils/candidateAdapter';

interface EnhancedCandidateCardProps {
  candidate: EnhancedCandidate;
  searchQuery?: string;
  onSave?: (candidate: EnhancedCandidate) => void;
}

export const EnhancedCandidateCard = ({ 
  candidate, 
  searchQuery, 
  onSave 
}: EnhancedCandidateCardProps) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [showEmailModal, setShowEmailModal] = useState(false);
  const { autoGenerateEmail, isLoading } = useEmailOutreach();
  const { toast } = useToast();

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleAIOutreach = async () => {
    if (!candidate.email) {
      toast({
        title: "No email available",
        description: "This candidate doesn't have a public email address.",
        variant: "destructive"
      });
      return;
    }

    setShowEmailModal(true);
  };

  const handleCopyEmail = () => {
    if (candidate.email) {
      navigator.clipboard.writeText(candidate.email);
      toast({
        title: "Email copied",
        description: "Email address copied to clipboard"
      });
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'github':
        return <Github className="w-4 h-4" />;
      case 'linkedin':
        return <Building className="w-4 h-4" />;
      case 'stackoverflow':
        return <Star className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  // Convert EnhancedCandidate to Candidate for the email modal
  const adaptedCandidate = adaptEnhancedToCandidate(candidate);

  return (
    <Card className="w-full hover:shadow-xl transition-all duration-300 border-l-4 border-l-blue-500 bg-white">
      <CardHeader className="pb-4">
        {/* Header Section */}
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4 flex-1">
            <div className="relative">
              <Avatar className="h-16 w-16 border-2 border-white shadow-lg">
                <AvatarImage src={candidate.avatar_url} alt={candidate.name} />
                <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  {getInitials(candidate.name)}
                </AvatarFallback>
              </Avatar>
              {candidate.verified && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                  <CheckCircle className="h-3 w-3 text-white" />
                </div>
              )}
              {candidate.overall_score && (
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white">
                  {candidate.overall_score}
                </div>
              )}
              {/* Risk Signal Indicator */}
              {hasRiskData(candidate) && (
                <div className={`absolute -top-1 -left-1 w-4 h-4 rounded-full border-2 border-white ${getRiskIndicatorColor(candidate.risk_level)}`}>
                  <AlertTriangle className="h-2 w-2 text-white m-0.5" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="text-xl font-bold text-gray-900 truncate">{candidate.name}</h3>
                {candidate.risk_level && (
                  <Badge 
                    variant="outline" 
                    className={`${getRiskColor(candidate.risk_level)} text-xs font-medium`}
                  >
                    <Shield className="w-3 h-3 mr-1" />
                    {candidate.risk_level.toUpperCase()} RISK
                  </Badge>
                )}
              </div>

              <div className="flex items-center space-x-2 text-gray-600 mb-2">
                <Briefcase className="h-4 w-4" />
                <span className="font-medium">{candidate.title || 'Software Engineer'}</span>
                {candidate.company && (
                  <>
                    <span className="text-gray-400">at</span>
                    <div className="flex items-center space-x-1">
                      {candidate.company_logo && (
                        <img src={candidate.company_logo} alt="" className="w-4 h-4 rounded" />
                      )}
                      <span className="font-semibold text-blue-600">{candidate.company}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center space-x-4 text-sm text-gray-500">
                {candidate.location && (
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-3 w-3" />
                    <span>{candidate.location}</span>
                  </div>
                )}
                {candidate.experience_years && (
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>{candidate.experience_years}y exp</span>
                  </div>
                )}
                {candidate.contributions_count && (
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="h-3 w-3" />
                    <span>{candidate.contributions_count} contributions</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Data Freshness Indicator */}
          {candidate.data_freshness && (
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              <span>{candidate.data_freshness}% fresh</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* AI Summary Section */}
        {(candidate.ai_summary || candidate.suitability_summary) && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-2 mb-3">
              <Brain className="h-4 w-4 text-blue-600" />
              <span className="font-semibold text-blue-800">AI Assessment</span>
            </div>
            {candidate.ai_summary && (
              <p className="text-sm text-gray-700 mb-2 leading-relaxed">{candidate.ai_summary}</p>
            )}
            {candidate.suitability_summary && (
              <p className="text-sm text-blue-700 font-medium leading-relaxed">{candidate.suitability_summary}</p>
            )}
          </div>
        )}

        {/* Score Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {candidate.technical_score && (
            <div className={`text-center p-3 rounded-lg border ${getScoreColor(candidate.technical_score)}`}>
              <div className="text-2xl font-bold mb-1">{candidate.technical_score}%</div>
              <div className="text-xs font-medium">Technical</div>
            </div>
          )}
          {candidate.experience_score && (
            <div className={`text-center p-3 rounded-lg border ${getScoreColor(candidate.experience_score)}`}>
              <div className="text-2xl font-bold mb-1">{candidate.experience_score}%</div>
              <div className="text-xs font-medium">Experience</div>
            </div>
          )}
          {candidate.cultural_fit_score && (
            <div className={`text-center p-3 rounded-lg border ${getScoreColor(candidate.cultural_fit_score)}`}>
              <div className="text-2xl font-bold mb-1">{candidate.cultural_fit_score}%</div>
              <div className="text-xs font-medium">Culture Fit</div>
            </div>
          )}
          {candidate.risk_score !== undefined && (
            <div className={`text-center p-3 rounded-lg border ${getScoreColor(100 - candidate.risk_score)}`}>
              <div className="text-2xl font-bold mb-1">{100 - candidate.risk_score}%</div>
              <div className="text-xs font-medium">Safety Score</div>
            </div>
          )}
        </div>

        {/* Skills */}
        {candidate.skills && candidate.skills.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
              <Star className="h-4 w-4 mr-2 text-yellow-500" />
              Skills & Technologies
            </h4>
            <div className="flex flex-wrap gap-2">
              {candidate.skills.slice(0, 10).map((skill, index) => (
                <Badge key={index} variant="secondary" className="text-xs px-3 py-1 bg-blue-100 text-blue-800 border border-blue-200">
                  {skill}
                </Badge>
              ))}
              {candidate.skills.length > 10 && (
                <Badge variant="outline" className="text-xs">
                  +{candidate.skills.length - 10} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Source Links */}
        {candidate.candidate_sources && candidate.candidate_sources.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
              <Globe className="h-4 w-4 mr-2 text-gray-500" />
              Profile Sources
            </h4>
            <div className="flex flex-wrap gap-3">
              {candidate.candidate_sources.map((source, index) => (
                <a
                  key={index}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border"
                >
                  {getPlatformIcon(source.platform)}
                  <span className="text-sm font-medium capitalize">{source.platform}</span>
                  {source.verified && (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  )}
                  <ExternalLink className="h-3 w-3 text-gray-400" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Expandable Sections */}
        {candidate.work_experience && candidate.work_experience.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection('experience')}
              className="flex items-center space-x-2 font-semibold text-gray-900 hover:text-blue-600 transition-colors w-full text-left"
            >
              <Briefcase className="h-4 w-4" />
              <span>Work Experience</span>
              {expandedSections.has('experience') ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            
            {expandedSections.has('experience') && (
              <div className="mt-4 space-y-4">
                {candidate.work_experience.map((exp, index) => (
                  <div key={index} className="border-l-4 border-blue-200 pl-4 py-2 bg-gray-50 rounded-r-lg">
                    <div className="flex items-center justify-between mb-1">
                      <h5 className="font-semibold text-gray-900">{exp.title}</h5>
                      {exp.current && (
                        <Badge className="text-xs bg-green-100 text-green-800">
                          Current
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 mb-1">
                      {exp.logo && (
                        <img src={exp.logo} alt="" className="w-4 h-4 rounded" />
                      )}
                      <p className="text-sm text-blue-600 font-medium">{exp.company}</p>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{exp.duration}</p>
                    {exp.description && (
                      <p className="text-sm text-gray-600">{exp.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {candidate.education && candidate.education.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection('education')}
              className="flex items-center space-x-2 font-semibold text-gray-900 hover:text-blue-600 transition-colors w-full text-left"
            >
              <BookOpen className="h-4 w-4" />
              <span>Education</span>
              {expandedSections.has('education') ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            
            {expandedSections.has('education') && (
              <div className="mt-4 space-y-3">
                {candidate.education.map((edu, index) => (
                  <div key={index} className="border-l-4 border-green-200 pl-4 py-2 bg-green-50 rounded-r-lg">
                    <div className="flex items-center space-x-2 mb-1">
                      <h5 className="font-semibold text-gray-900">{edu.degree}</h5>
                      {edu.verified && (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{edu.field}</p>
                    <p className="text-sm text-blue-600 font-medium">{edu.institution}</p>
                    <p className="text-xs text-gray-500">{edu.year}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {candidate.achievements && candidate.achievements.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection('achievements')}
              className="flex items-center space-x-2 font-semibold text-gray-900 hover:text-blue-600 transition-colors w-full text-left"
            >
              <Award className="h-4 w-4" />
              <span>Achievements & Contributions</span>
              {expandedSections.has('achievements') ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            
            {expandedSections.has('achievements') && (
              <div className="mt-4 space-y-3">
                {candidate.achievements.map((achievement, index) => (
                  <div key={index} className="border-l-4 border-yellow-200 pl-4 py-2 bg-yellow-50 rounded-r-lg">
                    <div className="flex items-center justify-between mb-1">
                      <h5 className="font-semibold text-gray-900">{achievement.title}</h5>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs capitalize">
                          {achievement.type}
                        </Badge>
                        {achievement.verified && (
                          <CheckCircle className="h-3 w-3 text-green-600" />
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{achievement.description}</p>
                    {achievement.url && (
                      <a 
                        href={achievement.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center space-x-1"
                      >
                        <span>View details</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {candidate.risk_factors && candidate.risk_factors.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection('risks')}
              className="flex items-center space-x-2 font-semibold text-gray-900 hover:text-red-600 transition-colors w-full text-left"
            >
              <Shield className="h-4 w-4" />
              <span>Risk Signal Indicators</span>
              <Badge variant="outline" className={`text-xs ${getRiskColor(candidate.risk_level || 'low')}`}>
                {candidate.risk_factors.length} signals
              </Badge>
              {expandedSections.has('risks') ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            
            {expandedSections.has('risks') && (
              <div className="mt-4 space-y-3">
                {candidate.risk_factors.map((risk, index) => (
                  <div key={index} className={`p-4 rounded-lg border ${getRiskColor(risk.type)}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold flex items-center">
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        {risk.reason}
                      </span>
                      <Badge variant="outline" className={`text-xs ${getRiskColor(risk.type)}`}>
                        {risk.type.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm mb-2">{risk.impact}</p>
                    {risk.mitigation && (
                      <div className="bg-white bg-opacity-50 p-2 rounded text-sm">
                        <span className="font-medium">Mitigation: </span>
                        {risk.mitigation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 font-medium">Contact:</span>
            {candidate.email && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCopyEmail}
                className="text-xs"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy Email
              </Button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {onSave && (
              <Button variant="outline" size="sm" onClick={() => onSave(candidate)}>
                <Star className="h-4 w-4 mr-1" />
                Save
              </Button>
            )}
            <Button 
              size="sm" 
              onClick={handleAIOutreach}
              disabled={!candidate.email}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Zap className="h-4 w-4 mr-2" />
              AI Outreach
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Unified Email Modal */}
      <UnifiedEmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        candidate={adaptedCandidate}
      />
    </Card>
  );
};
