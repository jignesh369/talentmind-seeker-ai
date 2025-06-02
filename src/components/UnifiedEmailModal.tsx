
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Send, RotateCcw, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';
import { useEmailOutreach } from '@/hooks/useEmailOutreach';
import { Candidate } from '@/hooks/useCandidates';

interface UnifiedEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate;
}

export const UnifiedEmailModal: React.FC<UnifiedEmailModalProps> = ({
  isOpen,
  onClose,
  candidate
}) => {
  const { isLoading, draft, autoGenerateEmail, sendEmail, getQuotaStatus, getUserProfile } = useEmailOutreach();
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const [quota, setQuota] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [jobTitle, setJobTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      initializeModal();
    } else {
      // Reset state when modal closes
      setError(null);
      setSuccess(null);
      setEditedSubject('');
      setEditedBody('');
      setJobTitle('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (draft) {
      setEditedSubject(draft.subject);
      setEditedBody(draft.body);
      setError(null); // Clear any previous errors when draft is received
    }
  }, [draft]);

  const initializeModal = async () => {
    setIsInitializing(true);
    setError(null);
    
    try {
      // Validate candidate data
      if (!candidate.email) {
        throw new Error('This candidate does not have an email address available for outreach.');
      }

      const [quotaData, profileData] = await Promise.all([
        getQuotaStatus(),
        getUserProfile()
      ]);
      
      if (!profileData) {
        throw new Error('Unable to load user profile. Please try refreshing the page.');
      }

      setQuota(quotaData);
      setUserProfile(profileData);
      setJobTitle(`Senior ${candidate.title || 'Developer'} Position`);
      
      // Auto-generate email
      await handleGenerateEmail();
    } catch (err: any) {
      console.error('Modal initialization error:', err);
      setError(err.message || 'Failed to initialize email modal');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleGenerateEmail = async () => {
    setError(null);
    setSuccess(null);
    
    try {
      if (!candidate.email) {
        throw new Error('Candidate email is required for outreach');
      }

      const emailDraft = await autoGenerateEmail(candidate, jobTitle);
      
      if (!emailDraft) {
        throw new Error('Failed to generate email content. Please check your OpenAI API key configuration or try again.');
      }

      setSuccess('Email draft generated successfully!');
    } catch (err: any) {
      console.error('Email generation error:', err);
      setError(err.message || 'Failed to generate email draft');
    }
  };

  const handleSendEmail = async () => {
    if (!draft || !userProfile) {
      setError('Email draft or user profile is missing');
      return;
    }

    if (!editedSubject.trim() || !editedBody.trim()) {
      setError('Subject and body are required');
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const success = await sendEmail({
        candidate_id: candidate.id,
        subject: editedSubject,
        body: editedBody,
        sender_email: userProfile.email,
        sender_name: userProfile.full_name,
        openai_response_id: draft.openai_response_id
      });

      if (success) {
        setSuccess('Email sent successfully!');
        // Refresh quota
        const updatedQuota = await getQuotaStatus();
        setQuota(updatedQuota);
        
        // Close modal after short delay
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        throw new Error('Failed to send email');
      }
    } catch (err: any) {
      console.error('Email sending error:', err);
      setError(err.message || 'Failed to send email');
    }
  };

  const handleClose = () => {
    setError(null);
    setSuccess(null);
    setEditedSubject('');
    setEditedBody('');
    setJobTitle('');
    onClose();
  };

  // Check if quota is exceeded
  const isQuotaExceeded = quota && quota.remaining <= 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <span>AI Email Outreach - {candidate.name}</span>
            </div>
            {quota && (
              <Badge variant={quota.remaining > 10 ? "default" : "destructive"}>
                {quota.emails_sent}/{quota.quota_limit} emails today
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Quota Warning */}
        {isQuotaExceeded && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Daily email quota exceeded. You can send more emails tomorrow.
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {(isInitializing || (isLoading && !draft)) && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-slate-600">
              {isInitializing ? 'Initializing...' : 'Generating personalized email...'}
            </p>
            <p className="text-sm text-slate-500">
              Analyzing {candidate.name}'s profile and creating the perfect outreach message
            </p>
          </div>
        )}

        {/* Main Content */}
        {!isInitializing && !error && (
          <div className="space-y-6">
            {/* Quick Controls */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <div>
                  <Label htmlFor="jobTitle" className="text-sm font-medium">Job Title</Label>
                  <Input
                    id="jobTitle"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="mt-1 w-64"
                    placeholder="Senior Developer Position"
                  />
                </div>
              </div>
              <Button 
                onClick={handleGenerateEmail}
                disabled={isLoading || isQuotaExceeded}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{draft ? 'Regenerate' : 'Generate'}</span>
              </Button>
            </div>

            {/* Candidate Preview */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2 text-blue-900">Candidate Highlights</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p><strong>Email:</strong> {candidate.email || 'Not available'}</p>
                  <p><strong>Experience:</strong> {candidate.experience_years || 'N/A'} years</p>
                  <p><strong>Score:</strong> {candidate.overall_score || 0}/100</p>
                </div>
                <div>
                  <p><strong>Location:</strong> {candidate.location || 'Unknown'}</p>
                  <p><strong>Top Skills:</strong> {candidate.skills?.slice(0, 3).join(', ') || 'Not listed'}</p>
                </div>
              </div>
            </div>

            {/* Email Content */}
            {draft && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="subject" className="text-sm font-medium">Subject Line</Label>
                  <Input
                    id="subject"
                    value={editedSubject}
                    onChange={(e) => setEditedSubject(e.target.value)}
                    className="mt-1"
                    placeholder="Email subject..."
                  />
                </div>

                <div>
                  <Label htmlFor="body" className="text-sm font-medium">Email Body</Label>
                  <Textarea
                    id="body"
                    value={editedBody}
                    onChange={(e) => setEditedBody(e.target.value)}
                    className="mt-1"
                    rows={12}
                    placeholder="Email content..."
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button 
                onClick={handleSendEmail} 
                disabled={isLoading || isQuotaExceeded || !draft || !editedSubject.trim() || !editedBody.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Send className="w-4 h-4 mr-2" />
                Send Email
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
