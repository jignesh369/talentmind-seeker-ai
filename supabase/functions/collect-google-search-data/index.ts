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

    console.log('🚀 Starting enhanced Google Search candidate collection...')

    const candidates = []
    const seenUrls = new Set()

    const searchResults = await searchGoogle(query, location)

    if (!searchResults || searchResults.length === 0) {
      console.log('No search results found for query:', query)
      return new Response(
        JSON.stringify({ 
          candidates: [], 
          total: 0, 
          source: 'google',
          message: 'No search results found'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    for (const result of searchResults.slice(0, 15)) {
      if (seenUrls.has(result.link)) continue
      seenUrls.add(result.link)

      try {
        const relevanceScore = Math.round(calculateRelevanceScore(result, query))
        const qualityScore = Math.round(calculateQualityScore(result))
        const overallScore = Math.round((relevanceScore + qualityScore) / 2)

        const candidateId = generateUUID()

        const candidate = {
          id: candidateId,
          name: result.title,
          title: extractTitleFromSnippet(result.snippet) || `${query} Professional`,
          location: location || extractLocationFromSnippet(result.snippet) || '',
          avatar_url: null,
          email: extractEmailFromSnippet(result.snippet),
          summary: result.snippet,
          skills: extractSkillsFromSnippet(result.snippet, enhancedQuery?.skills || []),
          experience_years: Math.round(extractExperienceFromSnippet(result.snippet)),
          last_active: new Date().toISOString(),
          overall_score: Math.min(Math.max(overallScore, 0), 100),
          skill_match: Math.min(Math.max(relevanceScore, 0), 100),
          experience: Math.min(Math.max(Math.round(extractExperienceFromSnippet(result.snippet) * 10), 0), 100),
          reputation: Math.min(Math.max(qualityScore, 0), 100),
          freshness: Math.round(calculateFreshnessScore(result)),
          social_proof: Math.round(calculateSocialProofScore(result)),
          risk_flags: [],
          platform: 'google'
        }

        try {
          const enhanceResponse = await supabase.functions.invoke('enhance-candidate-profile', {
            body: { candidate, platform: 'google' }
          })

          if (enhanceResponse.data?.enhanced_candidate) {
            Object.assign(candidate, enhanceResponse.data.enhanced_candidate)
          }
        } catch (error) {
          console.log(`⚠️ AI enhancement failed for Google result, continuing with basic profile`)
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
            console.error(`❌ Error inserting Google candidate:`, insertError)
            continue
          }

          console.log(`✅ Inserted new Google candidate: ${candidate.name} with ID: ${candidateId}`)

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
            console.error(`❌ Error saving Google source data:`, sourceError)
          } else {
            console.log(`✅ Saved source data for Google candidate: ${candidate.name}`)
          }

        } catch (error) {
          console.error(`❌ Critical error saving Google candidate:`, error)
        }

      } catch (error) {
        console.error(`❌ Error processing Google result:`, error)
        continue
      }
    }

    const sortedCandidates = candidates.sort((a, b) => b.overall_score - a.overall_score).slice(0, 25)

    console.log(`✅ Google Search collection completed: ${sortedCandidates.length} enhanced candidates`)

    return new Response(
      JSON.stringify({ 
        candidates: sortedCandidates,
        total: sortedCandidates.length,
        source: 'google'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error collecting Google Search data:', error)
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

function extractExperienceFromSnippet(snippet: string): number {
  const experienceRegex = /(\d+)\+?\s*(?:year|yr)s?\s*(?:of\s*)?(?:experience|exp)/i
  const match = snippet.match(experienceRegex)
  return match ? parseInt(match[1], 10) : 3
}

function calculateFreshnessScore(result: any): number {
  return Math.floor(Math.random() * 30) + 70
}

function calculateSocialProofScore(result: any): number {
  const authorityDomains = ['github.com', 'linkedin.com', 'stackoverflow.com']
  const isAuthorityDomain = authorityDomains.some(domain => result.link.includes(domain))
  return isAuthorityDomain ? Math.floor(Math.random() * 20) + 80 : Math.floor(Math.random() * 40) + 40
}

function extractSkillsFromSnippet(snippet: string, enhancedSkills: string[] = []): string[] {
  const skillKeywords = enhancedSkills.length > 0 ? enhancedSkills : ['javascript', 'python', 'java', 'react', 'angular', 'vue.js', 'node.js', 'sql', 'docker', 'aws', 'azure', 'gcp']
  const skills = skillKeywords.filter(skill => snippet.toLowerCase().includes(skill.toLowerCase()))
  return skills
}
