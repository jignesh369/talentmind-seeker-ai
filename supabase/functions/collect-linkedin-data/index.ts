import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { saveCandidateWithSource } from '../shared/database-operations.ts'
import { buildCandidate } from '../shared/candidate-builder.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const apifyApiKey = Deno.env.get('APIFY_API_KEY')
    const supabase = createClient(supabaseUrl, supabaseKey)

    if (!apifyApiKey) {
      return new Response(
        JSON.stringify({ error: 'Apify API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Build LinkedIn search queries based on enhanced query
    const skills = enhancedQuery?.skills || []
    const keywords = enhancedQuery?.keywords || []
    const searchTerms = [...skills, ...keywords].filter(Boolean)

    const searchQueries = [
      `${searchTerms.slice(0, 3).join(' ')} software engineer ${location || ''}`,
      `${searchTerms.slice(0, 2).join(' ')} developer ${location || ''}`,
      `${searchTerms[0] || 'software'} programmer ${location || ''}`
    ]

    const candidates = []
    const seenProfiles = new Set()

    for (const searchQuery of searchQueries) {
      try {
        console.log(`Searching LinkedIn for: ${searchQuery}`)

        // Use Apify LinkedIn scraper
        const apifyResponse = await fetch(`https://api.apify.com/v2/acts/clever-lemon~linkedin-people-search-scraper/run-sync-get-dataset-items`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apifyApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            searchKeywords: searchQuery,
            maxProfiles: 10,
            includeContactInfo: false,
            locations: location ? [location] : undefined
          })
        })

        if (!apifyResponse.ok) {
          console.error(`Apify LinkedIn error: ${apifyResponse.status}`)
          continue
        }

        const profiles = await apifyResponse.json()
        console.log(`Found ${profiles.length} LinkedIn profiles`)

        for (const profile of profiles) {
          if (!profile.profileUrl || seenProfiles.has(profile.profileUrl)) continue
          seenProfiles.add(profile.profileUrl)

          // Extract skills from profile
          const extractedSkills = extractSkillsFromLinkedInProfile(profile, searchTerms)
          
          // Validate if this is a developer profile
          if (!isDeveloperProfile(profile, extractedSkills)) continue

          // Use shared candidate builder
          const candidate = buildCandidate({
            name: profile.fullName || 'LinkedIn Professional',
            title: profile.currentPosition?.title || extractTitleFromProfile(profile),
            location: profile.location || location || '',
            summary: profile.summary || profile.about || '',
            skills: extractedSkills,
            experience_years: estimateExperienceFromLinkedIn(profile),
            last_active: new Date().toISOString(),
            platform: 'linkedin',
            platformSpecificData: {
              connectionsCount: profile.connectionsCount,
              pastPositions: profile.pastPositions
            }
          })

          // Override with LinkedIn-specific scores
          candidate.overall_score = calculateLinkedInScore(profile, extractedSkills)
          candidate.skill_match = calculateSkillMatch(extractedSkills, searchTerms)
          candidate.experience = calculateExperienceScore(profile)
          candidate.reputation = 70
          candidate.freshness = 80
          candidate.social_proof = 60

          const sourceData = {
            candidate_id: candidate.id,
            platform: 'linkedin',
            platform_id: profile.profileUrl,
            url: profile.profileUrl,
            data: profile
          }

          // Use shared database operations
          const saveResult = await saveCandidateWithSource(supabase, candidate, sourceData)
          
          if (saveResult.success) {
            candidates.push(candidate)
            console.log(`💾 Saved LinkedIn candidate: ${candidate.name}`)
          } else {
            console.error(`❌ Failed to save LinkedIn candidate:`, saveResult.error)
          }
        }

      } catch (error) {
        console.error(`Error processing LinkedIn query ${searchQuery}:`, error)
        continue
      }
    }

    console.log(`Collected ${candidates.length} LinkedIn candidates`)

    return new Response(
      JSON.stringify({ 
        candidates,
        total: candidates.length,
        source: 'linkedin'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error collecting LinkedIn data:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to collect LinkedIn data' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function extractSkillsFromLinkedInProfile(profile, searchTerms) {
  const skills = []
  const text = `${profile.currentPosition?.title || ''} ${profile.summary || ''} ${profile.about || ''}`.toLowerCase()
  
  const techSkills = [
    'python', 'javascript', 'typescript', 'java', 'c++', 'c#', 'go', 'rust', 'php', 'ruby',
    'react', 'vue', 'angular', 'node.js', 'django', 'flask', 'fastapi', 'spring', 'laravel',
    'machine learning', 'ml', 'ai', 'data science', 'backend', 'frontend', 'full stack',
    'devops', 'cloud', 'aws', 'azure', 'docker', 'kubernetes', 'tensorflow', 'pytorch',
    'sql', 'mongodb', 'postgresql', 'redis', 'elasticsearch'
  ]

  for (const skill of techSkills) {
    if (text.includes(skill) || text.includes(skill.replace(/[.\s]/g, ''))) {
      skills.push(skill)
    }
  }

  for (const term of searchTerms) {
    if (text.includes(term.toLowerCase()) && !skills.includes(term)) {
      skills.push(term)
    }
  }

  return skills.slice(0, 10)
}

function isDeveloperProfile(profile, skills) {
  const title = (profile.currentPosition?.title || '').toLowerCase()
  const about = (profile.summary || profile.about || '').toLowerCase()
  
  const devKeywords = ['developer', 'engineer', 'programmer', 'architect', 'lead', 'senior', 'software', 'technical', 'coding', 'programming']
  
  return skills.length > 0 || 
         devKeywords.some(keyword => title.includes(keyword) || about.includes(keyword))
}

function extractTitleFromProfile(profile) {
  return profile.currentPosition?.title || 
         profile.pastPositions?.[0]?.title || 
         'Software Professional'
}

function estimateExperienceFromLinkedIn(profile) {
  if (profile.pastPositions?.length) {
    return Math.min(profile.pastPositions.length * 2, 15)
  }
  
  const title = (profile.currentPosition?.title || '').toLowerCase()
  if (title.includes('senior') || title.includes('lead')) return 7
  if (title.includes('mid') || title.includes('intermediate')) return 4
  if (title.includes('junior') || title.includes('entry')) return 2
  
  return 3
}

function calculateLinkedInScore(profile, skills) {
  let score = 40
  
  score += skills.length * 6
  score += profile.summary ? 10 : 0
  score += profile.currentPosition ? 15 : 0
  score += profile.pastPositions?.length ? Math.min(profile.pastPositions.length * 3, 15) : 0
  score += profile.connectionsCount ? Math.min(profile.connectionsCount / 100, 10) : 0
  
  return Math.min(score, 100)
}

function calculateSkillMatch(extractedSkills, searchTerms) {
  const matches = searchTerms.filter(term => 
    extractedSkills.some(skill => 
      skill.toLowerCase().includes(term.toLowerCase()) || 
      term.toLowerCase().includes(skill.toLowerCase())
    )
  )
  
  return Math.min((matches.length / Math.max(searchTerms.length, 1)) * 100, 100)
}

function calculateExperienceScore(profile) {
  const years = estimateExperienceFromLinkedIn(profile)
  return Math.min(years * 8, 90)
}
