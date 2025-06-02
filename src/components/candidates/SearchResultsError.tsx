
import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SearchResultsErrorProps {
  searchError?: {
    type: 'validation' | 'network' | 'service' | 'unknown';
    message: string;
    retryable: boolean;
  };
  retryCount?: number;
  isSearching: boolean;
  onRetry?: () => void;
}

export const SearchResultsError = ({ 
  searchError, 
  retryCount = 0, 
  isSearching, 
  onRetry 
}: SearchResultsErrorProps) => {
  if (!searchError) return null;
  
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Enhanced Search Error</h3>
            <p className="text-sm text-red-700 mt-1">{searchError.message}</p>
            {retryCount > 0 && (
              <p className="text-xs text-red-600 mt-1">
                Retry attempt {retryCount} of 3
              </p>
            )}
          </div>
        </div>
        
        {searchError.retryable && onRetry && (
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            disabled={isSearching}
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isSearching ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        )}
      </div>
    </div>
  );
};
