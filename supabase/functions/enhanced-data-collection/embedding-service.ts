
export async function generateQueryEmbedding(query: string, openaiApiKey: string) {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query
      }),
    })

    const data = await response.json()
    return data.data[0].embedding
  } catch (error) {
    console.error('Error generating query embedding:', error)
    return null
  }
}

export async function generateCandidateEmbedding(candidate: any, openaiApiKey: string) {
  try {
    const candidateText = [
      candidate.name,
      candidate.title,
      candidate.summary,
      ...(candidate.skills || [])
    ].filter(Boolean).join(' ')

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: candidateText
      }),
    })

    const data = await response.json()
    return data.data[0].embedding
  } catch (error) {
    console.error('Error generating candidate embedding:', error)
    return null
  }
}

export function calculateCosineSimilarity(embedding1: number[], embedding2: number[]): number {
  if (!embedding1 || !embedding2 || embedding1.length !== embedding2.length) {
    return 0
  }

  let dotProduct = 0
  let norm1 = 0
  let norm2 = 0

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i]
    norm1 += embedding1[i] * embedding1[i]
    norm2 += embedding2[i] * embedding2[i]
  }

  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
}
