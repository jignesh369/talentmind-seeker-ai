import React from 'react';
import { MapPin, Mail, Github, Linkedin, ExternalLink, Star, Clock, Users } from 'lucide-react';
import { Candidate } from '../hooks/useCandidates';

interface ModernCandidateCardProps {
  candidate: Candidate;
  onContact: (candidate: Candidate) => void;
  onSave: (candidate: any) => void;
  onView: (candidate: Candidate) => void;
}

export const ModernCandidateCard: React.FC<ModernCandidateCardProps> = ({ 
  candidate, 
  onContact, 
  onSave, 
  onView 
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-3">
            {candidate.avatar_url && (
              <img 
                src={candidate.avatar_url} 
                alt={candidate.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            )}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{candidate.name}</h3>
              {candidate.title && (
                <p className="text-sm text-gray-600">{candidate.title}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4 mb-3 text-sm text-gray-600">
            {candidate.location && (
              <div className="flex items-center space-x-1">
                <MapPin className="w-4 h-4" />
                <span>{candidate.location}</span>
              </div>
            )}
            {candidate.experience_years && (
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{candidate.experience_years} years</span>
              </div>
            )}
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4" />
              <span>{candidate.overall_score}/100</span>
            </div>
          </div>

          {candidate.summary && (
            <p className="text-sm text-gray-700 mb-4 line-clamp-2">{candidate.summary}</p>
          )}

          {candidate.skills && candidate.skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {candidate.skills.slice(0, 6).map((skill, index) => (
                <span 
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md"
                >
                  {skill}
                </span>
              ))}
              {candidate.skills.length > 6 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-md">
                  +{candidate.skills.length - 6} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex space-x-2">
          {candidate.email && (
            <button
              onClick={() => onContact(candidate)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
            >
              <Mail className="w-3 h-3" />
              <span>Contact</span>
            </button>
          )}
          {candidate.github_username && (
            <a
              href={`https://github.com/${candidate.github_username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 transition-colors"
            >
              <Github className="w-3 h-3" />
            </a>
          )}
          {candidate.linkedin_url && (
            <a
              href={candidate.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 transition-colors"
            >
              <Linkedin className="w-3 h-3" />
            </a>
          )}
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => onSave(candidate)}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 transition-colors"
          >
            Save
          </button>
          <button
            onClick={() => onView(candidate)}
            className="flex items-center space-x-1 px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            <span>View</span>
          </button>
        </div>
      </div>
    </div>
  );
};
