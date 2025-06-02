
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { saveCandidateWithSource, sanitizeIntegerValue, sanitizeStringValue, generateValidUUID } from '../shared/database-operations.ts'
import { EnhancedGitHubSearchStrategies, ParsedQuery } from './enhanced-search-strategies.ts';

// Enhanced candidate processor with proper data sanitization
async function processGitHubCandidate(username: string, githubToken: string): Promise<any | null> {
  try {
    console.log(`👤 Fetching GitHub profile: ${username}`);
    
    // Fetch user profile
    const userResponse = await fetch(`https://api.github.com/users/${username}`, {
      headers: { 'Authorization': `token ${githubToken}` }
    });
    
    if (!userResponse.ok) {
      console.log(`⚠️ Failed to fetch user ${username}: ${userResponse.status}`);
      return null;
    }
    
    const user = await userResponse.json();
    
    // Fetch repositories for skill analysis
    console.log(`📚 Fetching GitHub repos for: ${username}`);
    const reposResponse = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=20`, {
      headers: { 'Authorization': `token ${githubToken}` }
    });
    
    const repos = reposResponse.ok ? await reposResponse.json() : [];
    
    // Extract skills from repositories
    const languages = new Set<string>();
    let totalStars = 0;
    let totalForks = 0;
    
    repos.forEach((repo: any) => {
      if (repo.language) languages.add(repo.language);
      totalStars += repo.stargazers_count || 0;
      totalForks += repo.forks_count || 0;
    });
    
    // Calculate experience years (account creation to now)
    const accountAge = Math.floor((Date.now() - new Date(user.created_at).getTime()) / (365 * 24 * 60 * 60 * 1000));
    
    // Generate enhanced candidate profile with proper data types
    const candidate = {
      id: generateValidUUID(),
      name: sanitizeStringValue(user.name || user.login, 'Unknown'),
      title: sanitizeStringValue(user.bio, `${user.login} - Developer`),
      location: sanitizeStringValue(user.location, ''),
      avatar_url: sanitizeStringValue(user.avatar_url),
      email: user.email ? sanitizeStringValue(user.email) : null,
      github_username: sanitizeStringValue(user.login),
      summary: sanitizeStringValue(user.bio, `GitHub developer with ${repos.length} repositories and ${user.followers} followers.`),
      skills: Array.from(languages).slice(0, 10),
      experience_years: sanitizeIntegerValue(Math.min(accountAge, 20)),
      last_active: user.updated_at || new Date().toISOString(),
      overall_score: sanitizeIntegerValue(Math.min((user.followers * 2 + totalStars + repos.length) / 10, 100)),
      skill_match: sanitizeIntegerValue(Math.min(languages.size * 10, 100)),
      experience: sanitizeIntegerValue(Math.min(repos.length * 5, 100)),
      reputation: sanitizeIntegerValue(Math.min(user.followers * 2, 100)),
      freshness: sanitizeIntegerValue(Math.max(0, 100 - (Date.now() - new Date(user.updated_at || user.created_at).getTime()) / (7 * 24 * 60 * 60 * 1000))),
      social_proof: sanitizeIntegerValue(Math.min(totalStars + totalForks, 100)),
      risk_flags: [],
      platform: 'github'
    };
    
    console.log(`💾 Enhanced candidate: ${candidate.name} (${candidate.github_username}) - ID: ${candidate.id}`);
    return candidate;
    
  } catch (error) {
    console.error(`❌ Error processing GitHub candidate ${username}:`, error.message);
    return null;
  }
}

// Simple query parser for GitHub collection (self-contained)
function parseQueryForGitHub(query: string, location?: string): ParsedQuery {
  const normalizedQuery = query.toLowerCase();
  
  // Detect search intent
  let searchIntent = 'general_tech_search';
  if (normalizedQuery.includes('unity') || normalizedQuery.includes('unreal') || normalizedQuery.includes('game')) {
    searchIntent = 'game_development_search';
  } else if (normalizedQuery.includes('react') || normalizedQuery.includes('frontend') || normalizedQuery.includes('javascript')) {
    searchIntent = 'frontend_development_search';
  } else if (normalizedQuery.includes('devops') || normalizedQuery.includes('kubernetes') || normalizedQuery.includes('aws')) {
    searchIntent = 'devops_search';
  }

  // Extract enhanced skills based on intent
  const enhancedSkills = [];
  if (searchIntent === 'game_development_search') {
    if (normalizedQuery.includes('unity')) enhancedSkills.push('Unity', 'C#', 'Game Development');
    if (normalizedQuery.includes('unreal')) enhancedSkills.push('Unreal Engine', 'C++', 'Game Development');
    if (normalizedQuery.includes('game')) enhancedSkills.push('Game Development');
  } else if (searchIntent === 'frontend_development_search') {
    if (normalizedQuery.includes('react')) enhancedSkills.push('React', 'JavaScript', 'Frontend');
    if (normalizedQuery.includes('typescript')) enhancedSkills.push('TypeScript', 'JavaScript');
  } else if (searchIntent === 'devops_search') {
    if (normalizedQuery.includes('kubernetes')) enhancedSkills.push('Kubernetes', 'Docker', 'DevOps');
    if (normalizedQuery.includes('aws')) enhancedSkills.push('AWS', 'Cloud Computing', 'DevOps');
  }

  // Normalize location
  const normalizedLocation = [];
  if (location) {
    normalizedLocation.push(location);
    // Add country if city is detected
    const locationLower = location.toLowerCase();
    if (['hyderabad', 'bangalore', 'mumbai', 'delhi', 'pune'].includes(locationLower)) {
      normalizedLocation.push('India');
    }
  }

  return {
    searchIntent,
    enhancedSkills,
    normalizedLocation,
    confidence: enhancedSkills.length > 0 ? 80 : 50
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query, location, time_budget = 20 } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const githubToken = Deno.env.get('GITHUB_TOKEN');
    
    if (!githubToken) {
      console.error('❌ GitHub token not configured');
      return new Response(
        JSON.stringify({ 
          candidates: [], 
          total: 0, 
          error: 'GitHub API not configured' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🚀 Starting enhanced GitHub collection...');
    console.log(`Query: "${query}", Location: "${location || 'Not specified'}", Time Budget: ${time_budget}s`);

    const startTime = Date.now();
    const maxProcessingTime = (time_budget - 2) * 1000;

    // Parse query for enhanced search strategies
    const parsedQuery = parseQueryForGitHub(query, location);
    console.log('📊 Parsed query for GitHub:', parsedQuery);

    // Generate enhanced search strategies
    const searchStrategies = EnhancedGitHubSearchStrategies.generateStrategiesFromParsedQuery(parsedQuery, location);
    console.log(`🎯 Generated ${searchStrategies.length} enhanced search strategies`);

    const candidates = [];
    const savedCandidates = [];
    let successCount = 0;
    let errorCount = 0;

    // Execute search strategies with enhanced targeting
    for (const strategy of searchStrategies.slice(0, 3)) {
      if (Date.now() - startTime > maxProcessingTime) {
        console.log(`⏱️ Time budget exceeded, stopping at ${candidates.length} candidates`);
        break;
      }

      console.log(`🔍 Executing strategy: ${strategy.name} - ${strategy.query}`);

      try {
        const searchResponse = await fetch(
          `https://api.github.com/search/users?q=${encodeURIComponent(strategy.query)}&sort=followers&order=desc&per_page=10`,
          {
            headers: { 'Authorization': `token ${githubToken}` }
          }
        );

        if (!searchResponse.ok) {
          console.log(`⚠️ Strategy ${strategy.name} failed: ${searchResponse.status}`);
          continue;
        }

        const searchResult = await searchResponse.json();
        const users = searchResult.items || [];
        
        console.log(`📋 Strategy ${strategy.name} found ${users.length} users`);

        // Process users from this strategy
        for (const user of users.slice(0, 5)) {
          if (Date.now() - startTime > maxProcessingTime) break;

          const candidate = await processGitHubCandidate(user.login, githubToken);
          if (candidate) {
            // Add strategy context to candidate
            candidate.search_strategy = strategy.name;
            candidate.search_intent = parsedQuery.searchIntent;
            
            candidates.push(candidate);

            const sourceData = {
              candidate_id: candidate.id,
              platform: 'github',
              platform_id: candidate.github_username,
              url: `https://github.com/${candidate.github_username}`,
              data: { 
                search_query: query,
                search_strategy: strategy.name,
                user_data: user,
                processed_at: new Date().toISOString()
              }
            };

            const saveResult = await saveCandidateWithSource(supabase, candidate, sourceData);
            if (saveResult.success) {
              savedCandidates.push(candidate);
              successCount++;
              console.log(`✅ Successfully saved candidate: ${candidate.name} (${strategy.name})`);
            } else {
              errorCount++;
              console.error(`❌ Failed to save candidate ${candidate.name}: ${saveResult.error}`);
            }
          }
        }
      } catch (error) {
        console.error(`❌ Strategy ${strategy.name} error:`, error.message);
        errorCount++;
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ Enhanced GitHub collection completed in ${processingTime}ms`);
    console.log(`📊 Results: ${successCount} saved, ${errorCount} errors, ${savedCandidates.length} total candidates`);

    return new Response(
      JSON.stringify({ 
        candidates: savedCandidates,
        total: savedCandidates.length,
        source: 'github',
        processing_time_ms: processingTime,
        search_strategies_used: searchStrategies.map(s => s.name),
        success_count: successCount,
        error_count: errorCount,
        candidates_found: candidates.length,
        query_interpretation: {
          search_intent: parsedQuery.searchIntent,
          enhanced_skills: parsedQuery.enhancedSkills,
          confidence: parsedQuery.confidence
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in enhanced GitHub collection:', error);
    return new Response(
      JSON.stringify({ 
        candidates: [], 
        total: 0, 
        source: 'github',
        error: 'Enhanced GitHub collection failed',
        error_details: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
