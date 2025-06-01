
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { saveCandidateWithSource } from '../shared/database-operations.ts'
import { buildCandidate } from '../shared/candidate-builder.ts'

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

    console.log(`🔍 LinkedIn simulation for: "${query}"`)

    const startTime = Date.now()
    const candidates = []

    // Since LinkedIn API access is restricted, we'll create simulated profiles
    // based on the query for demonstration purposes
    const simulatedProfiles = generateLinkedInSimulatedProfiles(query, location)

    for (const profile of simulatedProfiles) {
      try {
        // Use shared candidate builder
        const candidate = buildCandidate({
          name: profile.name,
          title: profile.title,
          location: profile.location || location || '',
          summary: profile.summary,
          skills: profile.skills,
          experience_years: profile.experience_years,
          last_active: new Date().toISOString(),
          platform: 'linkedin',
          platformSpecificData: {
            industry: profile.industry,
            connections: profile.connections,
            company: profile.company
          }
        })

        // LinkedIn-specific scoring
        candidate.overall_score = calculateLinkedInScore(profile)
        candidate.skill_match = calculateSkillMatch(profile.skills, query)
        candidate.experience = Math.min(profile.experience_years * 8, 100)
        candidate.reputation = 75 // LinkedIn profiles generally have good reputation
        candidate.freshness = 85 // Assume recent activity
        candidate.social_proof = Math.min(profile.connections / 10, 100)

        const sourceData = {
          candidate_id: candidate.id,
          platform: 'linkedin',
          platform_id: profile.linkedin_id,
          url: profile.linkedin_url,
          data: profile
        }

        // Use shared database operations
        const saveResult = await saveCandidateWithSource(supabase, candidate, sourceData)
        
        if (saveResult.success) {
          candidates.push(candidate)
          console.log(`💾 Saved LinkedIn candidate: ${candidate.name}`)
        } else {
          console.error(`❌ Failed to save LinkedIn candidate:`, saveResult.error)
        }

      } catch (error) {
        console.error(`❌ Error processing LinkedIn profile:`, error)
        continue
      }
    }

    const processingTime = Date.now() - startTime
    console.log(`✅ LinkedIn collection completed in ${processingTime}ms: ${candidates.length} candidates`)

    return new Response(
      JSON.stringify({ 
        candidates,
        total: candidates.length,
        source: 'linkedin',
        processing_time_ms: processingTime,
        note: 'Simulated LinkedIn profiles - real LinkedIn API requires special access'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Error collecting LinkedIn data:', error)
    return new Response(
      JSON.stringify({ 
        candidates: [], 
        total: 0, 
        source: 'linkedin',
        error: 'Failed to collect LinkedIn data' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function generateLinkedInSimulatedProfiles(query: string, location?: string) {
  const queryTerms = query.toLowerCase().split(' ')
  const skills = extractSkillsFromQuery(queryTerms)
  const role = extractRoleFromQuery(queryTerms)
  
  return [
    {
      linkedin_id: 'sim-001',
      linkedin_url: 'https://linkedin.com/in/simulated-profile-001',
      name: `${role} Professional`,
      title: `Senior ${role}`,
      location: location || 'Remote',
      summary: `Experienced ${role} with expertise in ${skills.slice(0, 3).join(', ')}. Passionate about building scalable solutions and leading technical teams.`,
      skills: skills,
      experience_years: 8,
      industry: 'Technology',
      connections: 500,
      company: 'Tech Company Inc.'
    },
    {
      linkedin_id: 'sim-002',
      linkedin_url: 'https://linkedin.com/in/simulated-profile-002',
      name: `Lead ${role}`,
      title: `Lead ${role}`,
      location: location || 'San Francisco, CA',
      summary: `Results-driven ${role} with strong background in ${skills.slice(1, 4).join(', ')}. Focused on innovation and team development.`,
      skills: skills.slice(1).concat(['Leadership', 'Team Management']),
      experience_years: 6,
      industry: 'Software',
      connections: 800,
      company: 'Innovative Solutions Ltd.'
    },
    {
      linkedin_id: 'sim-003',
      linkedin_url: 'https://linkedin.com/in/simulated-profile-003',
      name: `Full Stack ${role}`,
      title: `Full Stack ${role}`,
      location: location || 'New York, NY',
      summary: `Versatile ${role} specializing in ${skills.slice(0, 2).join(' and ')}. Strong problem-solving skills and attention to detail.`,
      skills: skills.concat(['Problem Solving', 'Communication']),
      experience_years: 4,
      industry: 'Fintech',
      connections: 350,
      company: 'Financial Tech Corp.'
    }
  ]
}

function extractSkillsFromQuery(queryTerms: string[]): string[] {
  const skillMap = {
    'react': 'React',
    'javascript': 'JavaScript',
    'typescript': 'TypeScript',
    'node': 'Node.js',
    'python': 'Python',
    'java': 'Java',
    'angular': 'Angular',
    'vue': 'Vue.js',
    'aws': 'AWS',
    'docker': 'Docker',
    'kubernetes': 'Kubernetes',
    'sql': 'SQL',
    'mongodb': 'MongoDB',
    'postgresql': 'PostgreSQL'
  }
  
  const foundSkills = []
  queryTerms.forEach(term => {
    if (skillMap[term]) {
      foundSkills.push(skillMap[term])
    }
  })
  
  // Add some default skills if none found
  if (foundSkills.length === 0) {
    foundSkills.push('JavaScript', 'React', 'Node.js', 'SQL', 'Git')
  }
  
  return foundSkills.slice(0, 8)
}

function extractRoleFromQuery(queryTerms: string[]): string {
  const roleKeywords = ['developer', 'engineer', 'programmer', 'architect', 'lead', 'senior']
  
  for (const term of queryTerms) {
    if (roleKeywords.includes(term)) {
      return term.charAt(0).toUpperCase() + term.slice(1)
    }
  }
  
  return 'Developer'
}

function calculateLinkedInScore(profile: any): number {
  let score = 40 // Base score
  
  score += Math.min(profile.experience_years * 8, 30)
  score += Math.min(profile.connections / 20, 20)
  score += profile.summary ? 10 : 0
  score += profile.skills?.length ? Math.min(profile.skills.length * 2, 10) : 0
  
  return Math.min(score, 100)
}

function calculateSkillMatch(skills: string[], query: string): number {
  const queryTerms = query.toLowerCase().split(' ')
  const matchingSkills = skills.filter(skill => 
    queryTerms.some(term => skill.toLowerCase().includes(term))
  )
  
  return Math.min((matchingSkills.length / Math.max(queryTerms.length, 1)) * 100, 100)
}
