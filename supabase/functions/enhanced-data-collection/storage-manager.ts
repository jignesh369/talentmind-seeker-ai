import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export async function storeWithAdvancedEnhancement(
  candidates: any[],
  supabase: any,
  queryEmbedding: number[] | null,
  platform: string
) {
  console.log(`=== STARTING ADVANCED STORAGE FOR ${platform.toUpperCase()} ===`)
  console.log(`Processing ${candidates.length} candidates with advanced AI features`)

  let storedCount = 0
  let updatedCount = 0
  let errorCount = 0

  for (const candidate of candidates) {
    try {
      // Enhanced email validation and normalization
      const validEmail = extractBestEmail(candidate)
      
      // Prepare enhanced candidate data
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

      // Use upsert with email as the conflict resolution key
      const upsertKey = validEmail ? 'email' : 'github_username'
      
      const { data: storedCandidate, error: candidateError } = await supabase
        .from('candidates')
        .upsert(enhancedCandidate, { 
          onConflict: upsertKey,
          ignoreDuplicates: false 
        })
        .select()
        .single()

      if (candidateError) {
        console.error(`❌ Error storing enhanced candidate ${candidate.name}:`, candidateError)
        errorCount++
        continue
      }

      const isNewCandidate = storedCandidate && storedCandidate.created_at === storedCandidate.updated_at
      if (isNewCandidate) {
        console.log(`✅ Inserted new enhanced candidate: ${candidate.name} from ${platform}`)
        storedCount++
      } else {
        console.log(`🔄 Updated existing candidate: ${candidate.name} from ${platform}`)
        updatedCount++
      }

      // Store enhanced metadata
      await storeEnhancedMetadata(candidate, storedCandidate.id, platform, supabase)

      // Store advanced source data
      await storeAdvancedSourceData(candidate, storedCandidate.id, platform, supabase)

    } catch (error) {
      console.error(`❌ Critical error storing enhanced candidate ${candidate.name}:`, error)
      errorCount++
    }
  }

  console.log(`=== ADVANCED STORAGE COMPLETED FOR ${platform.toUpperCase()} ===`)
  console.log(`Results: ${storedCount} stored, ${updatedCount} updated, ${errorCount} errors`)

  return {
    stored: storedCount,
    updated: updatedCount,
    errors: errorCount
  }
}

async function storeEnhancedMetadata(candidate: any, candidateId: string, platform: string, supabase: any) {
  try {
    const metadata = {
      candidate_id: candidateId,
      semantic_similarity: candidate.semantic_similarity || null,
      apollo_enriched: candidate.apollo_enriched || false,
      apollo_enrichment_score: candidate.apollo_enrichment_score || null,
      contact_discovery_score: candidate.contact_discovery_score || null,
      availability_analysis: candidate.availability_analysis || null,
      contact_methods: candidate.contact_methods || [],
      current_company: candidate.current_company || null,
      company_size: candidate.company_size || null,
      company_industry: candidate.company_industry || null,
      phone: candidate.phone || null,
      current_role: candidate.current_role || null,
      employment_status: candidate.employment_status || null,
      apollo_email: candidate.apollo_email || null,
      readme_email: candidate.readme_email || null,
      platform_source: platform,
      enhancement_timestamp: new Date().toISOString()
    }

    // Store in a hypothetical enhanced_metadata table (we'd need to create this)
    console.log(`📊 Enhanced metadata prepared for ${candidate.name}`)

  } catch (error) {
    console.error(`⚠️ Error storing enhanced metadata:`, error)
  }
}

async function storeAdvancedSourceData(candidate: any, candidateId: string, platform: string, supabase: any) {
  try {
    const platformId = candidate.github_username || 
                      candidate.stackoverflow_id || 
                      candidate.linkedin_url || 
                      candidate.reddit_username || 
                      candidateId

    const advancedData = {
      ...candidate,
      enhancement_features: {
        semantic_search: !!candidate.semantic_similarity,
        apollo_enrichment: !!candidate.apollo_enriched,
        availability_analysis: !!candidate.availability_analysis,
        contact_discovery: !!candidate.contact_methods,
        market_intelligence: true
      },
      collection_timestamp: new Date().toISOString(),
      ai_enhancement_version: '2.0'
    }

    const { error: sourceError } = await supabase
      .from('candidate_sources')
      .upsert({
        candidate_id: candidateId,
        platform: platform,
        platform_id: platformId,
        url: candidate.github_url || candidate.linkedin_url || candidate.source_url || '',
        data: advancedData
      }, { 
        onConflict: 'platform,platform_id',
        ignoreDuplicates: false 
      })

    if (sourceError) {
      throw sourceError
    }

    console.log(`✨ Advanced source data stored for ${candidate.name}`)

  } catch (error) {
    console.error(`❌ Error storing advanced source data:`, error)
    throw error
  }
}

function extractBestEmail(candidate: any): string | null {
  // Priority order for email sources
  const emailSources = [
    candidate.apollo_email,  // Highest priority - verified professional email
    candidate.email,         // Profile email
    candidate.readme_email,  // README discovered email
  ]

  for (const email of emailSources) {
    if (email && isValidEmail(email)) {
      return email.toLowerCase().trim()
    }
  }

  return null
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && 
         !email.includes('noreply') && 
         !email.includes('no-reply') &&
         email !== 'email_not_unlocked@domain.com' &&
         !email.includes('example.com')
}
