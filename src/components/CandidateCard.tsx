
import React, { useState } from 'react';
import { MapPin, Calendar, ExternalLink, Github, Globe, AlertTriangle, Info, Star } from 'lucide-react';
import { ScoreBreakdown } from './ScoreBreakdown';
import { Candidate } from '../hooks/useCandidates';

interface CandidateCardProps {
  candidate: Candidate;
}

export const CandidateCard: React.FC<CandidateCardProps> = ({ candidate }) => {
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Handle potential undefined/null values with fallbacks
  const riskFlags = candidate.risk_flags || [];
  const skills = candidate.skills || [];
  const overallScore = candidate.overall_score || 0;
  const skillMatch = candidate.skill_match || 0;
  const experience = candidate.experience || 0;
  const reputation = candidate.reputation || 0;
  const freshness = candidate.freshness || 0;
  const socialProof = candidate.social_proof || 0;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Create mock sources based on available candidate data
  const mockSources = [];
  if (candidate.github_username) {
    mockSources.push({ 
      platform: 'GitHub', 
      url: `https://github.com/${candidate.github_username}`, 
      icon: 'github' 
    });
  }
  if (candidate.stackoverflow_id) {
    mockSources.push({ 
      platform: 'StackOverflow', 
      url: `https://stackoverflow.com/users/${candidate.stackoverflow_id}`, 
      icon: 'stackoverflow' 
    });
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-4">
          <div className="relative">
            <img
              src={candidate.avatar_url || '/placeholder.svg'}
              alt={candidate.name}
              className="w-16 h-16 rounded-full object-cover"
            />
            <div className={`absolute -bottom-1 -right-1 w-6 h-6 ${getScoreBadgeColor(overallScore)} rounded-full flex items-center justify-center text-white text-xs font-bold`}>
              {overallScore}
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-slate-900">{candidate.name}</h3>
            <p className="text-slate-600 font-medium">{candidate.title || 'Developer'}</p>
            <div className="flex items-center space-x-4 mt-2 text-sm text-slate-500">
              <div className="flex items-center space-x-1">
                <MapPin className="w-4 h-4" />
                <span>{candidate.location || 'Unknown'}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>{candidate.last_active ? new Date(candidate.last_active).toLocaleDateString() : 'Recently'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {riskFlags.length > 0 && (
            <div className="flex items-center space-x-1 text-red-600 bg-red-50 px-2 py-1 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">{riskFlags.length} risk{riskFlags.length > 1 ? 's' : ''}</span>
            </div>
          )}
          <div className={`px-3 py-1 rounded-lg font-semibold ${getScoreColor(overallScore)}`}>
            {overallScore}/100
          </div>
        </div>
      </div>

      <p className="text-slate-700 mb-4 leading-relaxed">{candidate.summary || 'No summary available.'}</p>

      {/* Skills */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-slate-900 mb-2">Key Skills</h4>
        <div className="flex flex-wrap gap-2">
          {skills.slice(0, 8).map((skill, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full font-medium"
            >
              {skill}
            </span>
          ))}
          {skills.length > 8 && (
            <span className="px-3 py-1 bg-slate-100 text-slate-600 text-sm rounded-full">
              +{skills.length - 8} more
            </span>
          )}
          {skills.length === 0 && (
            <span className="px-3 py-1 bg-slate-100 text-slate-600 text-sm rounded-full">
              No skills listed
            </span>
          )}
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-slate-900">Score Breakdown</h4>
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm"
          >
            <Info className="w-4 h-4" />
            <span>{showBreakdown ? 'Hide' : 'Show'} Details</span>
          </button>
        </div>
        
        {showBreakdown && (
          <ScoreBreakdown candidate={{
            skillMatch,
            experience,
            reputation,
            freshness,
            socialProof,
            riskFlags
          }} />
        )}
      </div>

      {/* Sources and Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <div className="flex items-center space-x-3">
          <span className="text-sm text-slate-600 font-medium">Found on:</span>
          {mockSources.map((source, index) => (
            <a
              key={index}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-slate-700 hover:text-blue-600 transition-colors"
            >
              {source.platform === 'GitHub' && <Github className="w-4 h-4" />}
              {source.platform === 'Portfolio' && <Globe className="w-4 h-4" />}
              {source.platform === 'StackOverflow' && <Star className="w-4 h-4" />}
              <span className="text-sm">{source.platform}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          ))}
          {mockSources.length === 0 && (
            <span className="text-sm text-slate-500">No sources available</span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
            Save
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Contact
          </button>
        </div>
      </div>
    </div>
  );
};
