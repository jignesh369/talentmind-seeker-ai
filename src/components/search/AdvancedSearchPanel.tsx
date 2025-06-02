
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Settings, Code, Bookmark, History, Zap } from 'lucide-react';
import { SavedSearchesPanel } from './SavedSearchesPanel';
import { SearchHistoryPanel } from './SearchHistoryPanel';
import { BooleanSearchBuilder } from './BooleanSearchBuilder';

interface AdvancedSearchPanelProps {
  onSearch: (query: string, filters?: any) => void;
  currentQuery?: string;
  currentFilters?: any;
  isOpen: boolean;
  onClose: () => void;
}

export const AdvancedSearchPanel = ({ 
  onSearch, 
  currentQuery, 
  currentFilters, 
  isOpen, 
  onClose 
}: AdvancedSearchPanelProps) => {
  const [activeTab, setActiveTab] = useState<'saved' | 'history' | 'boolean'>('saved');
  const [showBooleanBuilder, setShowBooleanBuilder] = useState(false);
  const [searchSuggestions] = useState([
    'React Developer in San Francisco',
    'Senior Python Engineer',
    'Full Stack JavaScript Developer',
    'DevOps Engineer with AWS',
    'Data Scientist with Machine Learning',
    'Mobile Developer React Native',
    'Backend Developer Node.js',
    'Frontend Developer Vue.js'
  ]);

  const handleLoadSearch = (query: string, filters?: any) => {
    onSearch(query, filters);
  };

  const handleBooleanSearch = (query: string) => {
    onSearch(query);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center z-40">
        <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto md:m-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Advanced Search
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={onClose}>
                ×
              </Button>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex gap-2 mt-4">
              <Button
                variant={activeTab === 'saved' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('saved')}
                className="flex items-center gap-2"
              >
                <Bookmark className="h-4 w-4" />
                Saved Searches
              </Button>
              <Button
                variant={activeTab === 'history' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('history')}
                className="flex items-center gap-2"
              >
                <History className="h-4 w-4" />
                History
              </Button>
              <Button
                variant={activeTab === 'boolean' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('boolean')}
                className="flex items-center gap-2"
              >
                <Code className="h-4 w-4" />
                Boolean Builder
              </Button>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Panel */}
              <div className="lg:col-span-2">
                {activeTab === 'saved' && (
                  <SavedSearchesPanel
                    onLoadSearch={handleLoadSearch}
                    currentQuery={currentQuery}
                    currentFilters={currentFilters}
                  />
                )}
                
                {activeTab === 'history' && (
                  <SearchHistoryPanel
                    onLoadSearch={handleLoadSearch}
                  />
                )}
                
                {activeTab === 'boolean' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Code className="h-5 w-5" />
                        Boolean Search
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-slate-600">
                        Build complex search queries using boolean operators (AND, OR, NOT) 
                        to find exactly what you're looking for.
                      </p>
                      
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Examples:</h4>
                        <div className="space-y-1 text-sm">
                          <Badge variant="outline" className="font-mono">
                            React AND (TypeScript OR JavaScript) NOT jQuery
                          </Badge>
                          <Badge variant="outline" className="font-mono">
                            "Senior Developer" AND Python AND location:SF
                          </Badge>
                          <Badge variant="outline" className="font-mono">
                            DevOps OR "Site Reliability" AND AWS
                          </Badge>
                        </div>
                      </div>
                      
                      <Button 
                        onClick={() => setShowBooleanBuilder(true)}
                        className="w-full"
                      >
                        <Code className="h-4 w-4 mr-2" />
                        Open Boolean Builder
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
              
              {/* Sidebar */}
              <div className="space-y-4">
                {/* Quick Suggestions */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Quick Suggestions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {searchSuggestions.slice(0, 6).map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => handleLoadSearch(suggestion)}
                          className="w-full text-left p-2 text-sm rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                
                {/* Search Tips */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Search Tips</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-slate-600 space-y-2">
                    <p>• Use quotes for exact phrases: "React Developer"</p>
                    <p>• Combine skills: Python AND Django</p>
                    <p>• Exclude terms: JavaScript NOT jQuery</p>
                    <p>• Use location filters for better targeting</p>
                    <p>• Save frequent searches for quick access</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Boolean Search Builder Modal */}
      <BooleanSearchBuilder
        isOpen={showBooleanBuilder}
        onClose={() => setShowBooleanBuilder(false)}
        onSearchGenerated={handleBooleanSearch}
      />
    </>
  );
};
