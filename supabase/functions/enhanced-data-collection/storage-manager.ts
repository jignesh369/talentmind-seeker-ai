import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Define interfaces for enhanced type safety
interface Candidate {
  id?: string;
  name: string;
  title: string;
  location: string;
  avatar_url: string | null;
  email: string | null;
  github_username: string | null;
  stackoverflow_id: string | null;
  linkedin_url: string | null;
  reddit_username: string | null;
  summary: string;
  skills: string[];
  experience_years: number;
  last_active: string;
  overall_score: number;
  skill_match: number;
  experience: number;
  reputation: number;
  freshness: number;
  social_proof: number;
  risk_flags: string[];
  candidate_tier?: string;
  apollo_enriched?: boolean;
  readme_email?: string;
  apollo_email?: string;
  github_url?: string;
  current_company?: string;
  semantic_similarity?: number;
  expertise_score?: number;
  language_expertise?: number;
  answer_quality_score?: number;
  market_relevance?: number;
  completeness_score?: number;
  collection_phase?: string;
}

interface StoredCandidate {
  id: string;
  created_at: string;
  updated_at: string;
}

// Helper function to validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function storeWithEnhancedDeduplication(
  candidates: any[],
  supabase: any,
  queryEmbedding: number[] | null,
  platform: string
) {
  console.log(`=== STARTING ENHANCED STORAGE FOR ${platform.toUpperCase()} ===`)
  console.log(`Processing ${candidates.length} candidates from ${platform}`)

  let storedCount = 0
  let updatedCount = 0
  let errorCount = 0

  for (const candidate of candidates) {
    try {
      // Enhanced email validation and normalization
      const validEmail = extractValidEmail(candidate)
      
      if (validEmail) {
        if (candidate.github_username) {
          console.log(`Using README email for ${candidate.name}: ${validEmail}`)
        } else {
          console.log(`Using profile email for ${candidate.name}: ${validEmail}`)
        }
      } else {
        console.log(`No valid email found for ${candidate.name}`)
      }

      // Enhanced candidate preparation
      const enhancedCandidate = {
        name: candidate.name || 'Unknown',
        title: candidate.title || '',
        location: candidate.location || '',
        avatar_url: candidate.avatar_url || null,
        email: validEmail,
        github_username: candidate.github_username || null,
        stackoverflow_id: candidate.stackoverflow_id || null,
        linkedin_url: candidate.linkedin_url || null,
        reddit_username: candidate.reddit_username || null,
        summary: candidate.summary || '',
        skills: candidate.skills || [],
        experience_years: candidate.experience_years || 0,
        last_active: candidate.last_active || new Date().toISOString(),
        overall_score: candidate.overall_score || 0,
        skill_match: candidate.skill_match || 0,
        experience: candidate.experience || 0,
        reputation: candidate.reputation || 0,
        freshness: candidate.freshness || 0,
        social_proof: candidate.social_proof || 0,
        risk_flags: candidate.risk_flags || []
      }

      // Store in candidates table using upsert
      const { data: storedCandidate, error: candidateError } = await supabase
        .from('candidates')
        .upsert(enhancedCandidate, { 
          onConflict: 'email',
          ignoreDuplicates: false 
        })
        .select()
        .single()

      if (candidateError) {
        console.error(`Error storing candidate ${candidate.name}:`, candidateError)
        errorCount++
        continue
      }

      const isNewCandidate = storedCandidate && storedCandidate.created_at === storedCandidate.updated_at
      if (isNewCandidate) {
        console.log(`Inserting new candidate: ${candidate.name} with email: ${validEmail} from ${platform}`)
        storedCount++
      } else {
        console.log(`Updated existing candidate: ${candidate.name} from ${platform}`)
        updatedCount++
      }

      console.log(`Successfully stored ${candidate.candidate_tier || 'standard'} candidate: ${candidate.name} from ${platform} (Score: ${candidate.overall_score})${candidate.apollo_enriched ? ' [Apollo Enhanced]' : ''}`)

      // Store source data
      await storeCandidateSource(candidate, storedCandidate.id, platform, supabase)

    } catch (error) {
      console.error(`Critical error storing candidate ${candidate.name}:`, error)
      errorCount++
    }
  }

  console.log(`=== STORAGE COMPLETED FOR ${platform.toUpperCase()} ===`)
  console.log(`Results: ${storedCount} stored, ${updatedCount} updated, ${errorCount} errors`)

  return {
    stored: storedCount,
    updated: updatedCount,
    errors: errorCount
  }
}

async function storeCandidateSource(candidate: any, candidateId: string, platform: string, supabase: any) {
  try {
    console.log(`Storing source data for candidate ${candidate.name} on ${platform}`)
    
    const platformId = candidate.github_username || 
                      candidate.stackoverflow_id || 
                      candidate.linkedin_url || 
                      candidate.reddit_username || 
                      candidateId

    console.log(`Attempting to store source: ${candidate.github_url || candidate.linkedin_url || 'Unknown URL'} (Platform ID: ${platformId})`)

    // Use upsert for candidate sources
    const { error: sourceError } = await supabase
      .from('candidate_sources')
      .upsert({
        candidate_id: candidateId,
        platform: platform,
        platform_id: platformId,
        url: candidate.github_url || candidate.linkedin_url || '',
        data: {
          ...candidate,
          collection_timestamp: new Date().toISOString()
        }
      }, { 
        onConflict: 'platform,platform_id',
        ignoreDuplicates: false 
      })

    if (sourceError) {
      throw sourceError
    }

    console.log(`Source data stored successfully for ${candidate.name}`)
  } catch (error) {
    console.error(`Critical error storing candidate source for ${platform}:`, error)
    throw error
  }
}

function extractValidEmail(candidate: any): string | null {
  // Priority order for email sources
  const emailSources = [
    candidate.email,
    candidate.readme_email,
    candidate.apollo_email
  ]

  for (const email of emailSources) {
    if (email && email.includes('@') && !email.includes('noreply') && email !== 'email_not_unlocked@domain.com') {
      return email
    }
  }

  return null
}

export async function enrichWithApollo(candidate: any, apolloApiKey: string) {
  try {
    console.log(`Starting Apollo enrichment for ${candidate.name}`)
    
    const searchPayload = {
      q_person_name: candidate.name,
      page: 1,
      per_page: 1,
      person_titles: [candidate.title || ''].filter(Boolean),
      organization_locations: [candidate.location || ''].filter(Boolean)
    }
    
    console.log('Apollo search payload:', searchPayload)

    const response = await fetch('https://api.apollo.io/v1/mixed_people/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': apolloApiKey
      },
      body: JSON.stringify(searchPayload)
    })

    if (!response.ok) {
      console.error(`Apollo API error: ${response.status}`)
      return candidate
    }

    const data = await response.json()
    console.log(`Apollo response for ${candidate.name}: ${data.people?.length || 0} results`)

    if (!data.people || data.people.length === 0) {
      console.log(`No Apollo results found for ${candidate.name}`)
      return candidate
    }

    const apolloData = data.people[0]
    const enrichedCandidate = { ...candidate }

    // Extract Apollo email
    if (apolloData.email) {
      console.log(`Found Apollo email for ${candidate.name}: ${apolloData.email}`)
      enrichedCandidate.apollo_email = apolloData.email
      if (!enrichedCandidate.email) {
        enrichedCandidate.email = apolloData.email
      }
    }

    // Extract LinkedIn URL
    if (apolloData.linkedin_url) {
      console.log(`Found LinkedIn URL for ${candidate.name}: ${apolloData.linkedin_url}`)
      enrichedCandidate.linkedin_url = apolloData.linkedin_url
    }

    // Extract company information
    if (apolloData.organization?.name) {
      console.log(`Found company for ${candidate.name}: ${apolloData.organization.name}`)
      enrichedCandidate.current_company = apolloData.organization.name
    }

    enrichedCandidate.apollo_enriched = true
    console.log(`Successfully enriched ${candidate.name} with Apollo.io data`)

    return enrichedCandidate
  } catch (error) {
    console.error(`Apollo enrichment failed for ${candidate.name}:`, error)
    return candidate
  }
}
