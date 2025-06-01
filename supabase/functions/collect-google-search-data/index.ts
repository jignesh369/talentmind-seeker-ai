
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { searchGoogle, extractTitleFromSnippet, extractLocationFromSnippet, extractEmailFromSnippet, extractSkillsFromSnippet } from './api-client.ts'
import { calculateRelevanceScore, calculateQualityScore } from './scoring-engine.ts'

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
    const { query, location, enhancedQuery } = await req.json()

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

    console.log('🚀 Starting Google Search candidate collection...')
    console.log(`Query: "${query}", Location: "${location || 'Not specified'}"`)

    const candidates = []
    const seenUrls = new Set()
    const startTime = Date.now()

    // Simplified search query for better results
    const simplifiedQuery = query.split(' ').slice(0, 3).join(' ')
    console.log(`🔍 Simplified query: "${simplifiedQuery}"`)
    
    const searchResults = await searchGoogle(simplifiedQuery, location)
    console.log(`📊 Google Search returned ${searchResults.length} results`)

    if (!searchResults || searchResults.length === 0) {
      console.log('⚠️ No search results found')
      return new Response(
        JSON.stringify({ 
          candidates: [], 
          total: 0, 
          source: 'google',
          message: 'No search results found - check API configuration',
          error: 'No results from Google Search API'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    for (const result of searchResults.slice(0, 8)) { // Process up to 8 results
      if (seenUrls.has(result.link)) continue
      seenUrls.add(result.link)

      try {
        const relevanceScore = Math.round(Math.min(Math.max(calculateRelevanceScore(result, simplifiedQuery), 0), 100))
        const qualityScore = Math.round(Math.min(Math.max(calculateQualityScore(result), 0), 100))
        const overallScore = Math.round((relevanceScore + qualityScore) / 2)

        const candidateId = generateUUID()

        const candidate = {
          id: candidateId,
          name: extractNameFromTitle(result.title) || `${simplifiedQuery} Professional`,
          title: extractTitleFromSnippet(result.snippet) || `${simplifiedQuery} Developer`,
          location: location || extractLocationFromSnippet(result.snippet) || '',
          avatar_url: null,
          email: extractEmailFromSnippet(result.snippet),
          summary: result.snippet || 'Professional found via Google Search',
          skills: extractSkillsFromSnippet(result.snippet, enhancedQuery?.skills || []),
          experience_years: Math.round(Math.min(Math.max(extractExperienceFromSnippet(result.snippet), 1), 20)),
          last_active: new Date().toISOString(),
          overall_score: overallScore,
          skill_match: relevanceScore,
          experience: Math.round(Math.min(Math.max(extractExperienceFromSnippet(result.snippet) * 8, 0), 100)),
          reputation: qualityScore,
          freshness: Math.round(Math.min(Math.max(calculateFreshnessScore(result), 0), 100)),
          social_proof: Math.round(Math.min(Math.max(calculateSocialProofScore(result), 0), 100)),
          risk_flags: [],
          platform: 'google'
        }

        candidates.push(candidate)

        try {
          const { error: insertError } = await supabase
            .from('candidates')
            .insert({
              id: candidateId,
              name: candidate.name,
              title: candidate.title,
              location: candidate.location,
              avatar_url: candidate.avatar_url,
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
              risk_flags: candidate.risk_flags
            })

          if (insertError) {
            console.error(`❌ Error inserting Google candidate:`, insertError.message)
            continue
          }

          console.log(`✅ Inserted Google candidate: ${candidate.name}`)

          const { error: sourceError } = await supabase
            .from('candidate_sources')
            .insert({
              candidate_id: candidateId,
              platform: 'google',
              platform_id: result.link,
              url: result.link,
              data: result
            })

          if (sourceError) {
            console.log(`⚠️ Source data save failed: ${sourceError.message}`)
          }

        } catch (error) {
          console.error(`❌ Database error for Google candidate:`, error.message)
        }

      } catch (error) {
        console.error(`❌ Error processing Google result:`, error.message)
        continue
      }
    }

    const sortedCandidates = candidates.sort((a, b) => b.overall_score - a.overall_score)
    const processingTime = Date.now() - startTime

    console.log(`✅ Google Search collection completed: ${sortedCandidates.length} candidates in ${processingTime}ms`)

    return new Response(
      JSON.stringify({ 
        candidates: sortedCandidates,
        total: sortedCandidates.length,
        source: 'google',
        processing_time_ms: processingTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error collecting Google Search data:', error.message)
    return new Response(
      JSON.stringify({ 
        candidates: [], 
        total: 0, 
        source: 'google',
        error: `Failed to collect Google Search data: ${error.message}`
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function extractNameFromTitle(title: string): string | null {
  // Extract name from LinkedIn URLs or titles
  const linkedinMatch = title.match(/([A-Z][a-z]+ [A-Z][a-z]+)/);
  if (linkedinMatch) return linkedinMatch[1];
  
  // Extract from professional titles
  const nameMatch = title.match(/^([A-Z][a-z]+ [A-Z][a-z]+)/);
  return nameMatch ? nameMatch[1] : null;
}

function extractExperienceFromSnippet(snippet: string): number {
  const experienceRegex = /(\d+)\+?\s*(?:year|yr)s?\s*(?:of\s*)?(?:experience|exp)/i
  const match = snippet.match(experienceRegex)
  return match ? Math.min(parseInt(match[1], 10), 20) : 3
}

function calculateFreshnessScore(result: any): number {
  return Math.floor(Math.random() * 30) + 70
}

function calculateSocialProofScore(result: any): number {
  const authorityDomains = ['github.com', 'linkedin.com', 'stackoverflow.com', 'medium.com']
  const isAuthorityDomain = authorityDomains.some(domain => result.link.includes(domain))
  return isAuthorityDomain ? Math.floor(Math.random() * 20) + 80 : Math.floor(Math.random() * 40) + 40
}
