
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "npm:resend@2.0.0";

const resendApiKey = Deno.env.get('RESEND_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const resend = new Resend(resendApiKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendEmailRequest {
  candidate_id: string;
  subject: string;
  body: string;
  sender_email: string;
  sender_name: string;
  openai_response_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from authorization header
    const authorization = req.headers.get('authorization');
    if (!authorization) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authorization.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { candidate_id, subject, body, sender_email, sender_name, openai_response_id }: SendEmailRequest = await req.json();

    // Get candidate details
    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .select('email, name')
      .eq('id', candidate_id)
      .single();

    if (candidateError || !candidate || !candidate.email) {
      throw new Error('Candidate not found or no email available');
    }

    // Check if email is suppressed
    const { data: suppressed } = await supabase
      .from('email_suppressions')
      .select('id')
      .eq('email', candidate.email)
      .single();

    if (suppressed) {
      throw new Error('Email address is suppressed (unsubscribed)');
    }

    // Check daily quota
    const today = new Date().toISOString().split('T')[0];
    const { data: quota } = await supabase
      .from('recruiter_quotas')
      .select('emails_sent, quota_limit')
      .eq('recruiter_id', user.id)
      .eq('date', today)
      .single();

    if (quota && quota.emails_sent >= quota.quota_limit) {
      throw new Error('Daily email quota exceeded (50 emails/day)');
    }

    // Add unsubscribe footer
    const unsubscribeUrl = `${supabaseUrl}/functions/v1/unsubscribe?email=${encodeURIComponent(candidate.email)}`;
    const emailBody = `${body}

---
Best regards,
${sender_name}

To unsubscribe from future emails, click here: ${unsubscribeUrl}
This email was sent by TalentMind recruiting platform.`;

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: `${sender_name} <${sender_email}>`,
      to: [candidate.email],
      subject: subject,
      text: emailBody,
      tags: [
        { name: 'type', value: 'outreach' },
        { name: 'candidate_id', value: candidate_id }
      ]
    });

    if (emailResponse.error) {
      throw new Error(`Resend error: ${emailResponse.error.message}`);
    }

    // Log email in database
    const { error: logError } = await supabase
      .from('email_logs')
      .insert({
        candidate_id,
        recruiter_id: user.id,
        subject,
        body: emailBody,
        recipient_email: candidate.email,
        sender_email,
        openai_response_id,
        resend_message_id: emailResponse.data?.id,
        status: 'sent'
      });

    if (logError) {
      console.error('Failed to log email:', logError);
    }

    // Update quota
    await supabase
      .from('recruiter_quotas')
      .upsert({
        recruiter_id: user.id,
        date: today,
        emails_sent: (quota?.emails_sent || 0) + 1,
        quota_limit: quota?.quota_limit || 50
      });

    return new Response(JSON.stringify({
      status: 'sent',
      message_id: emailResponse.data?.id,
      recipient: candidate.email
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in send-email function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
