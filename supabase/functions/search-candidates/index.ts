
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
    const { query, user_id } = await req.json()

    if (!query || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Query and user_id are required' }),
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

    // Step 1: Parse the query
    const parseResponse = await fetch(`${supabaseUrl}/functions/v1/parse-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ query })
    })

    const { parsed_criteria } = await parseResponse.json()

    // Step 2: Save search to database
    const { data: searchData, error: searchError } = await supabase
      .from('searches')
      .insert({
        user_id,
        query,
        parsed_criteria,
        results_count: 0
      })
      .select()
      .single()

    if (searchError) {
      console.error('Error saving search:', searchError)
      throw searchError
    }

    // Step 3: Search existing candidates
    let candidatesQuery = supabase
      .from('candidates')
      .select('*')

    // Apply filters based on parsed criteria
    if (parsed_criteria.skills && parsed_criteria.skills.length > 0) {
      candidatesQuery = candidatesQuery.overlaps('skills', parsed_criteria.skills)
    }

    if (parsed_criteria.location) {
      candidatesQuery = candidatesQuery.ilike('location', `%${parsed_criteria.location}%`)
    }

    if (parsed_criteria.experience_min) {
      candidatesQuery = candidatesQuery.gte('experience_years', parsed_criteria.experience_min)
    }

    // Order by overall score
    candidatesQuery = candidatesQuery.order('overall_score', { ascending: false })

    const { data: candidates, error: candidatesError } = await candidatesQuery.limit(50)

    if (candidatesError) {
      console.error('Error fetching candidates:', candidatesError)
      throw candidatesError
    }

    // Step 4: Update search results count
    await supabase
      .from('searches')
      .update({ results_count: candidates?.length || 0 })
      .eq('id', searchData.id)

    console.log(`Found ${candidates?.length || 0} candidates for query: ${query}`)

    return new Response(
      JSON.stringify({ 
        candidates: candidates || [],
        search_id: searchData.id,
        parsed_criteria,
        total_results: candidates?.length || 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error searching candidates:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to search candidates' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
