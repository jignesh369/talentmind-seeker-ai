
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Code, HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SearchTerm {
  id: string;
  value: string;
  operator: 'AND' | 'OR' | 'NOT';
  field?: 'skills' | 'title' | 'location' | 'any';
}

interface BooleanSearchBuilderProps {
  onSearchGenerated: (query: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const BooleanSearchBuilder = ({ onSearchGenerated, isOpen, onClose }: BooleanSearchBuilderProps) => {
  const [searchTerms, setSearchTerms] = useState<SearchTerm[]>([
    { id: crypto.randomUUID(), value: '', operator: 'AND', field: 'any' }
  ]);
  const { toast } = useToast();

  const addSearchTerm = () => {
    setSearchTerms(prev => [
      ...prev,
      { id: crypto.randomUUID(), value: '', operator: 'AND', field: 'any' }
    ]);
  };

  const removeSearchTerm = (id: string) => {
    if (searchTerms.length > 1) {
      setSearchTerms(prev => prev.filter(term => term.id !== id));
    }
  };

  const updateSearchTerm = (id: string, updates: Partial<SearchTerm>) => {
    setSearchTerms(prev => 
      prev.map(term => 
        term.id === id ? { ...term, ...updates } : term
      )
    );
  };

  const generateBooleanQuery = (): string => {
    const validTerms = searchTerms.filter(term => term.value.trim() !== '');
    
    if (validTerms.length === 0) return '';

    return validTerms.map((term, index) => {
      let termValue = term.value.trim();
      
      // Add field prefix if specified
      if (term.field && term.field !== 'any') {
        termValue = `${term.field}:${termValue}`;
      }
      
      // Wrap in quotes if contains spaces
      if (termValue.includes(' ') && !termValue.startsWith('"')) {
        termValue = `"${termValue}"`;
      }

      // Add operator prefix (except for first term)
      if (index === 0) {
        return term.operator === 'NOT' ? `NOT ${termValue}` : termValue;
      } else {
        return `${term.operator} ${termValue}`;
      }
    }).join(' ');
  };

  const handleGenerateSearch = () => {
    const query = generateBooleanQuery();
    
    if (!query.trim()) {
      toast({
        title: "Empty search",
        description: "Please add at least one search term",
        variant: "destructive",
      });
      return;
    }

    onSearchGenerated(query);
    onClose();
    
    toast({
      title: "Boolean search generated",
      description: "Advanced search query has been applied",
    });
  };

  const presetQueries = [
    {
      name: "Senior React Developer",
      terms: [
        { operator: 'AND', value: 'React', field: 'skills' },
        { operator: 'AND', value: 'Senior', field: 'title' },
        { operator: 'OR', value: 'TypeScript', field: 'skills' }
      ]
    },
    {
      name: "Python Data Scientist",
      terms: [
        { operator: 'AND', value: 'Python', field: 'skills' },
        { operator: 'AND', value: 'Data Scientist', field: 'title' },
        { operator: 'NOT', value: 'Junior', field: 'title' }
      ]
    },
    {
      name: "Full Stack Engineer",
      terms: [
        { operator: 'AND', value: 'Full Stack', field: 'title' },
        { operator: 'AND', value: 'JavaScript', field: 'skills' },
        { operator: 'OR', value: 'Node.js', field: 'skills' }
      ]
    }
  ];

  const loadPreset = (preset: typeof presetQueries[0]) => {
    setSearchTerms(preset.terms.map(term => ({
      id: crypto.randomUUID(),
      value: term.value,
      operator: term.operator as 'AND' | 'OR' | 'NOT',
      field: term.field as 'skills' | 'title' | 'location' | 'any'
    })));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Boolean Search Builder
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Help Text */}
          <div className="bg-blue-50 p-3 rounded-lg flex items-start gap-2">
            <HelpCircle className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Boolean Search Help</p>
              <p>Use AND to require terms, OR for alternatives, and NOT to exclude terms.</p>
            </div>
          </div>

          {/* Preset Queries */}
          <div>
            <h4 className="text-sm font-medium mb-2">Quick Presets</h4>
            <div className="flex flex-wrap gap-2">
              {presetQueries.map((preset) => (
                <Button
                  key={preset.name}
                  variant="outline"
                  size="sm"
                  onClick={() => loadPreset(preset)}
                >
                  {preset.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Search Terms Builder */}
          <div>
            <h4 className="text-sm font-medium mb-3">Build Your Search</h4>
            <div className="space-y-3">
              {searchTerms.map((term, index) => (
                <div key={term.id} className="flex items-center gap-2">
                  {index > 0 && (
                    <Select
                      value={term.operator}
                      onValueChange={(value) => 
                        updateSearchTerm(term.id, { operator: value as 'AND' | 'OR' | 'NOT' })
                      }
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AND">AND</SelectItem>
                        <SelectItem value="OR">OR</SelectItem>
                        <SelectItem value="NOT">NOT</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  
                  <Select
                    value={term.field}
                    onValueChange={(value) => 
                      updateSearchTerm(term.id, { field: value as 'skills' | 'title' | 'location' | 'any' })
                    }
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="skills">Skills</SelectItem>
                      <SelectItem value="title">Title</SelectItem>
                      <SelectItem value="location">Location</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Input
                    placeholder="Enter search term..."
                    value={term.value}
                    onChange={(e) => updateSearchTerm(term.id, { value: e.target.value })}
                    className="flex-1"
                  />
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSearchTerm(term.id)}
                    disabled={searchTerms.length === 1}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={addSearchTerm}
              className="mt-3"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Term
            </Button>
          </div>

          {/* Query Preview */}
          <div>
            <h4 className="text-sm font-medium mb-2">Generated Query</h4>
            <div className="bg-slate-100 p-3 rounded-lg font-mono text-sm">
              {generateBooleanQuery() || 'Enter search terms above to see the generated query'}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleGenerateSearch}>
              Apply Search
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
