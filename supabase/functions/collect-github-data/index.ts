
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// UUID generation and validation
function generateValidUUID(): string {
  return crypto.randomUUID();
}

function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Enhanced candidate processor
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
    
    // Generate enhanced candidate profile
    const candidate = {
      id: generateValidUUID(),
      name: user.name || user.login || 'Unknown',
      title: user.bio || `${user.login} - Developer`,
      location: user.location || '',
      avatar_url: user.avatar_url,
      email: user.email,
      github_username: user.login,
      summary: user.bio || `GitHub developer with ${repos.length} repositories and ${user.followers} followers.`,
      skills: Array.from(languages).slice(0, 10),
      experience_years: Math.min(Math.floor((Date.now() - new Date(user.created_at).getTime()) / (365 * 24 * 60 * 60 * 1000)), 20),
      last_active: user.updated_at || new Date().toISOString(),
      overall_score: Math.min(Math.round((user.followers * 2 + totalStars + repos.length) / 10), 100),
      skill_match: Math.min(languages.size * 10, 100),
      experience: Math.min(repos.length * 5, 100),
      reputation: Math.min(user.followers * 2, 100),
      freshness: Math.round(Math.max(0, 100 - (Date.now() - new Date(user.updated_at || user.created_at).getTime()) / (7 * 24 * 60 * 60 * 1000))),
      social_proof: Math.min(totalStars + totalForks, 100),
      risk_flags: [],
      platform: 'github'
    };
    
    console.log(`💾 Enhanced candidate: ${candidate.name} (${candidate.github_username})`);
    return candidate;
    
  } catch (error) {
    console.error(`❌ Error processing GitHub candidate ${username}:`, error.message);
    return null;
  }
}

// Database operations with enhanced error handling
async function saveCandidateWithSource(
  supabase: any,
  candidate: any,
  sourceData: any
): Promise<{ success: boolean; candidateId?: string; error?: string }> {
  try {
    // Ensure valid UUID
    if (!candidate.id || !validateUUID(candidate.id)) {
      candidate.id = generateValidUUID();
    }

    // Clean and validate data
    const cleanedCandidate = {
      id: candidate.id,
      name: candidate.name || 'Unknown',
      title: candidate.title || '',
      location: candidate.location || '',
      avatar_url: candidate.avatar_url || null,
      email: candidate.email || null,
      github_username: candidate.github_username || null,
      summary: candidate.summary || '',
      skills: Array.isArray(candidate.skills) ? candidate.skills : [],
      experience_years: Math.round(Number(candidate.experience_years) || 0),
      last_active: candidate.last_active || new Date().toISOString(),
      overall_score: Math.round(Number(candidate.overall_score) || 0),
      skill_match: Math.round(Number(candidate.skill_match) || 0),
      experience: Math.round(Number(candidate.experience) || 0),
      reputation: Math.round(Number(candidate.reputation) || 0),
      freshness: Math.round(Number(candidate.freshness) || 0),
      social_proof: Math.round(Number(candidate.social_proof) || 0),
      risk_flags: Array.isArray(candidate.risk_flags) ? candidate.risk_flags : []
    };

    // Check for existing candidate
    let existingCandidateId = null;
    if (cleanedCandidate.github_username) {
      const { data: existing } = await supabase
        .from('candidates')
        .select('id')
        .eq('github_username', cleanedCandidate.github_username)
        .maybeSingle();
      
      if (existing) existingCandidateId = existing.id;
    }

    if (existingCandidateId) {
      // Update existing
      const { error: updateError } = await supabase
        .from('candidates')
        .update({
          ...cleanedCandidate,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingCandidateId);

      if (updateError) {
        console.error('Error updating candidate:', updateError);
        return { success: false, error: updateError.message };
      }

      console.log(`✅ Updated candidate: ${cleanedCandidate.name}`);
      return { success: true, candidateId: existingCandidateId };
    } else {
      // Insert new
      const { error: insertError } = await supabase
        .from('candidates')
        .insert(cleanedCandidate);

      if (insertError) {
        console.error('Error inserting candidate:', insertError);
        return { success: false, error: insertError.message };
      }

      // Add source record
      const { error: sourceError } = await supabase
        .from('candidate_sources')
        .insert({
          candidate_id: cleanedCandidate.id,
          platform: sourceData.platform,
          platform_id: sourceData.platform_id,
          url: sourceData.url,
          data: sourceData.data || {}
        });

      if (sourceError) {
        console.error('Warning: Failed to save source:', sourceError);
      }

      console.log(`✅ Saved new candidate: ${cleanedCandidate.name}`);
      return { success: true, candidateId: cleanedCandidate.id };
    }
  } catch (error) {
    console.error('Database operation failed:', error);
    return { success: false, error: error.message };
  }
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
      console.error('GitHub token not configured');
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
    console.log(`Query: "${query}", Location: "${location}", Time Budget: ${time_budget}s`);

    const startTime = Date.now();
    const maxProcessingTime = (time_budget - 2) * 1000; // Reserve 2 seconds

    // Build search query
    let searchQuery = `"${query}" in:bio,name type:user repos:>=5 followers:>=10`;
    if (location) {
      searchQuery += ` location:"${location}"`;
    }

    console.log(`🔍 Searching GitHub users: ${searchQuery}`);

    // Search for users
    const searchResponse = await fetch(
      `https://api.github.com/search/users?q=${encodeURIComponent(searchQuery)}&sort=followers&order=desc&per_page=15`,
      {
        headers: { 'Authorization': `token ${githubToken}` }
      }
    );

    if (!searchResponse.ok) {
      throw new Error(`GitHub search failed: ${searchResponse.status}`);
    }

    const searchResult = await searchResponse.json();
    const users = searchResult.items || [];

    console.log(`📋 Found ${users.length} GitHub users`);

    // Process candidates with time limit
    const candidates = [];
    const savedCandidates = [];
    
    for (const user of users.slice(0, 10)) {
      if (Date.now() - startTime > maxProcessingTime) {
        console.log(`⏱️ Time budget exceeded, stopping at ${candidates.length} candidates`);
        break;
      }

      const candidate = await processGitHubCandidate(user.login, githubToken);
      if (candidate) {
        candidates.push(candidate);

        // Save to database
        const sourceData = {
          platform: 'github',
          platform_id: candidate.github_username,
          url: `https://github.com/${candidate.github_username}`,
          data: { search_query: query }
        };

        const saveResult = await saveCandidateWithSource(supabase, candidate, sourceData);
        if (saveResult.success) {
          savedCandidates.push(candidate);
        }
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ GitHub collection completed in ${processingTime}ms: ${savedCandidates.length} candidates saved`);

    return new Response(
      JSON.stringify({ 
        candidates: savedCandidates,
        total: savedCandidates.length,
        source: 'github',
        processing_time_ms: processingTime,
        search_query: searchQuery
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in GitHub collection:', error);
    return new Response(
      JSON.stringify({ 
        candidates: [], 
        total: 0, 
        source: 'github',
        error: 'GitHub collection failed',
        error_details: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
