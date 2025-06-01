
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Edit, Eye } from 'lucide-react';
import { useEmailOutreach } from '@/hooks/useEmailOutreach';
import { Candidate } from '@/hooks/useCandidates';

interface EmailOutreachModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate;
}

export const EmailOutreachModal: React.FC<EmailOutreachModalProps> = ({
  isOpen,
  onClose,
  candidate
}) => {
  const { isLoading, draft, draftEmail, sendEmail, getQuotaStatus } = useEmailOutreach();
  const [step, setStep] = useState<'compose' | 'preview' | 'edit'>('compose');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [tone, setTone] = useState<'professional' | 'friendly' | 'casual' | 'direct'>('professional');
  const [senderEmail, setSenderEmail] = useState('');
  const [senderName, setSenderName] = useState('');
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const [quota, setQuota] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      loadQuotaStatus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (draft) {
      setEditedSubject(draft.subject);
      setEditedBody(draft.body);
      setStep('preview');
    }
  }, [draft]);

  const loadQuotaStatus = async () => {
    const quotaData = await getQuotaStatus();
    setQuota(quotaData);
  };

  const handleGenerateDraft = async () => {
    if (!jobTitle || !company || !senderEmail || !senderName) return;

    await draftEmail({
      candidate_id: candidate.id,
      job_title: jobTitle,
      company: company,
      job_description: jobDescription,
      tone: tone
    });
  };

  const handleSendEmail = async () => {
    if (!draft) return;

    const success = await sendEmail({
      candidate_id: candidate.id,
      subject: editedSubject,
      body: editedBody,
      sender_email: senderEmail,
      sender_name: senderName,
      openai_response_id: draft.openai_response_id
    });

    if (success) {
      onClose();
      loadQuotaStatus();
    }
  };

  const handleClose = () => {
    setStep('compose');
    setJobTitle('');
    setCompany('');
    setJobDescription('');
    setEditedSubject('');
    setEditedBody('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>AI Email Outreach - {candidate.name}</span>
            {quota && (
              <Badge variant={quota.remaining > 10 ? "default" : "destructive"}>
                {quota.emails_sent}/{quota.quota_limit} emails today
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {step === 'compose' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="jobTitle">Job Title *</Label>
                <Input
                  id="jobTitle"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Senior ML Engineer"
                />
              </div>
              <div>
                <Label htmlFor="company">Company *</Label>
                <Input
                  id="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Acme AI"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="jobDescription">Job Description</Label>
              <Textarea
                id="jobDescription"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Brief description of the role and key requirements..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="senderEmail">Your Email *</Label>
                <Input
                  id="senderEmail"
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="recruiter@company.com"
                />
              </div>
              <div>
                <Label htmlFor="senderName">Your Name *</Label>
                <Input
                  id="senderName"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="John Smith"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="tone">Email Tone</Label>
              <Select value={tone} onValueChange={(value: any) => setTone(value)}>
                <SelectTrigger>
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

            <div className="bg-slate-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Candidate Profile Preview</h4>
              <div className="text-sm space-y-1">
                <p><strong>Name:</strong> {candidate.name}</p>
                <p><strong>Title:</strong> {candidate.title || 'Developer'}</p>
                <p><strong>Location:</strong> {candidate.location || 'Unknown'}</p>
                <p><strong>Skills:</strong> {candidate.skills?.slice(0, 5).join(', ') || 'No skills listed'}</p>
                <p><strong>Score:</strong> {candidate.overall_score || 0}/100</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleGenerateDraft}
                disabled={isLoading || !jobTitle || !company || !senderEmail || !senderName || (quota && quota.remaining <= 0)}
                className="flex-1"
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                ) : (
                  <>Generate Email Draft</>
                )}
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && draft && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="subject">Subject Line</Label>
              <div className="mt-1 p-3 bg-slate-50 rounded-md text-sm">
                {draft.subject}
              </div>
            </div>

            <div>
              <Label htmlFor="body">Email Body</Label>
              <div className="mt-1 p-3 bg-slate-50 rounded-md text-sm whitespace-pre-wrap">
                {draft.body}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSendEmail} disabled={isLoading}>
                <Send className="w-4 h-4 mr-2" />
                Send Email
              </Button>
              <Button variant="outline" onClick={() => setStep('edit')}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline" onClick={() => setStep('compose')}>
                Back
              </Button>
            </div>
          </div>
        )}

        {step === 'edit' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="editSubject">Subject Line</Label>
              <Input
                id="editSubject"
                value={editedSubject}
                onChange={(e) => setEditedSubject(e.target.value)}
                placeholder="Email subject..."
              />
            </div>

            <div>
              <Label htmlFor="editBody">Email Body</Label>
              <Textarea
                id="editBody"
                value={editedBody}
                onChange={(e) => setEditedBody(e.target.value)}
                placeholder="Email content..."
                rows={12}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSendEmail} disabled={isLoading}>
                <Send className="w-4 h-4 mr-2" />
                Send Email
              </Button>
              <Button variant="outline" onClick={() => setStep('preview')}>
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
              <Button variant="outline" onClick={() => setStep('compose')}>
                Back
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
