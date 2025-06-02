import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { History, Search, Clock, Users, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: Date;
  resultsCount: number;
  filters?: any;
  executionTime?: number;
}

interface SearchHistoryPanelProps {
  onLoadSearch: (query: string, filters?: any) => void;
  onAddToHistory: (item: Omit<SearchHistoryItem, 'id' | 'timestamp'>) => void;
}

export const SearchHistoryPanel = ({ onLoadSearch, onAddToHistory }: SearchHistoryPanelProps) => {
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [showAll, setShowAll] = useState(false);
  const { toast } = useToast();

  // Add search to history
  const addToHistory = (item: Omit<SearchHistoryItem, 'id' | 'timestamp'>) => {
    const historyItem: SearchHistoryItem = {
      ...item,
      id: crypto.randomUUID(),
      timestamp: new Date()
    };

    setSearchHistory(prev => {
      // Remove duplicate queries and keep only the latest
      const filtered = prev.filter(h => h.query !== item.query);
      return [historyItem, ...filtered].slice(0, 50); // Keep max 50 items
    });
  };

  // Expose addToHistory function to parent
  useEffect(() => {
    onAddToHistory(addToHistory);
  }, [onAddToHistory]);

  const handleLoadSearch = (item: SearchHistoryItem) => {
    onLoadSearch(item.query, item.filters);
    toast({
      title: "Search reloaded",
      description: `Searching for: "${item.query}"`,
    });
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const getPopularQueries = () => {
    const queryCount = searchHistory.reduce((acc, item) => {
      acc[item.query] = (acc[item.query] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(queryCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([query, count]) => ({ query, count }));
  };

  const displayedHistory = showAll ? searchHistory : searchHistory.slice(0, 10);
  const popularQueries = getPopularQueries();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="h-5 w-5" />
          Search History
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Popular Queries */}
        {popularQueries.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Popular Searches
            </h4>
            <div className="space-y-1">
              {popularQueries.map(({ query, count }) => (
                <button
                  key={query}
                  onClick={() => handleLoadSearch({ 
                    id: '', 
                    query, 
                    timestamp: new Date(), 
                    resultsCount: 0 
                  })}
                  className="w-full text-left p-2 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm truncate">{query}</span>
                    <Badge variant="secondary" className="text-xs">
                      {count}x
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent Searches */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Recent Searches
          </h4>
          
          {searchHistory.length === 0 ? (
            <div className="text-center py-6 text-slate-500">
              <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No search history yet</p>
              <p className="text-xs">Your recent searches will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayedHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-3 border rounded-lg hover:bg-slate-50 cursor-pointer group"
                  onClick={() => handleLoadSearch(item)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.query}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(item.timestamp)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {item.resultsCount} results
                        </span>
                        {item.executionTime && (
                          <span>{item.executionTime}ms</span>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLoadSearch(item);
                      }}
                    >
                      <Search className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  {item.filters && Object.keys(item.filters).length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {Object.entries(item.filters).map(([key, value]) => (
                        <Badge key={key} variant="outline" className="text-xs">
                          {key}: {String(value)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {searchHistory.length > 10 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAll(!showAll)}
                  className="w-full"
                >
                  {showAll ? 'Show Less' : `Show ${searchHistory.length - 10} More`}
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
