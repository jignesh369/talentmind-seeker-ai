
export async function executeSemanticSearch(supabase: any, criteria: any): Promise<{ data: any[], error?: string }> {
  try {
    console.log('🧠 Executing semantic search strategy')
    
    if (!criteria?.semantic_skills || !Array.isArray(criteria.semantic_skills) || criteria.semantic_skills.length === 0) {
      return { data: [] }
    }
    
    // Search using semantic skills
    const semanticQuery = supabase
      .from('candidates')
      .select('*')
      .overlaps('skills', criteria.semantic_skills)
      .order('overall_score', { ascending: false })
      .limit(25)
    
    const { data, error } = await semanticQuery
    
    if (error) {
      throw new Error(`Semantic search failed: ${error.message}`)
    }
    
    // Boost semantic matches
    const enhancedData = (data || []).map(candidate => ({
      ...candidate,
      hybrid_score: (candidate.overall_score || 0) + 30, // Strong semantic boost
      search_strategy: 'semantic'
    }))
    
    console.log(`✅ Semantic search completed: ${enhancedData.length} results`)
    return { data: enhancedData }
    
  } catch (error) {
    console.error('❌ Semantic search error:', error.message)
    return { data: [], error: error.message }
  }
}

export async function executeRoleBasedSearch(supabase: any, criteria: any): Promise<{ data: any[], error?: string }> {
  try {
    console.log('👔 Executing role-based search strategy')
    
    if (!criteria?.role_types || !Array.isArray(criteria.role_types) || criteria.role_types.length === 0) {
      return { data: [] }
    }
    
    // Build role search conditions
    const roleConditions = criteria.role_types
      .map(role => `title.ilike.%${role.replace(/[%_\\]/g, '\\$&')}%`)
      .join(',')
    
    const roleQuery = supabase
      .from('candidates')
      .select('*')
      .or(roleConditions)
      .order('overall_score', { ascending: false })
      .limit(20)
    
    const { data, error } = await roleQuery
    
    if (error) {
      throw new Error(`Role-based search failed: ${error.message}`)
    }
    
    // Add role match scoring
    const enhancedData = (data || []).map(candidate => {
      let roleBoost = 0
      const candidateTitle = candidate.title?.toLowerCase() || ''
      
      // Calculate role relevance boost
      criteria.role_types.forEach(role => {
        if (candidateTitle.includes(role.toLowerCase())) {
          roleBoost += 20
        }
      })
      
      return {
        ...candidate,
        hybrid_score: (candidate.overall_score || 0) + roleBoost,
        search_strategy: 'role_based'
      }
    })
    
    console.log(`✅ Role-based search completed: ${enhancedData.length} results`)
    return { data: enhancedData }
    
  } catch (error) {
    console.error('❌ Role-based search error:', error.message)
    return { data: [], error: error.message }
  }
}

export async function executeSenioritySearch(supabase: any, criteria: any): Promise<{ data: any[], error?: string }> {
  try {
    console.log('🎯 Executing seniority-based search strategy')
    
    if (!criteria?.seniority_level || criteria.seniority_level === 'any') {
      return { data: [] }
    }
    
    // Map seniority to experience range
    const seniorityMap = {
      'junior': { min: 0, max: 3 },
      'mid': { min: 2, max: 6 },
      'senior': { min: 5, max: 12 },
      'lead': { min: 7, max: 15 },
      'principal': { min: 10, max: 25 }
    }
    
    const experienceRange = seniorityMap[criteria.seniority_level]
    if (!experienceRange) {
      return { data: [] }
    }
    
    const seniorityQuery = supabase
      .from('candidates')
      .select('*')
      .gte('experience_years', experienceRange.min)
      .lte('experience_years', experienceRange.max)
      .order('overall_score', { ascending: false })
      .limit(20)
    
    const { data, error } = await seniorityQuery
    
    if (error) {
      throw new Error(`Seniority search failed: ${error.message}`)
    }
    
    const enhancedData = (data || []).map(candidate => ({
      ...candidate,
      hybrid_score: (candidate.overall_score || 0) + 18, // Seniority boost
      search_strategy: 'seniority_based'
    }))
    
    console.log(`✅ Seniority search completed: ${enhancedData.length} results`)
    return { data: enhancedData }
    
  } catch (error) {
    console.error('❌ Seniority search error:', error.message)
    return { data: [], error: error.message }
  }
}

export async function executeIndustrySearch(supabase: any, criteria: any): Promise<{ data: any[], error?: string }> {
  try {
    console.log('🏢 Executing industry-based search strategy')
    
    if (!criteria?.industries || !Array.isArray(criteria.industries) || criteria.industries.length === 0) {
      return { data: [] }
    }
    
    // Search in summary and skills for industry keywords
    const industryTerms = criteria.industries.join('|')
    const industryConditions = [
      `summary.ilike.%${industryTerms}%`,
      `skills.cs.{${criteria.industries.join(',')}}`
    ]
    
    const industryQuery = supabase
      .from('candidates')
      .select('*')
      .or(industryConditions.join(','))
      .order('overall_score', { ascending: false })
      .limit(15)
    
    const { data, error } = await industryQuery
    
    if (error) {
      throw new Error(`Industry search failed: ${error.message}`)
    }
    
    const enhancedData = (data || []).map(candidate => ({
      ...candidate,
      hybrid_score: (candidate.overall_score || 0) + 12, // Industry boost
      search_strategy: 'industry_based'
    }))
    
    console.log(`✅ Industry search completed: ${enhancedData.length} results`)
    return { data: enhancedData }
    
  } catch (error) {
    console.error('❌ Industry search error:', error.message)
    return { data: [], error: error.message }
  }
}
