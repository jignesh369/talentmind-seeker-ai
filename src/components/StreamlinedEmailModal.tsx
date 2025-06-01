
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, RotateCcw, Sparkles } from 'lucide-react';
import { useEmailOutreach } from '@/hooks/useEmailOutreach';
import { Candidate } from '@/hooks/useCandidates';

interface StreamlinedEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate;
}

export const StreamlinedEmailModal: React.FC<StreamlinedEmailModalProps> = ({
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
  const [tone, setTone] = useState<'professional' | 'friendly' | 'casual' | 'direct'>('professional');

  useEffect(() => {
    if (isOpen) {
      initializeModal();
    }
  }, [isOpen]);

  useEffect(() => {
    if (draft) {
      setEditedSubject(draft.subject);
      setEditedBody(draft.body);
    }
  }, [draft]);

  const initializeModal = async () => {
    const [quotaData, profileData] = await Promise.all([
      getQuotaStatus(),
      getUserProfile()
    ]);
    
    setQuota(quotaData);
    setUserProfile(profileData);
    setJobTitle(`Senior ${candidate.title || 'Developer'} Position`);
    
    // Auto-generate email immediately
    await autoGenerateEmail(candidate, `Senior ${candidate.title || 'Developer'} Position`);
  };

  const handleRegenerateEmail = async () => {
    await autoGenerateEmail(candidate, jobTitle);
  };

  const handleSendEmail = async () => {
    if (!draft || !userProfile) return;

    const success = await sendEmail({
      candidate_id: candidate.id,
      subject: editedSubject,
      body: editedBody,
      sender_email: userProfile.email,
      sender_name: userProfile.full_name,
      openai_response_id: draft.openai_response_id
    });

    if (success) {
      onClose();
      const updatedQuota = await getQuotaStatus();
      setQuota(updatedQuota);
    }
  };

  const handleClose = () => {
    setEditedSubject('');
    setEditedBody('');
    setJobTitle('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <span>AI Outreach - {candidate.name}</span>
            </div>
            {quota && (
              <Badge variant={quota.remaining > 10 ? "default" : "destructive"}>
                {quota.emails_sent}/{quota.quota_limit} emails today
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading && !draft && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-slate-600">Generating personalized email...</p>
            <p className="text-sm text-slate-500">Analyzing {candidate.name}'s profile and creating the perfect outreach message</p>
          </div>
        )}

        {draft && (
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
                <div>
                  <Label className="text-sm font-medium">Tone</Label>
                  <Select value={tone} onValueChange={(value: any) => setTone(value)}>
                    <SelectTrigger className="mt-1 w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="direct">Direct</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button 
                onClick={handleRegenerateEmail}
                disabled={isLoading}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Regenerate</span>
              </Button>
            </div>

            {/* Candidate Preview */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2 text-blue-900">Candidate Highlights</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p><strong>Experience:</strong> {candidate.experience_years || 'N/A'} years</p>
                  <p><strong>Score:</strong> {candidate.overall_score || 0}/100</p>
                </div>
                <div>
                  <p><strong>Location:</strong> {candidate.location || 'Unknown'}</p>
                  <p><strong>Top Skills:</strong> {candidate.skills?.slice(0, 3).join(', ') || 'Not listed'}</p>
                </div>
              </div>
            </div>

            {/* Email Preview/Edit */}
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

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button 
                onClick={handleSendEmail} 
                disabled={isLoading || (quota && quota.remaining <= 0)}
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
