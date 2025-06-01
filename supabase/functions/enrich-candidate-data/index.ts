
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
    const { candidateId, candidateName, existingData } = await req.json()
    console.log(`Starting enrichment for candidate: ${candidateName}`)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    const apolloApiKey = Deno.env.get('APOLLO_API_KEY')
    const googleApiKey = Deno.env.get('GOOGLE_API_KEY')
    const searchEngineId = Deno.env.get('GOOGLE_SEARCH_ENGINE_ID')

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    let enrichedData = { ...existingData }
    const sources = []

    // Step 1: Generate targeted Google searches for LinkedIn profiles
    if (googleApiKey && searchEngineId && !existingData.linkedinUrl) {
      try {
        console.log(`Searching for LinkedIn profile for ${candidateName}`)
        
        const searchQueries = [
          `site:linkedin.com/in "${candidateName}"`,
          `site:linkedin.com/in "${candidateName}" "${existingData.title || 'developer'}"`,
          `site:linkedin.com/in "${candidateName}" "${existingData.location || ''}"`.trim()
        ]

        for (const query of searchQueries) {
          const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&num=3`
          
          const response = await fetch(searchUrl)
          if (response.ok) {
            const data = await response.json()
            
            if (data.items && data.items.length > 0) {
              for (const item of data.items) {
                if (item.link.includes('linkedin.com/in/')) {
                  enrichedData.linkedinUrl = item.link
                  sources.push('Google Search - LinkedIn')
                  console.log(`Found LinkedIn profile: ${item.link}`)
                  break
                }
              }
            }
          }
          
          if (enrichedData.linkedinUrl) break
          await new Promise(resolve => setTimeout(resolve, 1000)) // Rate limiting
        }
      } catch (error) {
        console.error('Google search enrichment failed:', error)
      }
    }

    // Step 2: Check Apollo.io rate limiting (only if not used in last 30 days)
    let canUseApollo = true
    if (apolloApiKey) {
      try {
        const { data: lastEnrichment } = await supabase
          .from('candidates')
          .select('updated_at')
          .eq('id', candidateId)
          .single()

        if (lastEnrichment?.updated_at) {
          const lastUpdate = new Date(lastEnrichment.updated_at)
          const thirtyDaysAgo = new Date()
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
          
          if (lastUpdate > thirtyDaysAgo) {
            canUseApollo = false
            console.log(`Apollo.io rate limited for ${candidateName} - last used within 30 days`)
          }
        }
      } catch (error) {
        console.error('Error checking Apollo rate limit:', error)
      }
    }

    // Step 3: Apollo.io enrichment (if email missing and rate limit allows)
    if (apolloApiKey && !existingData.email && canUseApollo) {
      try {
        console.log(`Using Apollo.io to find email for ${candidateName}`)
        
        const apolloPayload = {
          q_person_name: candidateName,
          page: 1,
          per_page: 1
        }

        if (existingData.title) {
          apolloPayload.person_titles = [existingData.title]
        }

        if (existingData.location) {
          apolloPayload.organization_locations = [existingData.location]
        }

        const apolloResponse = await fetch('https://api.apollo.io/v1/mixed_people/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'X-Api-Key': apolloApiKey
          },
          body: JSON.stringify(apolloPayload)
        })

        if (apolloResponse.ok) {
          const apolloData = await apolloResponse.json()
          
          if (apolloData.people && apolloData.people.length > 0) {
            const person = apolloData.people[0]
            
            if (person.email) {
              enrichedData.email = person.email
              sources.push('Apollo.io')
              console.log(`Found email via Apollo.io: ${person.email}`)
            }

            if (person.linkedin_url && !enrichedData.linkedinUrl) {
              enrichedData.linkedinUrl = person.linkedin_url
              sources.push('Apollo.io - LinkedIn')
            }

            if (person.organization && !enrichedData.currentCompany) {
              enrichedData.currentCompany = person.organization.name
              sources.push('Apollo.io - Company')
            }
          }
        }
      } catch (error) {
        console.error('Apollo.io enrichment failed:', error)
      }
    }

    // Step 4: Enhanced skill extraction using OpenAI
    if (openaiApiKey && (!existingData.skills || existingData.skills.length < 3)) {
      try {
        console.log(`Enhancing skills for ${candidateName}`)
        
        const skillPrompt = `Based on the following candidate information, extract and suggest relevant technical skills:
        
Name: ${candidateName}
Title: ${existingData.title || 'Developer'}
Location: ${existingData.location || 'Unknown'}
Existing Skills: ${existingData.skills?.join(', ') || 'None'}

Please provide a JSON array of 5-10 relevant technical skills that this person likely has based on their title and role. Focus on programming languages, frameworks, tools, and technologies.

Example response: ["JavaScript", "React", "Node.js", "Python", "AWS"]`

        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{
              role: 'user',
              content: skillPrompt
            }],
            max_tokens: 200,
            temperature: 0.3
          })
        })

        if (openaiResponse.ok) {
          const openaiData = await openaiResponse.json()
          const content = openaiData.choices[0]?.message?.content
          
          if (content) {
            try {
              const suggestedSkills = JSON.parse(content)
              if (Array.isArray(suggestedSkills)) {
                const currentSkills = existingData.skills || []
                const newSkills = [...new Set([...currentSkills, ...suggestedSkills])]
                enrichedData.skills = newSkills.slice(0, 15) // Limit to 15 skills
                sources.push('AI Skill Enhancement')
                console.log(`Enhanced skills: ${newSkills.join(', ')}`)
              }
            } catch (parseError) {
              console.error('Failed to parse AI skills response:', parseError)
            }
          }
        }
      } catch (error) {
        console.error('OpenAI skill enhancement failed:', error)
      }
    }

    // Step 5: Update candidate in database
    const updateData = {
      ...enrichedData,
      updated_at: new Date().toISOString(),
      last_enriched: new Date().toISOString(),
      enrichment_sources: sources
    }

    const { error: updateError } = await supabase
      .from('candidates')
      .update(updateData)
      .eq('id', candidateId)

    if (updateError) {
      throw updateError
    }

    console.log(`Successfully enriched ${candidateName} with sources: ${sources.join(', ')}`)

    return new Response(
      JSON.stringify({
        success: true,
        candidateId,
        enrichedData,
        sources,
        message: `Successfully enriched ${candidateName}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Enrichment error:', error)
    
    return new Response(
      JSON.stringify({
        error: 'Failed to enrich candidate data',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
