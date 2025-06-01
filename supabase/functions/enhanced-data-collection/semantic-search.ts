
export async function generateQueryEmbedding(query: string, openaiApiKey: string): Promise<number[] | null> {
  try {
    console.log('🧠 Generating semantic embedding for query...')
    
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query,
        encoding_format: 'float'
      }),
    })

    if (!response.ok) {
      console.error(`OpenAI Embeddings API error: ${response.status}`)
      return null
    }

    const data = await response.json()
    return data.data[0].embedding

  } catch (error) {
    console.error('Error generating query embedding:', error)
    return null
  }
}

export async function calculateSemanticSimilarity(
  candidateProfile: string,
  queryEmbedding: number[],
  openaiApiKey: string
): Promise<number> {
  try {
    // Generate embedding for candidate profile
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: candidateProfile,
        encoding_format: 'float'
      }),
    })

    if (!response.ok) {
      return 0
    }

    const data = await response.json()
    const candidateEmbedding = data.data[0].embedding

    // Calculate cosine similarity
    const similarity = cosineSimilarity(queryEmbedding, candidateEmbedding)
    return Math.round(similarity * 100)

  } catch (error) {
    console.error('Error calculating semantic similarity:', error)
    return 0
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, a_i, i) => sum + a_i * b[i], 0)
  const magnitudeA = Math.sqrt(a.reduce((sum, a_i) => sum + a_i * a_i, 0))
  const magnitudeB = Math.sqrt(b.reduce((sum, b_i) => sum + b_i * b_i, 0))
  
  return dotProduct / (magnitudeA * magnitudeB)
}

export function buildSemanticProfile(candidate: any): string {
  const profile = [
    `Name: ${candidate.name}`,
    `Title: ${candidate.title || 'Developer'}`,
    `Location: ${candidate.location || 'Unknown'}`,
    `Summary: ${candidate.summary || ''}`,
    `Skills: ${candidate.skills?.join(', ') || ''}`,
    `Experience: ${candidate.experience_years || 0} years`,
    `Current Company: ${candidate.current_company || 'Unknown'}`
  ].filter(Boolean).join('. ')
  
  return profile
}

export async function detectAvailabilitySignals(candidate: any, openaiApiKey: string): Promise<any> {
  try {
    const profile = buildSemanticProfile(candidate)
    const prompt = `Analyze this developer profile and detect availability signals for job opportunities.

Profile: ${profile}

Look for indicators of:
1. Job seeking behavior (recent GitHub activity changes, portfolio updates)
2. Career transition signals (skill expansion, new learning)
3. Professional growth indicators (leadership roles, mentoring)
4. Engagement level (community activity, content creation)

Return a JSON object with:
{
  "availability_score": number (0-100),
  "signals": ["signal1", "signal2"],
  "likelihood": "high|medium|low",
  "recommended_approach": "direct|casual|warm_intro"
}

Be concise and focus on actionable insights.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert talent acquisition analyst. Analyze developer profiles to detect job seeking and availability signals.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 300
      }),
    })

    if (response.ok) {
      const data = await response.json()
      const analysis = data.choices[0].message.content.trim()
      
      try {
        return JSON.parse(analysis)
      } catch {
        // Fallback if JSON parsing fails
        return {
          availability_score: 50,
          signals: ['Active GitHub profile'],
          likelihood: 'medium',
          recommended_approach: 'casual'
        }
      }
    }
    
    return null

  } catch (error) {
    console.error('Error detecting availability signals:', error)
    return null
  }
}

export async function generatePersonalizedOutreach(candidate: any, jobContext: any, openaiApiKey: string): Promise<string | null> {
  try {
    const prompt = `Create a personalized outreach message for this developer:

Candidate: ${candidate.name}
Title: ${candidate.title}
Skills: ${candidate.skills?.join(', ') || 'Not specified'}
Company: ${candidate.current_company || 'Unknown'}
Location: ${candidate.location || 'Unknown'}

Job Context:
${JSON.stringify(jobContext, null, 2)}

Create a personalized, professional outreach message that:
1. References their specific skills and background
2. Explains why they're a good fit
3. Highlights growth opportunities
4. Includes a clear call-to-action
5. Maintains a respectful, non-pushy tone

Keep it under 150 words and make it feel genuine, not templated.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert recruiter who writes personalized, effective outreach messages that respect candidates and focus on mutual benefit.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 300
      }),
    })

    if (response.ok) {
      const data = await response.json()
      return data.choices[0].message.content.trim()
    }
    
    return null

  } catch (error) {
    console.error('Error generating personalized outreach:', error)
    return null
  }
}
