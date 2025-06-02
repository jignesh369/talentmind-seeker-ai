
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
  job_title?: string;
  company?: string;
  job_description?: string;
  tone: 'professional' | 'friendly' | 'casual' | 'direct';
  template_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('=== Draft Email Function Started ===');
  
  try {
    // Enhanced OpenAI API key validation
    if (!openAIApiKey) {
      console.error('❌ OpenAI API key is not configured in Supabase secrets');
      return new Response(JSON.stringify({ 
        error: 'OpenAI API key not configured. Please set the OPENAI_API_KEY in Supabase secrets.',
        code: 'API_KEY_MISSING'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (openAIApiKey.length < 20) {
      console.error('❌ OpenAI API key appears to be invalid (too short)');
      return new Response(JSON.stringify({ 
        error: 'OpenAI API key appears to be invalid. Please verify the key in Supabase secrets.',
        code: 'API_KEY_INVALID'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ OpenAI API key validated, length:', openAIApiKey.length);

    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (error) {
      console.error('❌ Invalid JSON in request body:', error);
      return new Response(JSON.stringify({ 
        error: 'Invalid request format',
        code: 'INVALID_REQUEST'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { candidate_id, job_title, company, job_description, tone, template_id }: DraftEmailRequest = requestBody;

    if (!candidate_id) {
      console.error('❌ Missing candidate_id in request');
      return new Response(JSON.stringify({ 
        error: 'Candidate ID is required',
        code: 'MISSING_CANDIDATE_ID'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('📋 Processing request for candidate:', candidate_id);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get candidate details with enhanced error handling
    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .select(`
        *,
        candidate_sources (
          platform,
          platform_id,
          url,
          data
        )
      `)
      .eq('id', candidate_id)
      .single();

    if (candidateError) {
      console.error('❌ Database error fetching candidate:', candidateError);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch candidate data',
        code: 'DATABASE_ERROR'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!candidate) {
      console.error('❌ Candidate not found:', candidate_id);
      return new Response(JSON.stringify({ 
        error: 'Candidate not found',
        code: 'CANDIDATE_NOT_FOUND'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!candidate.email) {
      console.error('❌ Candidate has no email address:', candidate_id);
      return new Response(JSON.stringify({ 
        error: 'Candidate does not have an email address',
        code: 'NO_EMAIL_ADDRESS'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Candidate data retrieved for:', candidate.name, 'Email:', candidate.email);

    // Prepare enriched candidate context
    const candidateContext = {
      name: candidate.name,
      title: candidate.title || 'Developer',
      location: candidate.location || 'Unknown location',
      skills: candidate.skills || [],
      summary: candidate.summary || '',
      experience_years: candidate.experience_years || 0,
      github_username: candidate.github_username,
      overall_score: candidate.overall_score || 0,
      skill_match: candidate.skill_match || 0,
      reputation: candidate.reputation || 0,
      last_active: candidate.last_active,
      sources: candidate.candidate_sources || []
    };

    // Enhanced system prompt
    const systemPrompt = `You are an expert tech recruiter specializing in AI-powered personalized outreach. Your goal is to create compelling, highly personalized recruitment emails that feel authentic and human.

PERSONALIZATION GUIDELINES:
- Reference specific skills that match the role
- Mention relevant experience and projects when available
- Use the candidate's background to create meaningful connections
- Include subtle social proof elements (GitHub activity, scores, etc.)
- Keep the tone professional but warm and engaging
- Always include a clear call to action
- ALWAYS end the email with the specific signature provided

AVOID:
- Generic templates or copy-paste content
- Overly salesy language
- Mentioning internal scoring systems directly
- Being too pushy or aggressive

RESPONSE FORMAT:
Return ONLY valid JSON with "subject" and "body" fields.`;

    const userPrompt = `
Create a highly personalized outreach email for this candidate:

CANDIDATE PROFILE:
- Name: ${candidateContext.name}
- Current Title: ${candidateContext.title}
- Location: ${candidateContext.location}
- Experience: ${candidateContext.experience_years} years
- Top Skills: ${candidateContext.skills.slice(0, 8).join(', ')}
- GitHub: ${candidateContext.github_username ? `@${candidateContext.github_username}` : 'Not available'}
- Profile Summary: ${candidateContext.summary ? candidateContext.summary.substring(0, 300) : 'No summary available'}
- Last Active: ${candidateContext.last_active ? new Date(candidateContext.last_active).toLocaleDateString() : 'Recently active'}
- Found on: ${candidateContext.sources.map(s => s.platform).join(', ') || 'Various platforms'}

JOB OPPORTUNITY:
- Position: ${job_title || 'Exciting Tech Role'}
- Company: ${company || 'TalentMind'}
- Description: ${job_description || 'Join our innovative team working on cutting-edge AI/HR technology solutions. We\'re building the future of recruitment and need talented individuals like you.'}

PERSONALIZATION REQUIREMENTS:
1. Reference 2-3 specific skills that align with the role
2. Mention their experience level appropriately
3. If GitHub username exists, subtly reference their development work
4. Use their location for any relevant context
5. Create authentic connection between their background and our needs
6. Keep subject line under 50 characters
7. Keep email body under 200 words
8. Tone: ${tone}
9. MANDATORY: End the email with this exact signature format:

Best regards,

Parijat Chatterjee
Co Founder
TalentMind

Return JSON with "subject" and "body" fields. Make it feel like a real human recruiter wrote this after researching the candidate.
`;

    console.log('🤖 Making OpenAI API request...');

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
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    console.log('📡 OpenAI API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error details:', errorText);
      
      if (response.status === 401) {
        return new Response(JSON.stringify({ 
          error: 'OpenAI API authentication failed. Please verify your API key is correct and has not expired.',
          code: 'API_KEY_UNAUTHORIZED',
          details: 'The API key may be invalid, expired, or lack the necessary permissions.'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'OpenAI API rate limit exceeded. Please try again in a moment.',
          code: 'RATE_LIMIT_EXCEEDED'
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ OpenAI API response received successfully');

    // Parse and validate the generated content
    let generatedContent;
    try {
      generatedContent = JSON.parse(data.choices[0].message.content);
    } catch (parseError) {
      console.error('❌ Failed to parse AI-generated content:', data.choices[0].message.content);
      return new Response(JSON.stringify({ 
        error: 'Failed to parse AI response. Please try again.',
        code: 'AI_PARSE_ERROR'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate generated content
    if (!generatedContent.subject || !generatedContent.body) {
      console.error('❌ AI generated incomplete content:', generatedContent);
      return new Response(JSON.stringify({ 
        error: 'AI generated incomplete email content. Please try again.',
        code: 'INCOMPLETE_CONTENT'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Email draft generated successfully for:', candidate.name);

    return new Response(JSON.stringify({
      subject: generatedContent.subject,
      body: generatedContent.body,
      candidate: candidateContext,
      openai_response_id: data.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Error in draft-email function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An unexpected error occurred',
      code: 'FUNCTION_ERROR'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
