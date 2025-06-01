
export async function enrichWithPerplexity(candidate: any, perplexityApiKey: string) {
  try {
    const searchQuery = buildPerplexityQuery(candidate)
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: `Find and verify recent professional information about this developer. Focus on current employment, recent projects, and professional reputation. Be concise and factual.`
          },
          {
            role: 'user',
            content: searchQuery
          }
        ],
        temperature: 0.2,
        max_tokens: 500
      }),
    })

    const data = await response.json()
    const content = data.choices[0].message.content || ''
    
    return {
      ...candidate,
      perplexity_enrichment: content,
      perplexity_enriched: true,
      last_enriched: new Date().toISOString()
    }
  } catch (error) {
    console.error('Error enriching with Perplexity:', error)
    return { ...candidate, perplexity_enriched: false }
  }
}

function buildPerplexityQuery(candidate: any): string {
  const searchTerms = [
    candidate.name,
    candidate.github_username,
    candidate.title,
    'developer'
  ].filter(Boolean)

  return `Find recent professional information about: ${searchTerms.join(' ')}`
}
