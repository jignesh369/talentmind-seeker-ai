
export async function safeParseQuery(query: string, supabaseUrl: string, supabaseKey: string): Promise<any> {
  try {
    console.log('🔍 Attempting enhanced query parsing...')
    const parseResponse = await fetch(`${supabaseUrl}/functions/v1/parse-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(8000) // Increased timeout for enhanced parsing
    })
    
    if (!parseResponse.ok) {
      throw new Error(`Enhanced parse query failed with status: ${parseResponse.status}`)
    }
    
    const parseResult = await parseResponse.json()
    console.log('✅ Enhanced query parsing successful:', parseResult.parsed_criteria)
    return parseResult.parsed_criteria
    
  } catch (error) {
    console.warn('⚠️ Enhanced query parsing failed, using basic fallback:', error.message)
    return null
  }
}
