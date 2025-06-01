
import React from 'react';
import { Filter, Users, TrendingUp, Zap, LogOut, Database } from 'lucide-react';
import { User } from '@supabase/supabase-js';

interface HeaderProps {
  user: User | null;
  onSignOut: () => void;
  onToggleFilters: () => void;
  onOpenDataCollection: () => void;
}

export const Header = ({ user, onSignOut, onToggleFilters, onOpenDataCollection }: HeaderProps) => {
  return (
    <header className="bg-white/90 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              TalentMind
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={onOpenDataCollection}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Database className="w-4 h-4" />
              <span>Collect Data</span>
            </button>
            <button
              onClick={onToggleFilters}
              className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-600">Welcome, {user?.email}</span>
              <button
                onClick={onSignOut}
                className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
