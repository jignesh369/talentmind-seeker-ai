
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
    const { query, location, enhancedQuery, crossPlatformData } = await req.json()

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
    const googleApiKey = Deno.env.get('GOOGLE_API_KEY')
    const googleSearchEngineId = Deno.env.get('GOOGLE_SEARCH_ENGINE_ID')
    const apifyApiKey = Deno.env.get('APIFY_API_KEY')
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('Starting LinkedIn cross-platform discovery...')

    // Step 1: Collect names and usernames from other platforms
    const searchTargets = await collectCrossPlatformSearchTargets(supabase, crossPlatformData)
    console.log(`Found ${searchTargets.length} cross-platform search targets`)

    const candidates = []
    const seenProfiles = new Set()

    // Step 2: Use Google Search API for LinkedIn profile discovery
    if (googleApiKey && googleSearchEngineId) {
      for (const target of searchTargets.slice(0, 15)) { // Limit to conserve API calls
        try {
          const linkedinProfiles = await searchLinkedInProfiles(target, googleApiKey, googleSearchEngineId, location)
          
          for (const profile of linkedinProfiles) {
            if (seenProfiles.has(profile.url)) continue
            seenProfiles.add(profile.url)
            
            // Step 3: Extract LinkedIn data (enhanced method)
            const linkedinData = await extractLinkedInProfileData(profile, apifyApiKey)
            
            if (linkedinData && isValidLinkedInProfile(linkedinData)) {
              const candidate = await createLinkedInCandidate(linkedinData, target, enhancedQuery, location)
              if (candidate) {
                candidates.push(candidate)
                
                // Save cross-platform correlation data
                await saveCrossPlatformCorrelation(supabase, candidate, target)
              }
            }
          }
        } catch (error) {
          console.error(`Error processing target ${target.name}:`, error)
          continue
        }
      }
    }

    // Step 3: Direct LinkedIn search strategies (fallback)
    if (candidates.length < 5) {
      const directCandidates = await performDirectLinkedInSearch(query, location, enhancedQuery, apifyApiKey)
      candidates.push(...directCandidates)
    }

    // Step 4: Enhanced deduplication and scoring
    const uniqueCandidates = deduplicateLinkedInCandidates(candidates)
    const scoredCandidates = await enhanceLinkedInCandidateScoring(uniqueCandidates, enhancedQuery)

    const sortedCandidates = scoredCandidates
      .sort((a, b) => b.overall_score - a.overall_score)
      .slice(0, 20)

    console.log(`Collected ${sortedCandidates.length} LinkedIn candidates via cross-platform discovery`)

    return new Response(
      JSON.stringify({ 
        candidates: sortedCandidates,
        total: sortedCandidates.length,
        source: 'linkedin-cross-platform',
        discovery_stats: {
          search_targets_used: searchTargets.length,
          cross_platform_matches: sortedCandidates.filter(c => c.cross_platform_match).length,
          google_search_results: candidates.filter(c => c.discovery_method === 'google_search').length,
          direct_search_results: candidates.filter(c => c.discovery_method === 'direct_search').length
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in LinkedIn cross-platform discovery:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to perform LinkedIn cross-platform discovery' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

// Collect search targets from other platforms
async function collectCrossPlatformSearchTargets(supabase, crossPlatformData) {
  const targets = []
  
  try {
    // Get recent candidates from GitHub and Stack Overflow
    const { data: recentSources } = await supabase
      .from('candidate_sources')
      .select('*')
      .in('platform', ['github', 'stackoverflow'])
      .order('last_updated', { ascending: false })
      .limit(50)
    
    if (recentSources) {
      recentSources.forEach(source => {
        const data = source.data
        
        if (source.platform === 'github') {
          targets.push({
            name: data.name || data.login,
            username: data.login,
            platform: 'github',
            source_id: source.candidate_id,
            bio: data.bio,
            location: data.location,
            variations: generateNameVariations(data.name || data.login)
          })
        } else if (source.platform === 'stackoverflow') {
          const crossPlatformData = data.cross_platform_search || {}
          targets.push({
            name: data.display_name,
            username: data.display_name,
            platform: 'stackoverflow', 
            source_id: source.candidate_id,
            location: data.location,
            variations: crossPlatformData.username_variations || []
          })
        }
      })
    }
  } catch (error) {
    console.error('Error collecting cross-platform targets:', error)
  }
  
  return targets.filter(t => t.name && t.name.length > 2)
}

// Search for LinkedIn profiles using Google Custom Search
async function searchLinkedInProfiles(target, googleApiKey, searchEngineId, location) {
  const profiles = []
  
  try {
    // Create multiple search queries for better coverage
    const searchQueries = [
      `"${target.name}" site:linkedin.com/in developer`,
      `"${target.name}" site:linkedin.com/in engineer`,
      `"${target.name}" site:linkedin.com/in ${location || 'software'}`,
      `"${target.username}" site:linkedin.com/in`
    ]
    
    // Add variations if available
    if (target.variations && target.variations.length > 0) {
      target.variations.slice(0, 2).forEach(variation => {
        searchQueries.push(`"${variation}" site:linkedin.com/in developer`)
      })
    }
    
    for (const searchQuery of searchQueries.slice(0, 3)) { // Limit to 3 queries per target
      try {
        const response = await fetch(
          `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${searchEngineId}&q=${encodeURIComponent(searchQuery)}&num=5`
        )
        
        if (response.ok) {
          const data = await response.json()
          const items = data.items || []
          
          items.forEach(item => {
            if (item.link && item.link.includes('linkedin.com/in/')) {
              profiles.push({
                url: item.link,
                title: item.title,
                snippet: item.snippet,
                discovery_method: 'google_search',
                source_target: target
              })
            }
          })
        }
      } catch (error) {
        console.error(`Error in Google search for ${searchQuery}:`, error)
      }
    }
  } catch (error) {
    console.error('Error searching LinkedIn profiles:', error)
  }
  
  return profiles
}

// Extract LinkedIn profile data (enhanced method)
async function extractLinkedInProfileData(profile, apifyApiKey) {
  if (!apifyApiKey) {
    // Fallback: extract basic data from search results
    return {
      name: extractNameFromTitle(profile.title),
      title: extractTitleFromSnippet(profile.snippet),
      url: profile.url,
      summary: profile.snippet,
      discovery_method: profile.discovery_method,
      source_target: profile.source_target
    }
  }
  
  try {
    // Use Apify for detailed LinkedIn profile extraction
    const apifyResponse = await fetch(`https://api.apify.com/v2/acts/apify~linkedin-profile-scraper/run-sync-get-dataset-items`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apifyApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        profileUrls: [profile.url],
        includeContactInfo: false,
        includeRecommendations: false,
        includePublications: false
      })
    })
    
    if (apifyResponse.ok) {
      const results = await apifyResponse.json()
      if (results && results.length > 0) {
        const linkedinData = results[0]
        return {
          ...linkedinData,
          discovery_method: profile.discovery_method,
          source_target: profile.source_target,
          url: profile.url
        }
      }
    }
  } catch (error) {
    console.error('Error extracting LinkedIn profile with Apify:', error)
  }
  
  return null
}

// Validate LinkedIn profile for developer relevance
function isValidLinkedInProfile(linkedinData) {
  if (!linkedinData.name || linkedinData.name.length < 2) return false
  
  const title = (linkedinData.title || '').toLowerCase()
  const summary = (linkedinData.summary || linkedinData.about || '').toLowerCase()
  const combinedText = `${title} ${summary}`
  
  const developerKeywords = [
    'developer', 'engineer', 'programmer', 'architect', 'lead', 'senior',
    'software', 'technical', 'coding', 'programming', 'full stack', 'backend', 'frontend',
    'python', 'javascript', 'java', 'react', 'node', 'aws', 'cloud'
  ]
  
  return developerKeywords.some(keyword => combinedText.includes(keyword))
}

// Create LinkedIn candidate object
async function createLinkedInCandidate(linkedinData, sourceTarget, enhancedQuery, location) {
  try {
    const skills = extractLinkedInSkills(linkedinData, enhancedQuery)
    const experience = estimateLinkedInExperience(linkedinData)
    
    const candidate = {
      name: linkedinData.name || linkedinData.fullName,
      title: linkedinData.title || linkedinData.currentPosition?.title,
      location: linkedinData.location || location || '',
      avatar_url: linkedinData.profilePicture || linkedinData.profileImage,
      linkedin_url: linkedinData.url,
      summary: createLinkedInSummary(linkedinData),
      skills: skills,
      experience_years: experience,
      last_active: new Date().toISOString(),
      overall_score: calculateLinkedInScore(linkedinData, skills, enhancedQuery),
      skill_match: calculateLinkedInSkillMatch(skills, enhancedQuery),
      experience: Math.min(experience * 7 + (linkedinData.connectionsCount || 0) / 100, 90),
      reputation: calculateLinkedInReputation(linkedinData),
      freshness: 75, // LinkedIn data is generally fresh
      social_proof: Math.min((linkedinData.connectionsCount || 0) / 20, 100),
      risk_flags: calculateLinkedInRiskFlags(linkedinData),
      cross_platform_match: true,
      discovery_method: linkedinData.discovery_method,
      source_platform: sourceTarget.platform,
      source_correlation_score: calculateCorrelationScore(linkedinData, sourceTarget)
    }
    
    return candidate
  } catch (error) {
    console.error('Error creating LinkedIn candidate:', error)
    return null
  }
}

// Direct LinkedIn search (fallback method)
async function performDirectLinkedInSearch(query, location, enhancedQuery, apifyApiKey) {
  const candidates = []
  
  if (!apifyApiKey) return candidates
  
  try {
    const searchTerms = enhancedQuery?.skills || [query]
    const searchQuery = searchTerms.slice(0, 3).join(' ') + ' developer ' + (location || '')
    
    const apifyResponse = await fetch(`https://api.apify.com/v2/acts/clever-lemon~linkedin-people-search-scraper/run-sync-get-dataset-items`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apifyApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        searchKeywords: searchQuery,
        maxProfiles: 15,
        includeContactInfo: false,
        locations: location ? [location] : undefined
      })
    })
    
    if (apifyResponse.ok) {
      const profiles = await apifyResponse.json()
      
      for (const profile of profiles) {
        if (isValidLinkedInProfile(profile)) {
          const candidate = await createLinkedInCandidate({
            ...profile,
            discovery_method: 'direct_search'
          }, { platform: 'direct', name: 'direct search' }, enhancedQuery, location)
          
          if (candidate) {
            candidate.cross_platform_match = false
            candidates.push(candidate)
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in direct LinkedIn search:', error)
  }
  
  return candidates
}

// Helper functions
function generateNameVariations(name) {
  if (!name) return []
  
  const variations = []
  const cleaned = name.replace(/[^a-zA-Z\s]/g, '').trim()
  
  // Split by spaces
  const parts = cleaned.split(/\s+/)
  
  if (parts.length >= 2) {
    // First Last
    variations.push(`${parts[0]} ${parts[parts.length - 1]}`)
    // First Middle Last
    if (parts.length >= 3) {
      variations.push(parts.join(' '))
    }
    // Initials
    variations.push(parts.map(p => p.charAt(0)).join(''))
  }
  
  return [...new Set(variations)].filter(v => v.length > 1)
}

function extractNameFromTitle(title) {
  if (!title) return 'LinkedIn Professional'
  
  // Extract name from LinkedIn title format
  const match = title.match(/^([^-|]+)/)
  return match ? match[1].trim() : title.split(' ').slice(0, 2).join(' ')
}

function extractTitleFromSnippet(snippet) {
  if (!snippet) return 'Professional'
  
  const titlePatterns = [
    /(?:Senior|Lead|Principal|Staff)?\s*(?:Software|Full Stack|Backend|Frontend)?\s*(?:Engineer|Developer|Programmer)/i,
    /(?:Data|Machine Learning|DevOps|Cloud)\s*(?:Engineer|Scientist|Architect)/i
  ]
  
  for (const pattern of titlePatterns) {
    const match = snippet.match(pattern)
    if (match) return match[0]
  }
  
  return snippet.split('.')[0].substring(0, 50)
}

function extractLinkedInSkills(linkedinData, enhancedQuery) {
  const skills = new Set()
  
  const text = `${linkedinData.title || ''} ${linkedinData.summary || linkedinData.about || ''}`.toLowerCase()
  
  const techSkills = [
    'python', 'javascript', 'typescript', 'java', 'c++', 'c#', 'go', 'rust',
    'react', 'vue', 'angular', 'node.js', 'django', 'flask', 'spring',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform',
    'machine learning', 'ai', 'data science', 'backend', 'frontend'
  ]
  
  techSkills.forEach(skill => {
    if (text.includes(skill)) skills.add(skill)
  })
  
  // Add skills from enhanced query if relevant
  if (enhancedQuery?.skills) {
    enhancedQuery.skills.forEach(skill => {
      if (text.includes(skill.toLowerCase())) skills.add(skill)
    })
  }
  
  return Array.from(skills).slice(0, 8)
}

function estimateLinkedInExperience(linkedinData) {
  // Try to extract from experience sections
  if (linkedinData.experience && Array.isArray(linkedinData.experience)) {
    const totalMonths = linkedinData.experience.reduce((sum, exp) => {
      const duration = exp.duration || 0
      return sum + (typeof duration === 'number' ? duration : 24) // Default 2 years if unknown
    }, 0)
    return Math.min(Math.floor(totalMonths / 12), 20)
  }
  
  // Fallback estimation based on profile maturity
  const profileElements = [
    linkedinData.summary,
    linkedinData.connectionsCount,
    linkedinData.experience,
    linkedinData.education
  ].filter(Boolean).length
  
  return Math.min(profileElements + 2, 10)
}

function createLinkedInSummary(linkedinData) {
  const parts = []
  
  if (linkedinData.summary || linkedinData.about) {
    parts.push((linkedinData.summary || linkedinData.about).substring(0, 200))
  }
  
  if (linkedinData.currentPosition) {
    parts.push(`Currently: ${linkedinData.currentPosition.title}`)
  }
  
  if (linkedinData.connectionsCount > 500) {
    parts.push(`${linkedinData.connectionsCount}+ connections`)
  }
  
  if (linkedinData.education && Array.isArray(linkedinData.education) && linkedinData.education.length > 0) {
    parts.push(`Education: ${linkedinData.education[0].schoolName || 'University'}`)
  }
  
  return parts.join('. ').substring(0, 300)
}

function calculateLinkedInScore(linkedinData, skills, enhancedQuery) {
  let score = 50 // Base score
  
  // Profile completeness
  if (linkedinData.summary || linkedinData.about) score += 15
  if (linkedinData.experience && Array.isArray(linkedinData.experience)) score += 10
  if (linkedinData.education) score += 5
  if (linkedinData.currentPosition) score += 10
  
  // Skills relevance
  score += Math.min(skills.length * 3, 15)
  
  // Network size
  if (linkedinData.connectionsCount) {
    score += Math.min(linkedinData.connectionsCount / 100, 10)
  }
  
  return Math.min(score, 100)
}

function calculateLinkedInSkillMatch(skills, enhancedQuery) {
  if (!enhancedQuery?.skills) return 60
  
  const requiredSkills = enhancedQuery.skills.map(s => s.toLowerCase())
  const matches = requiredSkills.filter(skill =>
    skills.some(candidateSkill =>
      candidateSkill.toLowerCase().includes(skill) || skill.includes(candidateSkill.toLowerCase())
    )
  )
  
  return Math.min(matches.length * 20, 100)
}

function calculateLinkedInReputation(linkedinData) {
  let score = 60 // Base LinkedIn credibility
  
  if (linkedinData.connectionsCount > 500) score += 20
  if (linkedinData.experience && linkedinData.experience.length > 2) score += 15
  if (linkedinData.recommendations && linkedinData.recommendations.length > 0) score += 10
  
  return Math.min(score, 100)
}

function calculateLinkedInRiskFlags(linkedinData) {
  const flags = []
  
  if (!linkedinData.summary && !linkedinData.about) flags.push('No profile summary')
  if (!linkedinData.currentPosition) flags.push('No current position')
  if (!linkedinData.connectionsCount || linkedinData.connectionsCount < 50) flags.push('Limited network')
  if (!linkedinData.experience || linkedinData.experience.length === 0) flags.push('No experience listed')
  
  return flags
}

function calculateCorrelationScore(linkedinData, sourceTarget) {
  let score = 0
  
  // Name similarity
  if (linkedinData.name && sourceTarget.name) {
    const similarity = calculateNameSimilarity(linkedinData.name, sourceTarget.name)
    score += similarity * 40
  }
  
  // Location match
  if (linkedinData.location && sourceTarget.location) {
    if (linkedinData.location.toLowerCase().includes(sourceTarget.location.toLowerCase())) {
      score += 30
    }
  }
  
  // Bio/summary similarity (if available)
  if (linkedinData.summary && sourceTarget.bio) {
    const commonWords = findCommonWords(linkedinData.summary, sourceTarget.bio)
    score += Math.min(commonWords.length * 5, 30)
  }
  
  return Math.min(score, 100)
}

function calculateNameSimilarity(name1, name2) {
  const clean1 = name1.toLowerCase().replace(/[^a-z\s]/g, '')
  const clean2 = name2.toLowerCase().replace(/[^a-z\s]/g, '')
  
  const words1 = clean1.split(/\s+/)
  const words2 = clean2.split(/\s+/)
  
  const commonWords = words1.filter(word => words2.includes(word))
  const totalWords = Math.max(words1.length, words2.length)
  
  return totalWords > 0 ? commonWords.length / totalWords : 0
}

function findCommonWords(text1, text2) {
  const words1 = text1.toLowerCase().match(/\b\w{4,}\b/g) || []
  const words2 = text2.toLowerCase().match(/\b\w{4,}\b/g) || []
  
  return words1.filter(word => words2.includes(word))
}

function deduplicateLinkedInCandidates(candidates) {
  const seen = new Set()
  const unique = []
  
  for (const candidate of candidates) {
    const key = `${candidate.name.toLowerCase()}_${candidate.linkedin_url || candidate.url || ''}`
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(candidate)
    }
  }
  
  return unique
}

async function enhanceLinkedInCandidateScoring(candidates, enhancedQuery) {
  // Apply additional scoring enhancements
  return candidates.map(candidate => {
    // Cross-platform bonus
    if (candidate.cross_platform_match) {
      candidate.overall_score += 5
      candidate.source_correlation_bonus = candidate.source_correlation_score || 0
    }
    
    // Discovery method scoring
    if (candidate.discovery_method === 'google_search') {
      candidate.search_relevance_bonus = 10
    }
    
    return candidate
  })
}

async function saveCrossPlatformCorrelation(supabase, candidate, sourceTarget) {
  try {
    await supabase
      .from('candidate_sources')
      .upsert({
        candidate_id: `linkedin_${candidate.name.replace(/\s+/g, '_')}`,
        platform: 'linkedin',
        platform_id: candidate.linkedin_url || candidate.url,
        url: candidate.linkedin_url || candidate.url,
        data: {
          ...candidate,
          cross_platform_correlation: {
            source_platform: sourceTarget.platform,
            source_id: sourceTarget.source_id,
            correlation_score: candidate.source_correlation_score,
            discovery_method: candidate.discovery_method
          }
        }
      }, { onConflict: 'platform,platform_id' })
  } catch (error) {
    console.error('Error saving cross-platform correlation:', error)
  }
}
