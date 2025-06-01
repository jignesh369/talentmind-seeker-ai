
import React from 'react';
import { Mail, Copy, ExternalLink } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { calculateEmailConfidence } from '../utils/emailConfidence';

interface EnhancedContactButtonsProps {
  candidate: any;
}

export const EnhancedContactButtons: React.FC<EnhancedContactButtonsProps> = ({ candidate }) => {
  const { toast } = useToast();
  
  const emailConfidence = candidate.email ? calculateEmailConfidence(candidate.email, 'profile', candidate) : null;
  const isHighConfidenceEmail = emailConfidence && emailConfidence.score >= 80;
  
  const handleContactClick = () => {
    if (candidate.email && isHighConfidenceEmail) {
      window.location.href = `mailto:${candidate.email}`;
    } else {
      toast({
        title: "Contact not recommended",
        description: "This email has low confidence. Consider enriching the data first.",
        variant: "destructive"
      });
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

  const handleViewLinkedIn = () => {
    if (candidate.linkedin_url) {
      window.open(candidate.linkedin_url, '_blank');
    }
  };

  return (
    <div className="flex items-center space-x-2">
      {/* Copy Email Button - Always available if email exists */}
      {candidate.email && (
        <button 
          onClick={handleCopyEmail}
          className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center space-x-1"
          title={`Copy ${candidate.email} (${emailConfidence?.score}% confidence)`}
        >
          <Copy className="w-4 h-4" />
          <span>Copy Email</span>
        </button>
      )}
      
      {/* Contact Button - Only for high confidence emails */}
      <button 
        onClick={handleContactClick}
        disabled={!candidate.email || !isHighConfidenceEmail}
        className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-1 ${
          candidate.email && isHighConfidenceEmail
            ? 'bg-blue-600 text-white hover:bg-blue-700' 
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
        title={
          !candidate.email 
            ? 'No email available' 
            : !isHighConfidenceEmail 
            ? `Low confidence email (${emailConfidence?.score}%). Consider enriching data first.`
            : `Contact via ${candidate.email}`
        }
      >
        <Mail className="w-4 h-4" />
        <span>Contact</span>
      </button>
      
      {/* LinkedIn Button - If available */}
      {candidate.linkedin_url && (
        <button 
          onClick={handleViewLinkedIn}
          className="px-3 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors flex items-center space-x-1"
        >
          <ExternalLink className="w-4 h-4" />
          <span>LinkedIn</span>
        </button>
      )}
    </div>
  );
};
