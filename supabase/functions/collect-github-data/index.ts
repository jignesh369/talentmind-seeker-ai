
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { searchGitHubUsers, getUserDetails, getUserRepositories } from './github-api.ts'
import { extractEmailFromReadmes } from './readme-extractor.ts'
import { extractEnhancedSkillsFromGitHub, calculateLanguageStats } from './skill-extractor.ts'
import { 
  calculateEnhancedActivityScore, 
  calculateLanguageExpertiseScore, 
  calculateEnhancedSkillMatch,
  calculateFreshness,
  calculateRiskFlags
} from './scoring.ts'
import { 
  extractEnhancedTitleFromBio, 
  inferTitleFromLanguages, 
  createEnhancedSummaryFromGitHub,
  isValidDeveloperProfile
} from './profile-utils.ts'
import { buildEnhancedSearchQueries } from './search-strategies.ts'

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
    const githubToken = Deno.env.get('GITHUB_TOKEN')
    const supabase = createClient(supabaseUrl, supabaseKey)

    if (!githubToken) {
      console.error('GitHub token not configured')
      return new Response(
        JSON.stringify({ error: 'GitHub API token not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Build enhanced search queries with limited scope to prevent timeouts
    const searchQueries = buildEnhancedSearchQueries(enhancedQuery, location).slice(0, 2) // Limit to 2 queries
    console.log('GitHub search queries (limited for performance):', searchQueries)

    const candidates = []
    const seenUsers = new Set()

    // Get detected languages for expertise scoring
    const skills = enhancedQuery?.skills || []
    const programmingLanguages = ['python', 'javascript', 'typescript', 'java', 'go', 'rust', 'php', 'ruby', 'c++']
    const detectedLanguages = skills.filter(skill => 
      programmingLanguages.includes(skill.toLowerCase())
    )

    for (const searchQuery of searchQueries) {
      try {
        const { rateLimitHit, users } = await searchGitHubUsers(searchQuery, githubToken)
        
        if (rateLimitHit) {
          console.log('Rate limit hit, breaking...')
          break
        }

        console.log(`Found ${users.length} GitHub users for query: ${searchQuery}`)

        // Process only 15 users per query to prevent timeouts
        for (const user of users.slice(0, 15)) {
          if (seenUsers.has(user.login)) continue
          seenUsers.add(user.login)

          try {
            // Get detailed user info and repositories
            const userDetails = await getUserDetails(user.url, githubToken)
            if (!userDetails) {
              console.log(`Failed to get user details for ${user.login}`)
              continue
            }

            const repositories = await getUserRepositories(user.url, githubToken)

            // Enhanced README crawling for email discovery (with timeout)
            let emailFromReadme = null
            try {
              const emailPromise = extractEmailFromReadmes(repositories, githubToken)
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('README extraction timeout')), 5000)
              )
              emailFromReadme = await Promise.race([emailPromise, timeoutPromise])
            } catch (error) {
              console.log(`README email extraction failed for ${user.login}:`, error.message)
            }
            
            // Enhanced skill extraction
            const extractedSkills = extractEnhancedSkillsFromGitHub(userDetails, repositories, enhancedQuery)
            
            // Validate developer profile with stricter criteria
            if (!isValidDeveloperProfile(userDetails, repositories, extractedSkills)) {
              console.log(`Skipping ${user.login} - not a valid developer profile`)
              continue
            }

            // Calculate enhanced experience and activity
            const accountAge = Math.floor((new Date().getFullYear() - new Date(userDetails.created_at).getFullYear()))
            const estimatedExperience = Math.min(Math.max(accountAge, 1), 15)
            const activityScore = calculateEnhancedActivityScore(userDetails, repositories)
            const languageScore = calculateLanguageExpertiseScore(repositories, detectedLanguages)

            // Enhanced scoring with language expertise
            const reputationScore = Math.min((userDetails.followers || 0) * 3 + (userDetails.public_repos || 0) * 2, 100)
            const skillMatchScore = calculateEnhancedSkillMatch(extractedSkills, enhancedQuery)
            const overallScore = Math.round((reputationScore + activityScore + skillMatchScore + languageScore) / 4)

            const candidate = {
              name: userDetails.name || userDetails.login,
              title: extractEnhancedTitleFromBio(userDetails.bio) || inferTitleFromLanguages(repositories),
              location: userDetails.location || location || '',
              avatar_url: userDetails.avatar_url,
              email: emailFromReadme || userDetails.email,
              github_username: userDetails.login,
              summary: createEnhancedSummaryFromGitHub(userDetails, repositories, extractedSkills),
              skills: extractedSkills,
              experience_years: estimatedExperience,
              last_active: userDetails.updated_at,
              overall_score: overallScore,
              skill_match: skillMatchScore,
              experience: Math.min(estimatedExperience * 6 + (userDetails.public_repos || 0), 90),
              reputation: Math.min(reputationScore, 100),
              freshness: calculateFreshness(userDetails.updated_at),
              social_proof: Math.min((userDetails.followers || 0) * 3, 100),
              risk_flags: calculateRiskFlags(userDetails, repositories),
              language_expertise: languageScore,
              readme_email_found: !!emailFromReadme
            }

            candidates.push(candidate)

            // Save enhanced source data with better error handling
            try {
              await supabase
                .from('candidate_sources')
                .insert({
                  candidate_id: userDetails.login,
                  platform: 'github',
                  platform_id: userDetails.login,
                  url: userDetails.html_url,
                  data: { 
                    ...userDetails, 
                    repositories: repositories.slice(0, 8),
                    readme_email: emailFromReadme,
                    language_stats: calculateLanguageStats(repositories)
                  }
                })
            } catch (dbError) {
              console.log(`Database insert failed for ${userDetails.login}:`, dbError.message)
              // Continue processing other candidates even if one fails
            }

          } catch (error) {
            console.error(`Error processing GitHub user ${user.login}:`, error)
            continue
          }
        }

      } catch (error) {
        console.error(`GitHub search error for query "${searchQuery}":`, error)
        continue
      }
    }

    // Sort by overall score and language expertise
    const sortedCandidates = candidates
      .sort((a, b) => (b.overall_score + b.language_expertise) - (a.overall_score + a.language_expertise))
      .slice(0, 20) // Reduced from 30 to 20 for better performance

    console.log(`Collected ${sortedCandidates.length} enhanced candidates from GitHub`)

    return new Response(
      JSON.stringify({ 
        candidates: sortedCandidates,
        total: sortedCandidates.length,
        source: 'github',
        enhancement_stats: {
          emails_from_readme: sortedCandidates.filter(c => c.readme_email_found).length,
          language_based_searches: detectedLanguages.length,
          avg_language_expertise: sortedCandidates.length > 0 ? Math.round(sortedCandidates.reduce((sum, c) => sum + c.language_expertise, 0) / sortedCandidates.length) : 0
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error collecting enhanced GitHub data:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to collect enhanced GitHub data', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
