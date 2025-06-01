
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
    const enhancedQuery = await enhanceQueryWithAI(query, openaiApiKey)
    console.log('Enhanced query:', enhancedQuery)

    // Step 2: Collect from each source with improved validation
    for (const source of sources) {
      try {
        console.log(`Collecting from ${source}...`)
        
        const functionName = source === 'google' ? 'collect-google-search-data' : `collect-${source}-data`
        
        // Collect raw data with timeout
        const { data: rawData, error: collectError } = await Promise.race([
          supabase.functions.invoke(functionName, {
            body: { query: enhancedQuery.searchTerms.join(' '), location, enhancedQuery }
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 45000))
        ])

        if (collectError) throw collectError

        const rawCandidates = rawData?.candidates || []
        results[source].total = rawCandidates.length

        console.log(`Collected ${rawCandidates.length} raw candidates from ${source}`)

        // Step 3: AI-powered validation and enrichment
        const validatedCandidates = []
        
        if (rawCandidates.length > 0) {
          for (const candidate of rawCandidates.slice(0, 15)) {
            try {
              // Step 3a: Pre-validation using AI
              const isValidCandidate = await validateCandidateWithAI(candidate, enhancedQuery, openaiApiKey)
              
              if (!isValidCandidate) {
                console.log(`Candidate ${candidate.name} failed AI validation`)
                continue
              }

              // Step 3b: Enrich candidate profile using Perplexity
              const enrichedCandidate = await enrichCandidateProfile(candidate, perplexityApiKey)
              
              // Step 3c: Calculate enhanced scoring with AI
              const scoredCandidate = await calculateEnhancedScoring(enrichedCandidate, enhancedQuery, openaiApiKey)
              
              // Step 3d: Final quality check
              if (scoredCandidate.overall_score >= 40) {
                validatedCandidates.push(scoredCandidate)
              }
            } catch (error) {
              console.error(`Error processing candidate ${candidate.name}:`, error)
            }
          }
        }

        results[source].candidates = validatedCandidates
        results[source].validated = validatedCandidates.length

        // Step 4: Store validated candidates with deduplication
        if (validatedCandidates.length > 0) {
          await storeCandidatesWithDeduplication(validatedCandidates, supabase)
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
    return JSON.parse(text)
  } catch {
    const cleanText = text
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim()
    
    try {
      return JSON.parse(cleanText)
    } catch {
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

async function enhanceQueryWithAI(query, openaiApiKey) {
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
            - searchTerms: array of alternative search terms to use (include specific keywords for developers)
            - role_types: array of job titles/roles
            - keywords: array of important keywords for validation`
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
      role_types: [],
      keywords: query.split(' ').filter(w => w.length > 2)
    }
  } catch (error) {
    console.error('Error enhancing query:', error)
    return {
      skills: [],
      experience_level: 'any',
      experience_min: 0,
      location_preferences: [],
      searchTerms: [query],
      role_types: [],
      keywords: query.split(' ').filter(w => w.length > 2)
    }
  }
}

async function validateCandidateWithAI(candidate, enhancedQuery, openaiApiKey) {
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
            
            Validate based on:
            1. Does the candidate have relevant technical skills matching the query?
            2. Is their experience level appropriate?
            3. Is their profile complete and professional?
            4. Are they likely a real, active developer/professional?
            5. Do their skills match the required keywords?
            
            Return only "true" if the candidate passes ALL validation criteria, "false" otherwise.
            Be strict - only validate high-quality, relevant candidates.`
          },
          {
            role: 'user',
            content: `Search criteria: ${JSON.stringify(enhancedQuery)}
            
            Candidate: ${JSON.stringify({
              name: candidate.name,
              title: candidate.title,
              summary: candidate.summary,
              skills: candidate.skills,
              experience_years: candidate.experience_years,
              location: candidate.location
            })}`
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
    const searchQuery = `${candidate.name} ${candidate.github_username || ''} ${candidate.title || ''} developer programmer engineer`
    
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
            content: 'You are a talent researcher. Find additional professional information about this developer. Return only factual, verifiable information in JSON format with fields: summary, experience_years, specializations, notable_projects, current_company, verified_skills.'
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
      current_company: enrichmentData.current_company,
      verified_skills: enrichmentData.verified_skills || candidate.skills
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
            - overall_score: overall match quality (weighted average of other scores)
            - skill_match: how well skills match requirements
            - experience: experience level appropriateness
            - reputation: professional reputation and activity
            - freshness: recent activity and relevance
            - social_proof: community involvement and recognition
            - risk_flags: array of any concerns (strings)
            
            Be thorough and consider all available information.`
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

async function storeCandidatesWithDeduplication(candidates, supabase) {
  try {
    for (const candidate of candidates) {
      // Check for duplicates using multiple criteria
      const { data: existing } = await supabase
        .from('candidates')
        .select('id, name, github_username, email')
        .or(`name.eq.${candidate.name},github_username.eq.${candidate.github_username || 'null'},email.eq.${candidate.email || 'null'}`)

      if (existing && existing.length > 0) {
        console.log(`Duplicate candidate found: ${candidate.name}, skipping...`)
        continue
      }

      // Insert new candidate with validation
      const candidateData = {
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
        experience_years: candidate.experience_years || 0,
        last_active: candidate.last_active,
        overall_score: Math.round(candidate.overall_score || 0),
        skill_match: Math.round(candidate.skill_match || 0),
        experience: Math.round(candidate.experience || 0),
        reputation: Math.round(candidate.reputation || 0),
        freshness: Math.round(candidate.freshness || 0),
        social_proof: Math.round(candidate.social_proof || 0),
        risk_flags: candidate.risk_flags || []
      }

      const { error } = await supabase
        .from('candidates')
        .insert(candidateData)

      if (error) {
        console.error('Error storing candidate:', error)
      } else {
        console.log(`Successfully stored candidate: ${candidate.name}`)
      }
    }
  } catch (error) {
    console.error('Error in storeCandidatesWithDeduplication:', error)
  }
}
