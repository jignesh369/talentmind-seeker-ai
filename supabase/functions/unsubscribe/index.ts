
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const url = new URL(req.url);
    const email = url.searchParams.get('email');

    if (!email) {
      return new Response('Email parameter required', { status: 400 });
    }

    // Add email to suppression list
    const { error } = await supabase
      .from('email_suppressions')
      .upsert({
        email,
        reason: 'unsubscribed'
      });

    if (error) {
      console.error('Error adding to suppression list:', error);
      return new Response('Error processing unsubscribe', { status: 500 });
    }

    // Return simple HTML page
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Unsubscribed</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .success { color: #10b981; font-size: 18px; margin-bottom: 20px; }
            .info { color: #6b7280; }
        </style>
    </head>
    <body>
        <h1>✅ Successfully Unsubscribed</h1>
        <p class="success">The email address <strong>${email}</strong> has been removed from our mailing list.</p>
        <p class="info">You will no longer receive recruitment emails from TalentMind.</p>
        <p class="info">If you have any questions, please contact our support team.</p>
    </body>
    </html>
    `;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error) {
    console.error('Error in unsubscribe function:', error);
    return new Response('Internal server error', { status: 500 });
  }
});
