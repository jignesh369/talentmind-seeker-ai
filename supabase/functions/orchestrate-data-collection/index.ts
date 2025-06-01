
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, location, sources = ['github', 'stackoverflow', 'google'] } = await req.json()

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log(`Starting data collection for query: ${query}`)

    const results = {
      github: { candidates: [], total: 0, error: null },
      stackoverflow: { candidates: [], total: 0, error: null },
      google: { candidates: [], total: 0, error: null }
    }

    // Collect from GitHub
    if (sources.includes('github')) {
      try {
        const response = await supabase.functions.invoke('collect-github-data', {
          body: { query, location }
        })
        if (response.error) throw response.error
        results.github = response.data || { candidates: [], total: 0 }
      } catch (error) {
        console.error('GitHub collection error:', error)
        results.github.error = error.message
      }
    }

    // Collect from Stack Overflow
    if (sources.includes('stackoverflow')) {
      try {
        const response = await supabase.functions.invoke('collect-stackoverflow-data', {
          body: { query }
        })
        if (response.error) throw response.error
        results.stackoverflow = response.data || { candidates: [], total: 0 }
      } catch (error) {
        console.error('Stack Overflow collection error:', error)
        results.stackoverflow.error = error.message
      }
    }

    // Collect from Google Search
    if (sources.includes('google')) {
      try {
        const response = await supabase.functions.invoke('collect-google-search-data', {
          body: { query, location }
        })
        if (response.error) throw response.error
        results.google = response.data || { candidates: [], total: 0 }
      } catch (error) {
        console.error('Google Search collection error:', error)
        results.google.error = error.message
      }
    }

    const totalCandidates = results.github.total + results.stackoverflow.total + results.google.total

    console.log(`Data collection completed. Total candidates: ${totalCandidates}`)

    return new Response(
      JSON.stringify({ 
        results,
        total_candidates: totalCandidates,
        query,
        location,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in data collection orchestration:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to orchestrate data collection' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
