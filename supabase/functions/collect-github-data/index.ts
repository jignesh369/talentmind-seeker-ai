
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

    // Build enhanced search queries using the new strategy module
    const searchQueries = buildEnhancedSearchQueries(enhancedQuery, location)
    console.log('Enhanced GitHub search queries:', searchQueries)

    const candidates = []
    const seenUsers = new Set()

    // Get detected languages for expertise scoring
    const skills = enhancedQuery?.skills || []
    const programmingLanguages = ['python', 'javascript', 'typescript', 'java', 'go', 'rust', 'php', 'ruby', 'c++']
    const detectedLanguages = skills.filter(skill => 
      programmingLanguages.includes(skill.toLowerCase())
    )

    // OPTIMIZED: Reduce search scope for better performance
    for (const searchQuery of searchQueries.slice(0, 3)) { // Reduced from all queries to 3
      try {
        const { rateLimitHit, users } = await searchGitHubUsers(searchQuery, githubToken)
        
        if (rateLimitHit) {
          console.log('Rate limit hit, breaking...')
          break
        }

        console.log(`Found ${users.length} GitHub users for query: ${searchQuery}`)

        // OPTIMIZED: Process fewer users per query
        for (const user of users.slice(0, 15)) { // Reduced from 25 to 15
          if (seenUsers.has(user.login)) continue
          seenUsers.add(user.login)

          // Break early if we have enough candidates
          if (candidates.length >= 20) { // Limit total candidates for performance
            console.log('Reached candidate limit, stopping collection')
            break
          }

          try {
            // Get detailed user info and repositories with timeout protection
            const userDetailsPromise = getUserDetails(user.url, githubToken)
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('GitHub API timeout')), 15000)
            )
            
            const userDetails = await Promise.race([userDetailsPromise, timeoutPromise])
            if (!userDetails) {
              console.log(`Failed to get user details for ${user.login}`)
              continue
            }

            const repositories = await getUserRepositories(user.url, githubToken)

            // Enhanced README crawling for email discovery with timeout
            let emailFromReadme = null
            try {
              const emailPromise = extractEmailFromReadmes(repositories, githubToken)
              const emailTimeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('README extraction timeout')), 10000)
              )
              emailFromReadme = await Promise.race([emailPromise, emailTimeoutPromise])
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
              email: emailFromReadme || userDetails.email, // Prioritize README email
              github_username: userDetails.login,
              github_url: userDetails.html_url,
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

            // Save enhanced source data with error handling
            try {
              await supabase
                .from('candidate_sources')
                .upsert({
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
                }, { 
                  onConflict: 'platform,platform_id',
                  ignoreDuplicates: false 
                })
            } catch (error) {
              console.error(`Error saving source data for ${userDetails.login}:`, error)
            }

          } catch (error) {
            console.error(`Error processing GitHub user ${user.login}:`, error)
            continue
          }
        }

        // Break early if we have enough candidates
        if (candidates.length >= 20) {
          break
        }

      } catch (error) {
        console.error(`GitHub search error for query "${searchQuery}":`, error)
        continue
      }
    }

    // Sort by overall score and language expertise
    const sortedCandidates = candidates
      .sort((a, b) => (b.overall_score + b.language_expertise) - (a.overall_score + a.language_expertise))
      .slice(0, 25) // Reduced from 30 to 25

    console.log(`Collected ${sortedCandidates.length} enhanced candidates from GitHub`)

    return new Response(
      JSON.stringify({ 
        candidates: sortedCandidates,
        total: sortedCandidates.length,
        source: 'github',
        enhancement_stats: {
          emails_from_readme: sortedCandidates.filter(c => c.readme_email_found).length,
          language_based_searches: detectedLanguages.length,
          avg_language_expertise: Math.round(sortedCandidates.reduce((sum, c) => sum + c.language_expertise, 0) / sortedCandidates.length || 0)
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error collecting enhanced GitHub data:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to collect enhanced GitHub data' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
