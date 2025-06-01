
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

    // Extract technical tags from query
    const techTags = []
    const commonTags = [
      'python', 'javascript', 'typescript', 'java', 'c++', 'go', 'rust',
      'react', 'vue', 'angular', 'node.js', 'django', 'flask', 'spring',
      'machine-learning', 'tensorflow', 'pytorch', 'aws', 'docker', 'kubernetes'
    ]

    const queryLower = query.toLowerCase()
    commonTags.forEach(tag => {
      if (queryLower.includes(tag.replace('-', ' ')) || queryLower.includes(tag)) {
        techTags.push(tag)
      }
    })

    // Fallback to general programming tags if no specific tech found
    if (techTags.length === 0) {
      techTags.push('python', 'javascript', 'java')
    }

    console.log('Searching SO users for tags:', techTags.slice(0, 5))

    const candidates = []

    for (const tag of techTags.slice(0, 3)) { // Limit to 3 tags
      try {
        // Get top users for this tag
        const response = await fetch(
          `https://api.stackexchange.com/2.3/tags/${tag}/top-answerers/all_time?site=stackoverflow&pagesize=20&key=your_key_here`
        )

        if (!response.ok) {
          console.log(`Stack Overflow API error for tag ${tag}:`, response.status)
          continue
        }

        const data = await response.json()
        
        if (data.quota_remaining < 10) {
          console.log('Stack Overflow quota low, breaking')
          break
        }

        for (const user of (data.items || []).slice(0, 10)) {
          try {
            // Get detailed user info
            const userResponse = await fetch(
              `https://api.stackexchange.com/2.3/users/${user.user_id}?site=stackoverflow&key=your_key_here`
            )

            if (!userResponse.ok) continue

            const userData = await userResponse.json()
            const userInfo = userData.items?.[0]

            if (!userInfo) continue

            const candidate = {
              name: userInfo.display_name,
              title: 'Stack Overflow Contributor',
              location: userInfo.location || location || '',
              avatar_url: userInfo.profile_image,
              stackoverflow_id: userInfo.user_id.toString(),
              summary: `Active Stack Overflow contributor with ${userInfo.reputation} reputation`,
              skills: [tag, ...techTags.slice(0, 3)],
              experience_years: Math.min(Math.max(Math.floor((Date.now() - userInfo.creation_date * 1000) / (365 * 24 * 60 * 60 * 1000)), 1), 15),
              last_active: new Date(userInfo.last_access_date * 1000).toISOString(),
              overall_score: Math.min(50 + Math.log10(userInfo.reputation || 1) * 10, 100),
              skill_match: techTags.length * 20,
              experience: Math.min((userInfo.reputation || 0) / 100, 90),
              reputation: Math.min((userInfo.reputation || 0) / 50, 100),
              freshness: Math.max(100 - Math.floor((Date.now() - userInfo.last_access_date * 1000) / (7 * 24 * 60 * 60 * 1000)), 20),
              social_proof: Math.min((userInfo.up_vote_count || 0) / 10, 100),
              risk_flags: []
            }

            candidates.push(candidate)

            // Save to database
            const { error } = await supabase
              .from('candidates')
              .upsert(candidate, { onConflict: 'stackoverflow_id' })

            if (error) {
              console.error('Error saving SO candidate:', error)
            }

            // Save source data
            await supabase
              .from('candidate_sources')
              .upsert({
                candidate_id: userInfo.user_id.toString(),
                platform: 'stackoverflow',
                platform_id: userInfo.user_id.toString(),
                url: userInfo.link,
                data: userInfo
              }, { onConflict: 'platform,platform_id' })

          } catch (error) {
            console.error(`Error processing SO user ${user.user_id}:`, error)
            continue
          }
        }

      } catch (error) {
        console.error(`Error searching SO tag ${tag}:`, error)
        continue
      }
    }

    console.log(`Collected ${candidates.length} candidates from Stack Overflow`)

    return new Response(
      JSON.stringify({ 
        candidates,
        total: candidates.length,
        source: 'stackoverflow'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error collecting Stack Overflow data:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to collect Stack Overflow data' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
