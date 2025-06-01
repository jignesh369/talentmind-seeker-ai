
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

    console.log(`🔍 Dev.to search for: "${query}"`)

    const startTime = Date.now()
    const candidates = []
    
    try {
      // Search Dev.to articles for technical content
      const searchUrl = `https://dev.to/api/articles?tag=${encodeURIComponent(query.toLowerCase())}&per_page=10`
      
      console.log(`📡 Fetching from Dev.to API: ${searchUrl}`)
      const response = await fetch(searchUrl)
      
      if (!response.ok) {
        throw new Error(`Dev.to API returned ${response.status}: ${response.statusText}`)
      }
      
      const articles = await response.json()
      console.log(`📋 Found ${articles.length} Dev.to articles`)

      const seenUsers = new Set()

      for (const article of articles.slice(0, 8)) { // Limit to 8 articles
        try {
          if (!article.user || seenUsers.has(article.user.username)) continue
          seenUsers.add(article.user.username)

          const user = article.user
          
          // Extract skills from article tags
          const skills = article.tag_list || []
          
          // Calculate basic scores
          const reputationScore = Math.min((user.public_reactions_count || 0) * 2, 100)
          const skillScore = Math.min(skills.length * 20, 100)
          const experienceScore = Math.min((user.articles_count || 0) * 5, 100)
          const activityScore = 75 // Default activity score
          const overallScore = Math.round((reputationScore + skillScore + experienceScore + activityScore) / 4)

          const candidateId = generateUUID()

          const candidate = {
            id: candidateId,
            name: user.name || user.username,
            title: `Developer at Dev.to`,
            location: user.location || '',
            avatar_url: user.profile_image_90,
            email: null, // Dev.to doesn't provide emails
            summary: `Active developer on Dev.to with ${user.articles_count || 0} articles published. Writes about ${skills.slice(0, 3).join(', ')}.`,
            skills: skills.slice(0, 8),
            experience_years: Math.max(1, Math.floor(experienceScore / 20)),
            last_active: new Date().toISOString(),
            overall_score: overallScore,
            skill_match: skillScore,
            experience: experienceScore,
            reputation: reputationScore,
            freshness: activityScore,
            social_proof: Math.min((user.followers_count || 0) * 3, 100),
            risk_flags: [],
            platform: 'devto'
          }

          candidates.push(candidate)

          // Save candidate to database with proper error handling
          try {
            console.log(`💾 Saving Dev.to candidate: ${candidate.name} (${user.username})`)
            
            // Check for existing candidate by Dev.to profile URL
            const profileUrl = `https://dev.to/${user.username}`
            const { data: existingSource, error: sourceSelectError } = await supabase
              .from('candidate_sources')
              .select('candidate_id')
              .eq('url', profileUrl)
              .maybeSingle()

            if (sourceSelectError) {
              console.error(`❌ Error checking existing Dev.to source for ${user.username}:`, sourceSelectError.message)
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
                  avatar_url: candidate.avatar_url,
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
                console.error(`❌ Error updating Dev.to candidate:`, updateError.message)
                continue
              }

              console.log(`✅ Updated existing Dev.to candidate: ${candidate.name}`)
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
                  avatar_url: candidate.avatar_url,
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
                console.error(`❌ Error inserting Dev.to candidate:`, insertError.message)
                continue
              }

              console.log(`✅ Inserted Dev.to candidate: ${candidate.name}`)
            }

            // Add candidate source record
            if (!existingSource) {
              try {
                const { error: sourceError } = await supabase
                  .from('candidate_sources')
                  .insert({
                    candidate_id: candidate.id,
                    platform: 'devto',
                    platform_id: user.username,
                    url: profileUrl,
                    data: {
                      user: user,
                      article: article,
                      skills: skills
                    }
                  })

                if (sourceError) {
                  console.error(`⚠️ Failed to save Dev.to source:`, sourceError.message)
                } else {
                  console.log(`📝 Saved Dev.to source record`)
                }
              } catch (sourceErr) {
                console.error(`⚠️ Exception saving Dev.to source:`, sourceErr)
              }
            }

          } catch (error) {
            console.error(`❌ Database operation failed for Dev.to user:`, error.message)
            continue
          }

        } catch (error) {
          console.error(`❌ Error processing Dev.to article:`, error.message)
          continue
        }
      }

    } catch (error) {
      console.error(`❌ Dev.to API error:`, error)
    }

    const processingTime = Date.now() - startTime
    console.log(`✅ Dev.to collection completed in ${processingTime}ms: ${candidates.length} candidates`)

    return new Response(
      JSON.stringify({ 
        candidates: candidates,
        total: candidates.length,
        source: 'devto',
        processing_time_ms: processingTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error collecting Dev.to data:', error)
    return new Response(
      JSON.stringify({ 
        candidates: [], 
        total: 0, 
        source: 'devto',
        error: 'Failed to collect Dev.to data: ' + error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
