
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Candidate {
  id: string;
  name: string;
  title?: string;
  location?: string;
  avatar_url?: string;
  email?: string;
  github_username?: string;
  stackoverflow_id?: string;
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
}

export const useCandidates = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchCandidates = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .order('overall_score', { ascending: false });

      if (error) throw error;
      setCandidates(data || []);
    } catch (err: any) {
      setError(err.message);
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
    refetch: fetchCandidates
  };
};
