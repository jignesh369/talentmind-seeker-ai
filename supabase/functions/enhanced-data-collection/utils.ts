
export function getFunctionNameForSource(source: string): string {
  const functionMap = {
    'github': 'collect-github-data',
    'stackoverflow': 'collect-stackoverflow-data',
    'google': 'collect-google-search-data',
    'linkedin': 'collect-linkedin-data',
    'kaggle': 'collect-kaggle-data',
    'devto': 'collect-devto-data'
  }
  
  return functionMap[source] || `collect-${source}-data`
}
