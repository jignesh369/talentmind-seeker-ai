
import React from 'react';
import { calculateEmailConfidence, getEmailConfidenceColor, getEmailConfidenceIcon } from '../utils/emailConfidence';

interface EmailConfidenceBadgeProps {
  email: string;
  candidate: any;
  source: string;
}

export const EmailConfidenceBadge: React.FC<EmailConfidenceBadgeProps> = ({ email, candidate, source }) => {
  const confidence = calculateEmailConfidence(email, source, candidate);
  
  if (!email) {
    return (
      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
        No email
      </span>
    );
  }
  
  return (
    <span className={`px-2 py-1 text-xs rounded-full font-medium ${getEmailConfidenceColor(confidence.level)}`}>
      {getEmailConfidenceIcon(confidence.level)} {confidence.score}% {confidence.type}
    </span>
  );
};
