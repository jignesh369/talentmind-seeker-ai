
export async function executeSearchStrategy(strategyName: string, query: any, retryCount = 0): Promise<{ data: any[], error?: string }> {
  const MAX_RETRIES = 2
  
  try {
    console.log(`🔍 Executing ${strategyName} strategy (attempt ${retryCount + 1})`)
    
    const { data, error } = await query
    
    if (error) {
      throw new Error(`${strategyName} strategy failed: ${error.message}`)
    }
    
    console.log(`✅ ${strategyName} strategy completed: ${data?.length || 0} results`)
    return { data: data || [] }
    
  } catch (error) {
    console.error(`❌ ${strategyName} strategy error:`, error.message)
    
    // Retry logic for transient errors
    if (retryCount < MAX_RETRIES && (
      error.message?.includes('timeout') ||
      error.message?.includes('network') ||
      error.message?.includes('connection')
    )) {
      console.log(`🔄 Retrying ${strategyName} strategy...`)
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))) // Exponential backoff
      return executeSearchStrategy(strategyName, query, retryCount + 1)
    }
    
    return { data: [], error: error.message }
  }
}
