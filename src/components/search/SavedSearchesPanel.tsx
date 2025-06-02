
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bookmark, Search, Trash2, Clock, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters?: any;
  createdAt: Date;
  lastUsed?: Date;
  useCount: number;
  isFavorite: boolean;
}

interface SavedSearchesPanelProps {
  onLoadSearch: (query: string, filters?: any) => void;
  currentQuery?: string;
  currentFilters?: any;
}

export const SavedSearchesPanel = ({ 
  onLoadSearch, 
  currentQuery, 
  currentFilters 
}: SavedSearchesPanelProps) => {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [searchName, setSearchName] = useState('');
  const { toast } = useToast();

  const handleSaveSearch = () => {
    if (!currentQuery?.trim()) {
      toast({
        title: "Cannot save search",
        description: "Please enter a search query first",
        variant: "destructive",
      });
      return;
    }

    if (!searchName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your saved search",
        variant: "destructive",
      });
      return;
    }

    const newSavedSearch: SavedSearch = {
      id: crypto.randomUUID(),
      name: searchName.trim(),
      query: currentQuery,
      filters: currentFilters,
      createdAt: new Date(),
      useCount: 0,
      isFavorite: false
    };

    setSavedSearches(prev => [newSavedSearch, ...prev]);
    setSearchName('');
    setShowSaveDialog(false);

    toast({
      title: "Search saved",
      description: `"${searchName}" has been saved to your searches`,
    });
  };

  const handleLoadSearch = (savedSearch: SavedSearch) => {
    // Update use count and last used
    setSavedSearches(prev => 
      prev.map(s => 
        s.id === savedSearch.id 
          ? { ...s, useCount: s.useCount + 1, lastUsed: new Date() }
          : s
      )
    );

    onLoadSearch(savedSearch.query, savedSearch.filters);

    toast({
      title: "Search loaded",
      description: `Loaded "${savedSearch.name}"`,
    });
  };

  const handleDeleteSearch = (id: string) => {
    setSavedSearches(prev => prev.filter(s => s.id !== id));
    toast({
      title: "Search deleted",
      description: "Saved search has been removed",
    });
  };

  const toggleFavorite = (id: string) => {
    setSavedSearches(prev => 
      prev.map(s => 
        s.id === id ? { ...s, isFavorite: !s.isFavorite } : s
      )
    );
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bookmark className="h-5 w-5" />
            Saved Searches
          </CardTitle>
          <Button
            onClick={() => setShowSaveDialog(true)}
            size="sm"
            variant="outline"
            disabled={!currentQuery?.trim()}
          >
            Save Current
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Save Dialog */}
        {showSaveDialog && (
          <div className="p-4 border rounded-lg bg-slate-50">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Search Name</label>
                <Input
                  placeholder="e.g., Senior React Developers in SF"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSaveSearch()}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveSearch} size="sm">
                  Save Search
                </Button>
                <Button 
                  onClick={() => setShowSaveDialog(false)} 
                  variant="outline" 
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Saved Searches List */}
        {savedSearches.length === 0 ? (
          <div className="text-center py-6 text-slate-500">
            <Bookmark className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No saved searches yet</p>
            <p className="text-xs">Save your frequent searches for quick access</p>
          </div>
        ) : (
          <div className="space-y-2">
            {savedSearches
              .sort((a, b) => {
                if (a.isFavorite !== b.isFavorite) {
                  return a.isFavorite ? -1 : 1;
                }
                return b.createdAt.getTime() - a.createdAt.getTime();
              })
              .map((savedSearch) => (
                <div
                  key={savedSearch.id}
                  className="p-3 border rounded-lg hover:bg-slate-50 cursor-pointer group"
                  onClick={() => handleLoadSearch(savedSearch)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate">
                          {savedSearch.name}
                        </h4>
                        {savedSearch.isFavorite && (
                          <Star className="h-3 w-3 text-yellow-500 fill-current" />
                        )}
                      </div>
                      <p className="text-xs text-slate-600 truncate mb-2">
                        {savedSearch.query}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(savedSearch.createdAt)}
                        </span>
                        <span>{savedSearch.useCount} uses</span>
                        {savedSearch.lastUsed && (
                          <span>Last: {formatDate(savedSearch.lastUsed)}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(savedSearch.id);
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <Star className={`h-3 w-3 ${savedSearch.isFavorite ? 'text-yellow-500 fill-current' : 'text-slate-400'}`} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSearch(savedSearch.id);
                        }}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
