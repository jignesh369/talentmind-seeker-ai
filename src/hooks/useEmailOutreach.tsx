
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DraftEmailRequest {
  candidate_id: string;
  job_title?: string;
  company?: string;
  job_description?: string;
  tone: 'professional' | 'friendly' | 'casual' | 'direct';
  template_id?: string;
}

interface SendEmailRequest {
  candidate_id: string;
  subject: string;
  body: string;
  sender_email: string;
  sender_name: string;
  openai_response_id?: string;
}

interface EmailDraft {
  subject: string;
  body: string;
  candidate: any;
  openai_response_id?: string;
}

interface UserProfile {
  full_name: string;
  email: string;
  company: string;
}

export const useEmailOutreach = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [draft, setDraft] = useState<EmailDraft | null>(null);
  const { toast } = useToast();

  const getUserProfile = async (): Promise<UserProfile | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session found. Please log in again.');
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name, email, company')
        .eq('id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Profile fetch error:', error);
        throw new Error('Failed to load user profile');
      }

      return profile || {
        full_name: session.user.email?.split('@')[0] || 'Recruiter',
        email: session.user.email || '',
        company: 'TalentMind'
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  };

  const validateCandidate = (candidate: any): void => {
    if (!candidate) {
      throw new Error('Candidate data is required');
    }
    if (!candidate.id) {
      throw new Error('Candidate must have a valid ID');
    }
    if (!candidate.email) {
      throw new Error('Candidate must have an email address for outreach');
    }
    if (!candidate.name) {
      throw new Error('Candidate must have a name');
    }
  };

  const autoGenerateEmail = async (candidate: any, jobTitle?: string): Promise<EmailDraft | null> => {
    setIsLoading(true);
    try {
      // Validate inputs
      validateCandidate(candidate);
      
      const userProfile = await getUserProfile();
      if (!userProfile) {
        throw new Error('Unable to fetch user profile');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required. Please log in again.');
      }

      // Auto-populate with intelligent defaults
      const request: DraftEmailRequest = {
        candidate_id: candidate.id,
        job_title: jobTitle || `Senior ${candidate.title || 'Developer'} Position`,
        company: userProfile.company || 'TalentMind',
        job_description: `Join our innovative team and make a significant impact in the AI/HR tech space. We're looking for talented individuals like you to help shape the future of recruitment technology.`,
        tone: 'professional'
      };

      console.log('Generating email for:', candidate.name, 'with request:', request);

      const response = await supabase.functions.invoke('draft-email', {
        body: request,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        console.error('Draft email error:', response.error);
        throw new Error(response.error.message || 'Failed to generate email draft');
      }

      if (!response.data) {
        throw new Error('No email content received from AI service');
      }

      const emailDraft = response.data as EmailDraft;
      
      // Validate the response
      if (!emailDraft.subject || !emailDraft.body) {
        throw new Error('Generated email is incomplete. Please try again.');
      }

      setDraft(emailDraft);
      return emailDraft;
    } catch (error: any) {
      console.error('Error auto-generating email:', error);
      
      // Provide specific error messages based on error type
      let userMessage = error.message;
      if (error.message?.includes('API_KEY')) {
        userMessage = 'OpenAI API key configuration issue. Please check your settings.';
      } else if (error.message?.includes('UNAUTHORIZED')) {
        userMessage = 'Authentication failed. Please log in again.';
      } else if (error.message?.includes('quota')) {
        userMessage = 'Daily email quota exceeded. Try again tomorrow.';
      }

      toast({
        title: "Error",
        description: userMessage,
        variant: "destructive"
      });
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const draftEmail = async (request: DraftEmailRequest): Promise<EmailDraft | null> => {
    setIsLoading(true);
    try {
      // Validate request
      if (!request.candidate_id) {
        throw new Error('Candidate ID is required');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required. Please log in again.');
      }

      const response = await supabase.functions.invoke('draft-email', {
        body: request,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        console.error('Draft email error:', response.error);
        throw new Error(response.error.message || 'Failed to generate email draft');
      }

      const emailDraft = response.data as EmailDraft;
      setDraft(emailDraft);
      return emailDraft;
    } catch (error: any) {
      console.error('Error drafting email:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate email draft",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const sendEmail = async (request: SendEmailRequest): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Validate request
      if (!request.candidate_id || !request.subject?.trim() || !request.body?.trim()) {
        throw new Error('All email fields are required');
      }

      if (!request.sender_email || !request.sender_name) {
        throw new Error('Sender information is required');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required. Please log in again.');
      }

      console.log('Sending email to candidate:', request.candidate_id);

      const response = await supabase.functions.invoke('send-email', {
        body: request,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        console.error('Send email error:', response.error);
        throw new Error(response.error.message || 'Failed to send email');
      }

      console.log('Email sent successfully:', response.data);

      toast({
        title: "Email Sent",
        description: `Email sent successfully to ${request.candidate_id}`,
      });

      return true;
    } catch (error: any) {
      console.error('Error sending email:', error);
      
      let userMessage = error.message;
      if (error.message?.includes('quota')) {
        userMessage = 'Daily email quota exceeded. Try again tomorrow.';
      } else if (error.message?.includes('suppressed')) {
        userMessage = 'This email address has unsubscribed from emails.';
      }

      toast({
        title: "Error",
        description: userMessage,
        variant: "destructive"
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const getEmailTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('job_role', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Error",
        description: "Failed to load email templates",
        variant: "destructive"
      });
      return [];
    }
  };

  const getQuotaStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('recruiter_quotas')
        .select('emails_sent, quota_limit')
        .eq('recruiter_id', session.user.id)
        .eq('date', today)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return {
        emails_sent: data?.emails_sent || 0,
        quota_limit: data?.quota_limit || 50,
        remaining: (data?.quota_limit || 50) - (data?.emails_sent || 0)
      };
    } catch (error: any) {
      console.error('Error fetching quota:', error);
      return null;
    }
  };

  return {
    isLoading,
    draft,
    setDraft,
    autoGenerateEmail,
    draftEmail,
    sendEmail,
    getEmailTemplates,
    getQuotaStatus,
    getUserProfile
  };
};
