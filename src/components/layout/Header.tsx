
import React from 'react';
import { Button } from '@/components/ui/button';
import { Filter, LogOut } from 'lucide-react';

interface HeaderProps {
  user: any;
  onSignOut: () => void;
  onToggleFilters: () => void;
}

export const Header = ({ user, onSignOut, onToggleFilters }: HeaderProps) => {
  return (
    <header className="bg-white shadow-sm border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">AI Talent Scout</h1>
            <p className="text-sm text-slate-600">Find and collect top developers</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleFilters}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
            
            {user && (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-slate-600">
                  {user.email}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSignOut}
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
