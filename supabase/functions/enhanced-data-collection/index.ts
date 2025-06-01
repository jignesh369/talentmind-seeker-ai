
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log(`Starting enhanced data collection for query: ${query}`)

    const results = {
      github: { candidates: [], total: 0, validated: 0, error: null },
      stackoverflow: { candidates: [], total: 0, validated: 0, error: null },
      google: { candidates: [], total: 0, validated: 0, error: null }
    }

    // Step 1: Parse and enhance the query using OpenAI
    const enhancedQuery = await enhanceQuery(query, openaiApiKey)
    console.log('Enhanced query:', enhancedQuery)

    // Step 2: Collect from each source
    for (const source of sources) {
      try {
        console.log(`Collecting from ${source}...`)
        
        // Fix function name mapping
        const functionName = source === 'google' ? 'collect-google-search-data' : `collect-${source}-data`
        
        // Collect raw data with timeout
        const { data: rawData, error: collectError } = await Promise.race([
          supabase.functions.invoke(functionName, {
            body: { query: enhancedQuery.searchTerms.join(' '), location }
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 30000))
        ])

        if (collectError) throw collectError

        const rawCandidates = rawData?.candidates || []
        results[source].total = rawCandidates.length

        console.log(`Collected ${rawCandidates.length} raw candidates from ${source}`)

        // Step 3: Validate and enrich candidates using LLMs (only if we have candidates)
        const validatedCandidates = []
        
        if (rawCandidates.length > 0) {
          for (const candidate of rawCandidates.slice(0, 10)) { // Limit to first 10 for performance
            try {
              // Validate candidate using OpenAI
              const isValid = await validateCandidate(candidate, enhancedQuery, openaiApiKey)
              
              if (isValid) {
                // Enrich candidate profile using Perplexity
                const enrichedCandidate = await enrichCandidateProfile(candidate, perplexityApiKey)
                
                // Calculate enhanced scoring
                const scoredCandidate = await calculateEnhancedScoring(enrichedCandidate, enhancedQuery, openaiApiKey)
                
                validatedCandidates.push(scoredCandidate)
              }
            } catch (error) {
              console.error(`Error processing candidate ${candidate.name}:`, error)
            }
          }
        }

        results[source].candidates = validatedCandidates
        results[source].validated = validatedCandidates.length

        // Step 4: Store validated candidates
        if (validatedCandidates.length > 0) {
          await storeCandidates(validatedCandidates, supabase)
        }

      } catch (error) {
        console.error(`${source} collection error:`, error)
        results[source].error = error.message
      }
    }

    const totalCandidates = results.github.total + results.stackoverflow.total + results.google.total
    const totalValidated = results.github.validated + results.stackoverflow.validated + results.google.validated

    console.log(`Enhanced data collection completed. Total: ${totalCandidates}, Validated: ${totalValidated}`)

    return new Response(
      JSON.stringify({ 
        results,
        total_candidates: totalCandidates,
        total_validated: totalValidated,
        query,
        location,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in enhanced data collection:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to perform enhanced data collection' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function extractJSON(text) {
  try {
    // Try to parse directly first
    return JSON.parse(text)
  } catch {
    // Remove markdown code blocks and try again
    const cleanText = text
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim()
    
    try {
      return JSON.parse(cleanText)
    } catch {
      // Extract content between first { and last }
      const start = text.indexOf('{')
      const end = text.lastIndexOf('}')
      if (start !== -1 && end !== -1 && end > start) {
        try {
          return JSON.parse(text.substring(start, end + 1))
        } catch {
          console.error('Failed to parse JSON from text:', text)
          return null
        }
      }
      return null
    }
  }
}

async function enhanceQuery(query, openaiApiKey) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a talent acquisition expert. Parse the user's query and extract structured information for better candidate search.
            
            Return ONLY a valid JSON object (no markdown, no explanation) with:
            - skills: array of technical skills mentioned
            - experience_level: junior/mid/senior/lead
            - experience_min: minimum years of experience
            - location_preferences: array of locations if mentioned
            - searchTerms: array of alternative search terms to use
            - role_types: array of job titles/roles`
          },
          { role: 'user', content: query }
        ],
        temperature: 0.3
      }),
    })

    const data = await response.json()
    const content = data.choices[0].message.content
    const parsed = extractJSON(content)
    
    return parsed || {
      skills: [],
      experience_level: 'any',
      experience_min: 0,
      location_preferences: [],
      searchTerms: [query],
      role_types: []
    }
  } catch (error) {
    console.error('Error enhancing query:', error)
    return {
      skills: [],
      experience_level: 'any',
      experience_min: 0,
      location_preferences: [],
      searchTerms: [query],
      role_types: []
    }
  }
}

async function validateCandidate(candidate, enhancedQuery, openaiApiKey) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a candidate validation expert. Determine if this candidate is a good match for the search criteria.
            
            Return only "true" or "false" based on:
            1. Does the candidate have relevant technical skills?
            2. Is their experience level appropriate?
            3. Is their profile complete and professional?
            4. Are they likely a real, active developer?
            
            Be strict - only validate high-quality, relevant candidates.`
          },
          {
            role: 'user',
            content: `Search criteria: ${JSON.stringify(enhancedQuery)}
            
            Candidate: ${JSON.stringify(candidate)}`
          }
        ],
        temperature: 0.1
      }),
    })

    const data = await response.json()
    return data.choices[0].message.content.trim().toLowerCase() === 'true'
  } catch (error) {
    console.error('Error validating candidate:', error)
    return false
  }
}

async function enrichCandidateProfile(candidate, perplexityApiKey) {
  try {
    const searchQuery = `${candidate.name} ${candidate.github_username || ''} developer programmer engineer`
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a talent researcher. Find additional professional information about this developer. Return only factual, verifiable information in JSON format with fields: summary, experience_years, specializations, notable_projects, current_company.'
          },
          {
            role: 'user',
            content: `Find professional information about: ${searchQuery}`
          }
        ],
        temperature: 0.2,
        max_tokens: 500
      }),
    })

    const data = await response.json()
    const content = data.choices[0].message.content || '{}'
    const enrichmentData = extractJSON(content) || {}
    
    return {
      ...candidate,
      summary: enrichmentData.summary || candidate.summary,
      experience_years: enrichmentData.experience_years || candidate.experience_years,
      specializations: enrichmentData.specializations || [],
      notable_projects: enrichmentData.notable_projects || [],
      current_company: enrichmentData.current_company
    }
  } catch (error) {
    console.error('Error enriching candidate profile:', error)
    return candidate
  }
}

async function calculateEnhancedScoring(candidate, enhancedQuery, openaiApiKey) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a technical recruiter scoring candidates. Return ONLY a valid JSON object (no markdown) with scores (0-100) for:
            - overall_score: overall match quality
            - skill_match: how well skills match requirements
            - experience: experience level appropriateness
            - reputation: professional reputation and activity
            - freshness: recent activity and relevance
            - social_proof: community involvement and recognition
            - risk_flags: array of any concerns (strings)`
          },
          {
            role: 'user',
            content: `Search criteria: ${JSON.stringify(enhancedQuery)}
            
            Candidate: ${JSON.stringify(candidate)}`
          }
        ],
        temperature: 0.3
      }),
    })

    const data = await response.json()
    const content = data.choices[0].message.content
    const scores = extractJSON(content) || {}
    
    return {
      ...candidate,
      overall_score: scores.overall_score || 50,
      skill_match: scores.skill_match || 50,
      experience: scores.experience || 50,
      reputation: scores.reputation || 50,
      freshness: scores.freshness || 50,
      social_proof: scores.social_proof || 50,
      risk_flags: scores.risk_flags || []
    }
  } catch (error) {
    console.error('Error calculating enhanced scoring:', error)
    return {
      ...candidate,
      overall_score: 50,
      skill_match: 50,
      experience: 50,
      reputation: 50,
      freshness: 50,
      social_proof: 50,
      risk_flags: []
    }
  }
}

async function storeCandidates(candidates, supabase) {
  try {
    for (const candidate of candidates) {
      // Check if candidate already exists
      const { data: existing } = await supabase
        .from('candidates')
        .select('id')
        .eq('name', candidate.name)
        .eq('github_username', candidate.github_username)
        .maybeSingle()

      if (!existing) {
        // Insert new candidate
        const { error } = await supabase
          .from('candidates')
          .insert({
            name: candidate.name,
            title: candidate.title,
            location: candidate.location,
            avatar_url: candidate.avatar_url,
            email: candidate.email,
            github_username: candidate.github_username,
            stackoverflow_id: candidate.stackoverflow_id,
            reddit_username: candidate.reddit_username,
            summary: candidate.summary,
            skills: candidate.skills || [],
            experience_years: candidate.experience_years,
            last_active: candidate.last_active,
            overall_score: candidate.overall_score || 0,
            skill_match: candidate.skill_match || 0,
            experience: candidate.experience || 0,
            reputation: candidate.reputation || 0,
            freshness: candidate.freshness || 0,
            social_proof: candidate.social_proof || 0,
            risk_flags: candidate.risk_flags || []
          })

        if (error) {
          console.error('Error storing candidate:', error)
        }
      }
    }
  } catch (error) {
    console.error('Error in storeCandidates:', error)
  }
}
