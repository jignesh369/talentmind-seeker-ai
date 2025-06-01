
export async function executeAdvancedSemanticSearch(supabase: any, criteria: any): Promise<{ data: any[], error?: string }> {
  try {
    console.log('🧠 Executing advanced semantic search strategy')
    
    if (!criteria?.contextual_skills || !Array.isArray(criteria.contextual_skills) || criteria.contextual_skills.length === 0) {
      return { data: [] }
    }
    
    // Multi-layered semantic search with contextual understanding
    const semanticQuery = supabase
      .from('candidates')
      .select('*')
      .or(`skills.cs.{${criteria.contextual_skills.join(',')}},summary.ilike.%${criteria.contextual_skills.slice(0, 3).join('%,summary.ilike.%')}%`)
      .order('overall_score', { ascending: false })
      .limit(30)
    
    const { data, error } = await semanticQuery
    
    if (error) {
      throw new Error(`Advanced semantic search failed: ${error.message}`)
    }
    
    // Enhanced contextual scoring
    const enhancedData = (data || []).map(candidate => {
      let contextualBoost = 0;
      
      // Technology stack bonus
      if (criteria.technology_stack?.length > 0) {
        const stackMatches = criteria.technology_stack.filter(stack => 
          candidate.skills?.some(skill => 
            criteria.contextual_skills.includes(skill.toLowerCase())
          )
        ).length;
        contextualBoost += stackMatches * 15;
      }
      
      // Role cluster alignment bonus
      if (criteria.role_cluster?.length > 0) {
        const roleAlignment = criteria.role_cluster.some(cluster => 
          candidate.title?.toLowerCase().includes(cluster.toLowerCase())
        );
        if (roleAlignment) contextualBoost += 25;
      }
      
      // Search intent bonus
      switch (criteria.search_intent) {
        case 'active_hiring':
          if (candidate.last_active && new Date(candidate.last_active) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
            contextualBoost += 20;
          }
          break;
        case 'skill_assessment':
          if (candidate.experience_years && candidate.experience_years >= 5) {
            contextualBoost += 15;
          }
          break;
      }
      
      // Confidence score multiplier
      const confidenceMultiplier = Math.max(0.5, criteria.confidence_score / 100);
      
      return {
        ...candidate,
        hybrid_score: (candidate.overall_score || 0) + (contextualBoost * confidenceMultiplier) + 35,
        search_strategy: 'advanced_semantic',
        contextual_boost: contextualBoost,
        confidence_factor: confidenceMultiplier
      }
    })
    
    console.log(`✅ Advanced semantic search completed: ${enhancedData.length} results`)
    return { data: enhancedData }
    
  } catch (error) {
    console.error('❌ Advanced semantic search error:', error.message)
    return { data: [], error: error.message }
  }
}

export async function executeTechnologyStackSearch(supabase: any, criteria: any): Promise<{ data: any[], error?: string }> {
  try {
    console.log('🔧 Executing technology stack search strategy')
    
    if (!criteria?.technology_stack || !Array.isArray(criteria.technology_stack) || criteria.technology_stack.length === 0) {
      return { data: [] }
    }
    
    // Search for candidates with complete technology stacks
    const stackQuery = supabase
      .from('candidates')
      .select('*')
      .overlaps('skills', criteria.contextual_skills.slice(0, 10))
      .order('overall_score', { ascending: false })
      .limit(25)
    
    const { data, error } = await stackQuery
    
    if (error) {
      throw new Error(`Technology stack search failed: ${error.message}`)
    }
    
    // Stack completeness scoring
    const enhancedData = (data || []).map(candidate => {
      let stackScore = 0;
      
      criteria.technology_stack.forEach(stack => {
        const stackSkills = getStackSkills(stack);
        const matchedSkills = stackSkills.filter(skill => 
          candidate.skills?.some(candidateSkill => 
            candidateSkill.toLowerCase().includes(skill.toLowerCase())
          )
        ).length;
        
        const completeness = matchedSkills / stackSkills.length;
        stackScore += completeness * 30;
      });
      
      return {
        ...candidate,
        hybrid_score: (candidate.overall_score || 0) + stackScore + 28,
        search_strategy: 'technology_stack',
        stack_completeness: stackScore
      }
    })
    
    console.log(`✅ Technology stack search completed: ${enhancedData.length} results`)
    return { data: enhancedData }
    
  } catch (error) {
    console.error('❌ Technology stack search error:', error.message)
    return { data: [], error: error.message }
  }
}

export async function executeIntentBasedSearch(supabase: any, criteria: any): Promise<{ data: any[], error?: string }> {
  try {
    console.log('🎯 Executing intent-based search strategy')
    
    let intentQuery = supabase.from('candidates').select('*');
    let intentBoost = 0;
    
    switch (criteria.search_intent) {
      case 'active_hiring':
        // Prioritize recently active candidates
        intentQuery = intentQuery
          .gte('last_active', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
          .order('last_active', { ascending: false });
        intentBoost = 22;
        break;
        
      case 'skill_assessment':
        // Prioritize experienced candidates
        intentQuery = intentQuery
          .gte('experience_years', 3)
          .order('experience_years', { ascending: false });
        intentBoost = 18;
        break;
        
      case 'competitive_intelligence':
        // Prioritize high-scoring candidates
        intentQuery = intentQuery
          .gte('overall_score', 70)
          .order('overall_score', { ascending: false });
        intentBoost = 20;
        break;
        
      default:
        intentQuery = intentQuery.order('overall_score', { ascending: false });
        intentBoost = 10;
    }
    
    const { data, error } = await intentQuery.limit(20);
    
    if (error) {
      throw new Error(`Intent-based search failed: ${error.message}`)
    }
    
    const enhancedData = (data || []).map(candidate => ({
      ...candidate,
      hybrid_score: (candidate.overall_score || 0) + intentBoost,
      search_strategy: 'intent_based',
      intent_match: criteria.search_intent
    }))
    
    console.log(`✅ Intent-based search completed: ${enhancedData.length} results`)
    return { data: enhancedData }
    
  } catch (error) {
    console.error('❌ Intent-based search error:', error.message)
    return { data: [], error: error.message }
  }
}

function getStackSkills(stackName: string): string[] {
  const stacks = {
    'mern': ['mongodb', 'express', 'react', 'node.js'],
    'mean': ['mongodb', 'express', 'angular', 'node.js'],
    'lamp': ['linux', 'apache', 'mysql', 'php'],
    'django_stack': ['python', 'django', 'postgresql', 'redis'],
    'spring_stack': ['java', 'spring', 'mysql', 'maven'],
    'jamstack': ['javascript', 'api', 'markup', 'gatsby', 'next.js']
  };
  
  return stacks[stackName] || [];
}
