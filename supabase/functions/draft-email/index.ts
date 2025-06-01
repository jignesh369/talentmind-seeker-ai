
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DraftEmailRequest {
  candidate_id: string;
  job_title: string;
  company: string;
  job_description?: string;
  tone: 'professional' | 'friendly' | 'casual' | 'direct';
  template_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { candidate_id, job_title, company, job_description, tone, template_id }: DraftEmailRequest = await req.json();

    // Get candidate details
    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', candidate_id)
      .single();

    if (candidateError || !candidate) {
      throw new Error('Candidate not found');
    }

    // Get email template
    let systemPrompt = '';
    if (template_id) {
      const { data: template } = await supabase
        .from('email_templates')
        .select('system_prompt')
        .eq('id', template_id)
        .single();
      systemPrompt = template?.system_prompt || '';
    } else {
      const { data: defaultTemplate } = await supabase
        .from('email_templates')
        .select('system_prompt')
        .eq('tone', tone)
        .eq('is_default', true)
        .single();
      systemPrompt = defaultTemplate?.system_prompt || 'You are a professional tech recruiter writing personalized outreach emails.';
    }

    // Prepare candidate context
    const candidateContext = {
      name: candidate.name,
      title: candidate.title || 'Developer',
      location: candidate.location || 'Unknown location',
      skills: candidate.skills || [],
      summary: candidate.summary || '',
      experience_years: candidate.experience_years || 0,
      github_username: candidate.github_username,
      overall_score: candidate.overall_score || 0
    };

    const userPrompt = `
Generate a personalized outreach email for the following candidate and job opportunity:

CANDIDATE PROFILE:
- Name: ${candidateContext.name}
- Current Title: ${candidateContext.title}
- Location: ${candidateContext.location}
- Experience: ${candidateContext.experience_years} years
- Key Skills: ${candidateContext.skills.slice(0, 5).join(', ')}
- GitHub: ${candidateContext.github_username ? `@${candidateContext.github_username}` : 'Not provided'}
- Profile Summary: ${candidateContext.summary.substring(0, 200)}...
- Overall Score: ${candidateContext.overall_score}/100

JOB OPPORTUNITY:
- Position: ${job_title}
- Company: ${company}
- Description: ${job_description || 'Exciting opportunity in tech'}

REQUIREMENTS:
- Write a compelling subject line (max 60 characters)
- Write an email body (max 800 characters)
- Personalize based on the candidate's background
- Include a clear call to action
- Maintain the specified tone: ${tone}

Return your response as JSON with "subject" and "body" fields only.
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: "json_object" },
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedContent = JSON.parse(data.choices[0].message.content);

    // Validate content length
    if (generatedContent.body.length > 1000) {
      throw new Error('Generated email content too long');
    }

    return new Response(JSON.stringify({
      subject: generatedContent.subject,
      body: generatedContent.body,
      candidate: candidateContext,
      openai_response_id: data.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in draft-email function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
