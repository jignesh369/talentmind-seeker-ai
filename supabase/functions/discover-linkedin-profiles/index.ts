
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { searchQuery, maxResults = 20 } = await req.json()

    if (!searchQuery) {
      return new Response(
        JSON.stringify({ error: 'Search query is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const googleApiKey = Deno.env.get('GOOGLE_API_KEY')
    const searchEngineId = Deno.env.get('GOOGLE_SEARCH_ENGINE_ID')

    if (!googleApiKey || !searchEngineId) {
      console.error('❌ Google Search API credentials not configured')
      return new Response(
        JSON.stringify({ error: 'Google Search API not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('🔍 Searching for LinkedIn profiles:', searchQuery)

    const profileUrls: string[] = []
    
    // Try multiple search strategies
    const searchStrategies = [
      `site:linkedin.com/in ${searchQuery}`,
      `"linkedin.com/in" ${searchQuery}`,
      `${searchQuery} linkedin profile`,
      `${searchQuery} site:linkedin.com`
    ]

    for (const query of searchStrategies) {
      try {
        console.log(`🔍 Trying search: ${query}`)
        const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&num=10`
        
        const response = await fetch(searchUrl)
        
        if (!response.ok) {
          console.error(`❌ Google Search API error: ${response.status}`)
          continue
        }
        
        const data = await response.json()
        console.log(`📊 Found ${data.items?.length || 0} results for query: ${query}`)
        
        if (data.items && data.items.length > 0) {
          for (const item of data.items) {
            const url = item.link
            
            // Validate LinkedIn profile URL
            if (isValidLinkedInProfileUrl(url) && !profileUrls.includes(url)) {
              profileUrls.push(url)
              console.log(`✅ Found valid LinkedIn URL: ${url}`)
            }
          }
        }

        // Stop if we have enough URLs
        if (profileUrls.length >= maxResults) {
          break
        }

        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (error) {
        console.error(`❌ Error in search strategy "${query}":`, error)
        continue
      }
    }

    console.log(`✅ Found ${profileUrls.length} valid LinkedIn profile URLs`)

    return new Response(
      JSON.stringify({ 
        profileUrls: profileUrls.slice(0, maxResults),
        totalFound: profileUrls.length,
        searchQuery
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error discovering LinkedIn profiles:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to discover LinkedIn profiles',
        details: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function isValidLinkedInProfileUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    const isLinkedIn = urlObj.hostname === 'www.linkedin.com' || urlObj.hostname === 'linkedin.com'
    const isProfile = urlObj.pathname.startsWith('/in/') && 
                     !urlObj.pathname.includes('/company/') &&
                     !urlObj.pathname.includes('/school/') &&
                     !urlObj.pathname.includes('/jobs/') &&
                     !urlObj.pathname.includes('/posts/') &&
                     !urlObj.pathname.includes('/activity/')
    
    // Make sure it's not just the base /in/ path
    const hasUsername = urlObj.pathname.length > 4 && urlObj.pathname !== '/in/'
    
    return isLinkedIn && isProfile && hasUsername
  } catch {
    return false
  }
}
