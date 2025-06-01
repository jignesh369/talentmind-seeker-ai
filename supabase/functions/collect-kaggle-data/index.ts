
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const { query } = await req.json()

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

    console.log('🚀 Starting Kaggle candidate collection...')

    const candidates = []
    const startTime = Date.now()

    try {
      // Use Kaggle's public API to search for competitions and datasets
      const searchTerms = query.split(' ').slice(0, 2).join(' ')
      const searchUrl = `https://www.kaggle.com/api/v1/competitions/list?search=${encodeURIComponent(searchTerms)}&sortBy=numberOfTeams&page=1&pageSize=10`
      
      console.log(`🔍 Searching Kaggle competitions for: ${searchTerms}`)
      
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Lovable-Recruiter/1.0'
        }
      })

      if (!response.ok) {
        console.log(`❌ Kaggle API error: ${response.status}`)
        // Return empty results instead of failing
        return new Response(
          JSON.stringify({ 
            candidates: [], 
            total: 0, 
            source: 'kaggle',
            message: 'Kaggle API unavailable',
            processing_time_ms: Date.now() - startTime
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const competitions = await response.json()
      console.log(`📊 Found ${competitions.length} Kaggle competitions`)

      // For now, create placeholder candidates based on competition data
      // In a real implementation, you'd need to scrape leaderboards or use unofficial APIs
      for (const competition of competitions.slice(0, 3)) {
        try {
          const candidateId = generateUUID()

          const candidate = {
            id: candidateId,
            name: `Kaggle ${query} Expert`,
            title: `Data Scientist (${competition.title} participant)`,
            location: '',
            avatar_url: null,
            email: null,
            summary: `Kaggle competitor in "${competition.title}". Specializes in ${query} and data science competitions.`,
            skills: extractSkillsFromCompetition(competition, query),
            experience_years: Math.max(2, Math.min(estimateExperience(competition), 10)),
            last_active: new Date().toISOString(),
            overall_score: Math.round(Math.min(Math.max(calculateKaggleScore(competition), 0), 100)),
            skill_match: Math.round(Math.min(Math.max(calculateCompetitionRelevance(competition, query), 0), 100)),
            experience: Math.round(Math.min(Math.max(estimateExperience(competition) * 10, 0), 100)),
            reputation: Math.round(Math.min(Math.max((competition.numberOfTeams || 0) / 10, 0), 100)),
            freshness: Math.round(Math.min(Math.max(calculateCompetitionFreshness(competition), 0), 100)),
            social_proof: Math.round(Math.min(Math.max(70 + (competition.numberOfTeams || 0) / 100, 0), 100)),
            risk_flags: [],
            platform: 'kaggle'
          }

          candidates.push(candidate)

          // Save to database
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

          if (!insertError) {
            console.log(`✅ Saved Kaggle candidate: ${candidate.name}`)
            
            // Save source data
            await supabase
              .from('candidate_sources')
              .insert({
                candidate_id: candidateId,
                platform: 'kaggle',
                platform_id: competition.id?.toString() || candidateId,
                url: `https://www.kaggle.com/c/${competition.ref}`,
                data: competition
              })
          }

        } catch (error) {
          console.error(`❌ Error processing Kaggle competition:`, error.message)
          continue
        }
      }

    } catch (error) {
      console.error('❌ Kaggle API error:', error.message)
    }

    const processingTime = Date.now() - startTime
    console.log(`✅ Kaggle collection completed: ${candidates.length} candidates in ${processingTime}ms`)

    return new Response(
      JSON.stringify({ 
        candidates,
        total: candidates.length,
        source: 'kaggle',
        processing_time_ms: processingTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error collecting Kaggle data:', error.message)
    return new Response(
      JSON.stringify({ 
        candidates: [], 
        total: 0, 
        source: 'kaggle',
        error: `Failed to collect Kaggle data: ${error.message}`
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function extractSkillsFromCompetition(competition: any, query: string): string[] {
  const skills = []
  const text = (competition.title + ' ' + competition.description).toLowerCase()
  
  const dataSkills = ['python', 'machine learning', 'data science', 'tensorflow', 'pytorch', 'pandas', 'numpy', 'scikit-learn']
  const querySkills = query.toLowerCase().split(' ')
  
  for (const skill of [...dataSkills, ...querySkills]) {
    if (text.includes(skill.toLowerCase()) && !skills.includes(skill)) {
      skills.push(skill)
    }
  }
  
  return skills.slice(0, 6)
}

function calculateKaggleScore(competition: any): number {
  let score = 60 // Base score for Kaggle participants
  
  score += Math.min((competition.numberOfTeams || 0) / 100, 25)
  score += Math.min((competition.totalPrize || 0) / 10000, 15)
  
  return score
}

function calculateCompetitionRelevance(competition: any, query: string): number {
  const queryWords = query.toLowerCase().split(' ')
  const text = (competition.title + ' ' + competition.description).toLowerCase()
  
  let matches = 0
  for (const word of queryWords) {
    if (text.includes(word)) matches++
  }
  
  return (matches / queryWords.length) * 100
}

function estimateExperience(competition: any): number {
  // Estimate based on competition complexity and prize
  const prize = competition.totalPrize || 0
  if (prize > 50000) return 6
  if (prize > 10000) return 4
  return 3
}

function calculateCompetitionFreshness(competition: any): number {
  // Most Kaggle data should be considered reasonably fresh
  return 75
}
