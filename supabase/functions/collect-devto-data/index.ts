
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

    console.log('🚀 Starting Dev.to candidate collection...')

    const candidates = []
    const startTime = Date.now()

    try {
      // Search Dev.to public API for articles
      const searchUrl = `https://dev.to/api/articles?tag=${encodeURIComponent(query.split(' ')[0])}&per_page=10`
      console.log(`🔍 Searching Dev.to: ${searchUrl}`)
      
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Lovable-Recruiter/1.0'
        }
      })

      if (!response.ok) {
        console.log(`❌ Dev.to API error: ${response.status}`)
        throw new Error(`Dev.to API returned ${response.status}`)
      }

      const articles = await response.json()
      console.log(`📊 Found ${articles.length} Dev.to articles`)

      for (const article of articles.slice(0, 5)) {
        try {
          if (!article.user) continue

          const candidateId = generateUUID()
          const user = article.user

          const candidate = {
            id: candidateId,
            name: user.name || user.username,
            title: `${query} Developer (Dev.to Author)`,
            location: '',
            avatar_url: user.profile_image_90,
            email: null,
            summary: `Dev.to author with article: "${article.title}". ${article.description || ''}`.substring(0, 500),
            skills: extractSkillsFromArticle(article, query),
            experience_years: Math.max(1, Math.min(calculateExperienceFromProfile(user), 15)),
            last_active: new Date(article.published_at || Date.now()).toISOString(),
            overall_score: Math.round(Math.min(Math.max(calculateDevToScore(article, user), 0), 100)),
            skill_match: Math.round(Math.min(Math.max(calculateSkillMatch(article.title + ' ' + article.description, query), 0), 100)),
            experience: Math.round(Math.min(Math.max(calculateExperienceFromProfile(user) * 7, 0), 100)),
            reputation: Math.round(Math.min(Math.max((article.positive_reactions_count || 0) * 2, 0), 100)),
            freshness: Math.round(Math.min(Math.max(calculateFreshness(article.published_at), 0), 100)),
            social_proof: Math.round(Math.min(Math.max((user.twitter_username ? 80 : 60) + (article.comments_count || 0), 0), 100)),
            risk_flags: [],
            platform: 'devto'
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
            console.log(`✅ Saved Dev.to candidate: ${candidate.name}`)
            
            // Save source data
            await supabase
              .from('candidate_sources')
              .insert({
                candidate_id: candidateId,
                platform: 'devto',
                platform_id: user.id.toString(),
                url: `https://dev.to/${user.username}`,
                data: { article, user }
              })
          }

        } catch (error) {
          console.error(`❌ Error processing Dev.to user:`, error.message)
          continue
        }
      }

    } catch (error) {
      console.error('❌ Dev.to API error:', error.message)
    }

    const processingTime = Date.now() - startTime
    console.log(`✅ Dev.to collection completed: ${candidates.length} candidates in ${processingTime}ms`)

    return new Response(
      JSON.stringify({ 
        candidates,
        total: candidates.length,
        source: 'devto',
        processing_time_ms: processingTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error collecting Dev.to data:', error.message)
    return new Response(
      JSON.stringify({ 
        candidates: [], 
        total: 0, 
        source: 'devto',
        error: `Failed to collect Dev.to data: ${error.message}`
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function extractSkillsFromArticle(article: any, query: string): string[] {
  const skills = []
  const text = (article.title + ' ' + article.description + ' ' + (article.tag_list || []).join(' ')).toLowerCase()
  
  const commonSkills = ['javascript', 'python', 'react', 'node.js', 'typescript', 'java', 'angular', 'vue', 'docker', 'aws']
  const querySkills = query.toLowerCase().split(' ')
  
  for (const skill of [...commonSkills, ...querySkills]) {
    if (text.includes(skill.toLowerCase()) && !skills.includes(skill)) {
      skills.push(skill)
    }
  }
  
  return skills.slice(0, 6)
}

function calculateDevToScore(article: any, user: any): number {
  let score = 50 // Base score
  
  score += Math.min((article.positive_reactions_count || 0) * 2, 30)
  score += Math.min((article.comments_count || 0) * 3, 20)
  
  return score
}

function calculateSkillMatch(text: string, query: string): number {
  const queryWords = query.toLowerCase().split(' ')
  const textLower = text.toLowerCase()
  
  let matches = 0
  for (const word of queryWords) {
    if (textLower.includes(word)) matches++
  }
  
  return (matches / queryWords.length) * 100
}

function calculateExperienceFromProfile(user: any): number {
  // Estimate based on account age and activity
  const joinedAt = new Date(user.joined_at || Date.now())
  const accountAge = (Date.now() - joinedAt.getTime()) / (1000 * 60 * 60 * 24 * 365)
  
  return Math.max(1, Math.min(Math.round(accountAge * 1.5), 15))
}

function calculateFreshness(publishedAt: string): number {
  const published = new Date(publishedAt)
  const daysSince = (Date.now() - published.getTime()) / (1000 * 60 * 60 * 24)
  
  if (daysSince < 30) return 100
  if (daysSince < 90) return 80
  if (daysSince < 365) return 60
  return 40
}
