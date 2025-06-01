
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface StackOverflowUser {
  user_id: number;
  display_name: string;
  reputation: number;
  profile_image: string;
  location: string;
  website_url: string;
  link: string;
  badge_counts: {
    bronze: number;
    silver: number;
    gold: number;
  };
  creation_date: number;
  last_access_date: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, minReputation = 1000 } = await req.json()

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Search Stack Overflow users by tags (skills)
    const tags = query.toLowerCase().split(' ').filter(tag => tag.length > 2)
    console.log('Searching SO users for tags:', tags)

    const candidates = []

    for (const tag of tags.slice(0, 5)) { // Limit tags to prevent rate limiting
      try {
        // Get top users for this tag
        const response = await fetch(
          `https://api.stackexchange.com/2.3/tags/${encodeURIComponent(tag)}/top-answerers/all_time?site=stackoverflow&pagesize=20&filter=!9YdnSIN0C`
        )

        if (!response.ok) continue

        const data = await response.json()
        const users = data.items || []

        // Get detailed user info
        const userIds = users.map((u: any) => u.user.user_id).slice(0, 10)
        if (userIds.length === 0) continue

        const usersResponse = await fetch(
          `https://api.stackexchange.com/2.3/users/${userIds.join(';')}?site=stackoverflow&filter=!9YdnSIN0C`
        )

        if (!usersResponse.ok) continue

        const usersData = await usersResponse.json()
        const detailedUsers = usersData.items || []

        for (const user of detailedUsers) {
          if (user.reputation < minReputation) continue

          // Calculate scores
          const reputationScore = Math.min(user.reputation / 10000 * 30, 30)
          const badgeScore = (user.badge_counts.gold * 3 + user.badge_counts.silver * 2 + user.badge_counts.bronze) / 10
          const experienceYears = Math.floor((Date.now() - user.creation_date * 1000) / (365 * 24 * 60 * 60 * 1000))
          const experienceScore = Math.min(experienceYears * 3, 20)
          
          // Calculate freshness based on last access
          const daysSinceLastAccess = Math.floor((Date.now() - user.last_access_date * 1000) / (24 * 60 * 60 * 1000))
          const freshnessScore = Math.max(100 - daysSinceLastAccess, 10)

          const candidate = {
            name: user.display_name,
            title: `Stack Overflow Developer (${user.reputation.toLocaleString()} reputation)`,
            location: user.location,
            avatar_url: user.profile_image,
            stackoverflow_id: user.user_id.toString(),
            summary: `Stack Overflow contributor with ${user.reputation.toLocaleString()} reputation, ${user.badge_counts.gold} gold badges, expertise in ${tag}`,
            skills: [tag, ...tags.filter(t => t !== tag)].slice(0, 5),
            experience_years: experienceYears,
            last_active: new Date(user.last_access_date * 1000).toISOString(),
            overall_score: Math.round(reputationScore + badgeScore + experienceScore + 20),
            skill_match: 80, // High since we're searching by skill tags
            experience: experienceScore,
            reputation: reputationScore,
            freshness: Math.round(freshnessScore),
            social_proof: Math.round(badgeScore),
            risk_flags: daysSinceLastAccess > 365 ? ['inactive_for_over_year'] : []
          }

          candidates.push(candidate)

          // Save to database
          const { error } = await supabase
            .from('candidates')
            .upsert(candidate, { 
              onConflict: 'stackoverflow_id',
              ignoreDuplicates: false 
            })

          if (error) {
            console.error('Error saving SO candidate:', error)
          }

          // Save source data
          await supabase
            .from('candidate_sources')
            .upsert({
              candidate_id: candidate.stackoverflow_id,
              platform: 'stackoverflow',
              platform_id: user.user_id.toString(),
              url: user.link,
              data: user
            }, { onConflict: 'platform,platform_id' })
        }

      } catch (error) {
        console.error(`Error processing tag ${tag}:`, error)
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
