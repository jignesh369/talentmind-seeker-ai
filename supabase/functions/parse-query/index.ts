
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { extractAdvancedSkillsWithContext } from './skill-extractor.ts';
import { detectSearchIntent } from './search-intent.ts';
import { 
  extractLocationWithVariations,
  extractSeniorityLevel,
  extractRoleTypes,
  extractExperience,
  categorizeSkills,
  extractIndustries,
  generateContextualKeywords
} from './query-extractors.ts';
import { ParsedCriteria } from './types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query } = await req.json()

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Valid query string is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('🔍 Advanced semantic query parsing started:', query);

    // Advanced semantic parsing
    const skillAnalysis = extractAdvancedSkillsWithContext(query);
    const searchIntent = detectSearchIntent(query);
    const contextualKeywords = generateContextualKeywords(
      skillAnalysis.skills, 
      skillAnalysis.role_cluster, 
      searchIntent
    );

    // Enhanced parsing with existing functions
    const location = extractLocationWithVariations(query);
    const seniorityLevel = extractSeniorityLevel(query);
    const roleTypes = extractRoleTypes(query);
    const experience = extractExperience(query);
    const industries = extractIndustries(query);
    const { must_have, nice_to_have } = categorizeSkills(skillAnalysis.skills);

    const parsed: ParsedCriteria = {
      skills: skillAnalysis.skills,
      semantic_skills: skillAnalysis.semantic_skills,
      contextual_skills: skillAnalysis.contextual_skills,
      location,
      experience_min: experience.min,
      experience_max: experience.max,
      job_titles: roleTypes,
      keywords: query.split(' ').filter(word => word.length > 2),
      semantic_keywords: [...skillAnalysis.semantic_skills, ...roleTypes],
      contextual_keywords,
      industries,
      company_types: [],
      role_types: roleTypes,
      seniority_level: seniorityLevel,
      must_have_skills: must_have,
      nice_to_have_skills: nice_to_have,
      search_intent: searchIntent,
      confidence_score: skillAnalysis.confidence_score,
      role_cluster: skillAnalysis.role_cluster,
      technology_stack: skillAnalysis.technology_stack
    };

    console.log('✅ Advanced semantic parsing completed:', {
      originalQuery: query,
      extractedSkills: skillAnalysis.skills.length,
      semanticSkills: skillAnalysis.semantic_skills.length,
      contextualSkills: skillAnalysis.contextual_skills.length,
      confidenceScore: skillAnalysis.confidence_score,
      searchIntent,
      technologyStack: skillAnalysis.technology_stack.length,
      roleClusters: skillAnalysis.role_cluster.length
    });

    return new Response(
      JSON.stringify({ parsed_criteria: parsed }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Advanced semantic parsing error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to parse query with advanced semantic processing',
        fallback_parsing: true 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
