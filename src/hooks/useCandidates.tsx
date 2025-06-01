
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface CandidateSource {
  id: string;
  platform: string;
  platform_id: string;
  url: string;
  data: any;
}

export interface Candidate {
  id: string;
  name: string;
  title?: string;
  location?: string;
  avatar_url?: string;
  email?: string;
  github_username?: string;
  stackoverflow_id?: string;
  linkedin_url?: string;
  reddit_username?: string;
  summary?: string;
  skills: string[];
  experience_years?: number;
  last_active?: string;
  overall_score: number;
  skill_match: number;
  experience: number;
  reputation: number;
  freshness: number;
  social_proof: number;
  risk_flags: string[];
  created_at: string;
  updated_at: string;
  candidate_sources?: CandidateSource[];
}

export const useCandidates = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchCandidates = async (limit: number = 100) => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Enhanced query with better performance
      const { data, error } = await supabase
        .from('candidates')
        .select(`
          *,
          candidate_sources (
            id,
            platform,
            platform_id,
            url,
            data
          )
        `)
        .order('overall_score', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching candidates:', error);
        throw error;
      }
      
      // Validate and clean data
      const validCandidates = (data || []).map(candidate => ({
        ...candidate,
        skills: Array.isArray(candidate.skills) ? candidate.skills : [],
        risk_flags: Array.isArray(candidate.risk_flags) ? candidate.risk_flags : [],
        overall_score: typeof candidate.overall_score === 'number' ? candidate.overall_score : 0,
        skill_match: typeof candidate.skill_match === 'number' ? candidate.skill_match : 0,
        experience: typeof candidate.experience === 'number' ? candidate.experience : 0,
        reputation: typeof candidate.reputation === 'number' ? candidate.reputation : 0,
        freshness: typeof candidate.freshness === 'number' ? candidate.freshness : 0,
        social_proof: typeof candidate.social_proof === 'number' ? candidate.social_proof : 0
      }));
      
      setCandidates(validCandidates);
      console.log(`✅ Loaded ${validCandidates.length} candidates`);
      
    } catch (err: any) {
      console.error('Fetch candidates error:', err);
      setError(err.message || 'Failed to load candidates');
      setCandidates([]); // Reset on error
    } finally {
      setLoading(false);
    }
  };

  // Search candidates with better error handling
  const searchCandidates = async (query: string) => {
    if (!user || !query.trim()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const searchQuery = query.trim().toLowerCase();
      
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .or(`name.ilike.%${searchQuery}%,title.ilike.%${searchQuery}%,summary.ilike.%${searchQuery}%,location.ilike.%${searchQuery}%`)
        .order('overall_score', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      setCandidates(data || []);
      
    } catch (err: any) {
      console.error('Search candidates error:', err);
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, [user]);

  return {
    candidates,
    loading,
    error,
    refetch: () => fetchCandidates(),
    searchCandidates,
    fetchMore: (limit: number) => fetchCandidates(limit)
  };
};
