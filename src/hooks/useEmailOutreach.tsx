
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DraftEmailRequest {
  candidate_id: string;
  job_title: string;
  company: string;
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

export const useEmailOutreach = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [draft, setDraft] = useState<EmailDraft | null>(null);
  const { toast } = useToast();

  const draftEmail = async (request: DraftEmailRequest): Promise<EmailDraft | null> => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('draft-email', {
        body: request,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw response.error;
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
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const sendEmail = async (request: SendEmailRequest): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('send-email', {
        body: request,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw response.error;
      }

      toast({
        title: "Email Sent",
        description: `Email sent successfully to ${request.candidate_id}`,
      });

      return true;
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send email",
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
    draftEmail,
    sendEmail,
    getEmailTemplates,
    getQuotaStatus
  };
};
