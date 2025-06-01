export interface SearchError {
  type: 'validation' | 'network' | 'service' | 'unknown';
  message: string;
  retryable: boolean;
}

export function validateAndSanitizeQuery(query: string): { isValid: boolean; sanitized: string; errors: string[] } {
  const errors: string[] = []
  
  if (!query) {
    errors.push('Query cannot be empty')
    return { isValid: false, sanitized: '', errors }
  }
  
  if (typeof query !== 'string') {
    errors.push('Query must be a string')
    return { isValid: false, sanitized: '', errors }
  }
  
  // Sanitize the query
  let sanitized = query.trim()
  
  // Length validation
  if (sanitized.length < 2) {
    errors.push('Query must be at least 2 characters long')
    return { isValid: false, sanitized, errors }
  }
  
  if (sanitized.length > 500) {
    errors.push('Query too long (max 500 characters)')
    sanitized = sanitized.substring(0, 500)
  }
  
  // Remove potentially harmful characters but keep useful ones
  sanitized = sanitized.replace(/[<>]/g, '')
  
  // Remove excessive whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim()
  
  return { isValid: errors.length === 0, sanitized, errors }
}

export function validateUserId(user_id: any): { isValid: boolean; error?: string } {
  if (!user_id) {
    return { isValid: false, error: 'User ID is required' }
  }
  
  if (typeof user_id !== 'string') {
    return { isValid: false, error: 'User ID must be a string' }
  }
  
  // Basic UUID format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(user_id)) {
    return { isValid: false, error: 'Invalid User ID format' }
  }
  
  return { isValid: true }
}
