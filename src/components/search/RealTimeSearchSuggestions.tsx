
import React, { useState, useEffect } from 'react';
import { Search, Zap, Users, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SearchSuggestion {
  type: 'skill' | 'role' | 'location' | 'company';
  value: string;
  count: number;
  icon: React.ReactNode;
}

interface RealTimeSearchSuggestionsProps {
  query: string;
  onSelectSuggestion: (suggestion: string) => void;
  isVisible: boolean;
}

export const RealTimeSearchSuggestions = ({
  query,
  onSelectSuggestion,
  isVisible
}: RealTimeSearchSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        // Get skill suggestions from existing candidates
        const { data: skillData } = await supabase
          .from('candidates')
          .select('skills')
          .not('skills', 'is', null);

        // Get role suggestions
        const { data: roleData } = await supabase
          .from('candidates')
          .select('title')
          .not('title', 'is', null)
          .ilike('title', `%${query}%`)
          .limit(5);

        // Get location suggestions
        const { data: locationData } = await supabase
          .from('candidates')
          .select('location')
          .not('location', 'is', null)
          .ilike('location', `%${query}%`)
          .limit(3);

        const allSuggestions: SearchSuggestion[] = [];

        // Process skills
        const skillCounts = new Map<string, number>();
        skillData?.forEach(candidate => {
          candidate.skills?.forEach((skill: string) => {
            if (skill.toLowerCase().includes(query.toLowerCase())) {
              skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1);
            }
          });
        });

        Array.from(skillCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .forEach(([skill, count]) => {
            allSuggestions.push({
              type: 'skill',
              value: skill,
              count,
              icon: <Zap className="h-4 w-4 text-blue-500" />
            });
          });

        // Process roles
        roleData?.forEach(candidate => {
          if (candidate.title) {
            allSuggestions.push({
              type: 'role',
              value: candidate.title,
              count: 1,
              icon: <Users className="h-4 w-4 text-green-500" />
            });
          }
        });

        // Process locations
        locationData?.forEach(candidate => {
          if (candidate.location) {
            allSuggestions.push({
              type: 'location',
              value: candidate.location,
              count: 1,
              icon: <MapPin className="h-4 w-4 text-orange-500" />
            });
          }
        });

        setSuggestions(allSuggestions.slice(0, 8));
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  if (!isVisible || suggestions.length === 0) return null;

  return (
    <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-50 mt-1 max-h-80 overflow-y-auto">
      {loading && (
        <div className="p-3 text-center text-slate-500">
          <Search className="h-4 w-4 animate-spin inline-block mr-2" />
          Finding suggestions...
        </div>
      )}
      
      {suggestions.map((suggestion, index) => (
        <button
          key={`${suggestion.type}-${suggestion.value}-${index}`}
          onClick={() => onSelectSuggestion(suggestion.value)}
          className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {suggestion.icon}
              <div>
                <span className="text-sm font-medium">{suggestion.value}</span>
                <div className="text-xs text-slate-500 capitalize">
                  {suggestion.type} suggestion
                </div>
              </div>
            </div>
            {suggestion.count > 1 && (
              <span className="text-xs bg-slate-100 px-2 py-1 rounded">
                {suggestion.count} candidates
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
};
