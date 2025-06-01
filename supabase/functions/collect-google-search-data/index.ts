
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { 
  searchGoogle, 
  extractTitleFromSnippet, 
  extractLocationFromSnippet, 
  extractEmailFromSnippet, 
  extractSkillsFromSnippet 
} from './api-client.ts'
import { calculateGoogleScore } from './scoring-engine.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generateUUID() {
  return crypto.randomUUID();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, location } = await req.json()

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
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log(`Query: "${query}", Location: "${location || 'Not specified'}"`)

    // Simplified query for better results
    const simplifiedQuery = query.split(' ').slice(0, 3).join(' ')
    console.log(`🔍 Simplified query: "${simplifiedQuery}"`)

    const startTime = Date.now()

    try {
      const searchResults = await searchGoogle(simplifiedQuery, location)
      console.log(`📊 Google Search returned ${searchResults.length} results`)

      const candidates = []
      const seenUrls = new Set()

      for (const result of searchResults.slice(0, 8)) { // Limit to 8 results
        if (seenUrls.has(result.link)) continue
        seenUrls.add(result.link)

        try {
          // Extract candidate information from search result
          const extractedTitle = extractTitleFromSnippet(result.snippet) || 
                                extractTitleFromSnippet(result.title) || 
                                'Professional'
          
          const extractedLocation = extractLocationFromSnippet(result.snippet) || location || ''
          const extractedEmail = extractEmailFromSnippet(result.snippet)
          const skills = extractSkillsFromSnippet(result.snippet + ' ' + result.title)

          // Generate candidate name from title or URL
          let candidateName = 'Professional'
          if (result.title && !result.title.toLowerCase().includes('job') && !result.title.toLowerCase().includes('hire')) {
            // Extract name from title, removing common words
            candidateName = result.title
              .replace(/\s*-.*$/, '') // Remove everything after dash
              .replace(/\s*\|.*$/, '') // Remove everything after pipe
              .split(' ')
              .slice(0, 3)
              .join(' ')
              .trim()
          }

          if (candidateName.length < 2) {
            candidateName = extractedTitle
          }

          // Calculate scores
          const scores = calculateGoogleScore({
            title: extractedTitle,
            skills,
            snippet: result.snippet,
            url: result.link
          })

          const candidateId = generateUUID()

          const candidate = {
            id: candidateId,
            name: candidateName,
            title: extractedTitle,
            location: extractedLocation,
            email: extractedEmail,
            summary: result.snippet,
            skills: skills,
            experience_years: Math.max(1, Math.floor(scores.experience / 10)),
            last_active: new Date().toISOString(),
            overall_score: scores.overall,
            skill_match: scores.skillMatch,
            experience: scores.experience,
            reputation: scores.reputation,
            freshness: scores.freshness,
            social_proof: scores.socialProof,
            risk_flags: [],
            platform: 'google'
          }

          candidates.push(candidate)

          // Save candidate to database with proper error handling
          try {
            console.log(`💾 Saving Google candidate: ${candidate.name}`)
            
            // Check for existing candidate by URL in sources
            const { data: existingSource, error: sourceSelectError } = await supabase
              .from('candidate_sources')
              .select('candidate_id')
              .eq('url', result.link)
              .maybeSingle()

            if (sourceSelectError) {
              console.error(`❌ Error checking existing source for ${result.link}:`, sourceSelectError.message)
              continue
            }

            if (existingSource) {
              // Update existing candidate
              const { error: updateError } = await supabase
                .from('candidates')
                .update({
                  name: candidate.name,
                  title: candidate.title,
                  location: candidate.location,
                  email: candidate.email,
                  summary: candidate.summary,
                  skills: candidate.skills,
                  experience_years: candidate.experience_years,
                  last_active: candidate.last_active,
                  overall_score: candidate.overall_score,
                  skill_match: candidate.skill_match,
                  experience: candidate.experience,
                  reputation: candidate.reputation,
                  freshness: candidate.freshness,
                  social_proof: candidate.social_proof,
                  updated_at: new Date().toISOString()
                })
                .eq('id', existingSource.candidate_id)

              if (updateError) {
                console.error(`❌ Error updating Google candidate:`, updateError.message)
                continue
              }

              console.log(`✅ Updated existing Google candidate: ${candidate.name}`)
              candidate.id = existingSource.candidate_id
            } else {
              // Insert new candidate
              const { error: insertError } = await supabase
                .from('candidates')
                .insert({
                  id: candidateId,
                  name: candidate.name,
                  title: candidate.title,
                  location: candidate.location,
                  email: candidate.email,
                  summary: candidate.summary,
                  skills: candidate.skills,
                  experience_years: candidate.experience_years,
                  last_active: candidate.last_active,
                  overall_score: candidate.overall_score,
                  skill_match: candidate.skill_match,
                  experience: candidate.experience,
                  reputation: candidate.reputation,
                  freshness: candidate.freshness,
                  social_proof: candidate.social_proof
                })

              if (insertError) {
                console.error(`❌ Error inserting Google candidate:`, insertError.message)
                continue
              }

              console.log(`✅ Inserted Google candidate: ${candidate.name}`)
            }

            // Add candidate source record
            if (!existingSource) {
              try {
                const { error: sourceError } = await supabase
                  .from('candidate_sources')
                  .insert({
                    candidate_id: candidate.id,
                    platform: 'google',
                    platform_id: result.link,
                    url: result.link,
                    data: {
                      search_result: result,
                      extracted_data: {
                        title: extractedTitle,
                        location: extractedLocation,
                        email: extractedEmail,
                        skills: skills
                      },
                      scores: scores
                    }
                  })

                if (sourceError) {
                  console.error(`⚠️ Failed to save Google source:`, sourceError.message)
                } else {
                  console.log(`📝 Saved Google source record`)
                }
              } catch (sourceErr) {
                console.error(`⚠️ Exception saving Google source:`, sourceErr)
              }
            }

          } catch (error) {
            console.error(`❌ Database operation failed for Google result:`, error.message)
            continue
          }

        } catch (error) {
          console.error(`❌ Error processing Google search result:`, error.message)
          continue
        }
      }

      const processingTime = Date.now() - startTime
      console.log(`✅ Google Search collection completed: ${candidates.length} candidates in ${processingTime}ms`)

      return new Response(
        JSON.stringify({ 
          candidates: candidates,
          total: candidates.length,
          source: 'google',
          processing_time_ms: processingTime
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (error) {
      console.error('❌ Google Search collection error:', error)
      return new Response(
        JSON.stringify({ 
          candidates: [], 
          total: 0, 
          source: 'google',
          error: 'Google Search API error: ' + error.message
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('❌ Error in Google Search data collection:', error)
    return new Response(
      JSON.stringify({ 
        candidates: [], 
        total: 0, 
        source: 'google',
        error: 'Failed to collect Google Search data' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
