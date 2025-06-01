
import React, { useState } from 'react';
import { 
  Database, BarChart3, Filter, Settings, LogOut, 
  Users, Star, MapPin, Calendar, Zap, Shield, 
  TrendingUp, Target, Sparkles
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface CleanSidebarProps {
  onDataCollection: () => void;
  onShowInsights: () => void;
  filters: any;
  setFilters: (filters: any) => void;
}

export const CleanSidebar: React.FC<CleanSidebarProps> = ({
  onDataCollection,
  onShowInsights,
  filters,
  setFilters
}) => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [showFilters, setShowFilters] = useState(false);
  const [showDataEnrichment, setShowDataEnrichment] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
  };

  const primaryActions = [
    {
      title: "Talent Discovery",
      icon: Database,
      action: onDataCollection,
      description: "Collect new candidate data",
      color: "text-blue-600 hover:bg-blue-50"
    },
    {
      title: "Data Enrichment",
      icon: Zap,
      action: () => setShowDataEnrichment(!showDataEnrichment),
      description: "Enhance candidate profiles",
      color: "text-purple-600 hover:bg-purple-50"
    },
    {
      title: "AI Analytics",
      icon: TrendingUp,
      action: onShowInsights,
      description: "View insights & trends",
      color: "text-green-600 hover:bg-green-50"
    },
    {
      title: "Smart Filters",
      icon: Target,
      action: () => setShowFilters(!showFilters),
      description: "Refine search results",
      color: "text-orange-600 hover:bg-orange-50"
    }
  ];

  return (
    <Sidebar className="border-r border-slate-200">
      <SidebarHeader className="p-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <Sparkles className="text-white w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-lg">Command Center</h2>
            <p className="text-xs text-slate-500">AI-Powered Tools</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-700 font-semibold">Primary Actions</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {primaryActions.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton onClick={item.action} className={`w-full group ${item.color} transition-all duration-200`}>
                    <item.icon className="w-5 h-5" />
                    <div className="flex flex-col items-start">
                      <span className="font-semibold">{item.title}</span>
                      <span className="text-xs text-slate-500 group-hover:text-current">{item.description}</span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Data Enrichment Panel */}
        {showDataEnrichment && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-purple-700 font-semibold">Data Enrichment</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="p-4 bg-purple-50 rounded-lg space-y-3">
                <button className="w-full p-3 bg-white border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors text-left">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-purple-600" />
                    <span className="font-medium text-slate-700">Email Verification</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Verify candidate emails</p>
                </button>
                
                <button className="w-full p-3 bg-white border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors text-left">
                  <div className="flex items-center space-x-2">
                    <Database className="w-4 h-4 text-purple-600" />
                    <span className="font-medium text-slate-700">Profile Enhancement</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Enrich with AI data</p>
                </button>
                
                <button className="w-full p-3 bg-white border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors text-left">
                  <div className="flex items-center space-x-2">
                    <Star className="w-4 h-4 text-purple-600" />
                    <span className="font-medium text-slate-700">Skill Assessment</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">AI-powered skill scoring</p>
                </button>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Enhanced Filters Section */}
        {showFilters && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-orange-700 font-semibold">Smart Filters</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="p-4 space-y-4">
                {/* Match Score Range */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    <Target className="w-4 h-4 inline mr-1" />
                    Match Score: {filters.minScore}-{filters.maxScore}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={filters.minScore}
                    onChange={(e) => setFilters({ ...filters, minScore: parseInt(e.target.value) })}
                    className="w-full accent-orange-600"
                  />
                </div>

                {/* Experience Level */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    <Star className="w-4 h-4 inline mr-1" />
                    Experience Level
                  </label>
                  <select
                    value={filters.experience || ''}
                    onChange={(e) => setFilters({ ...filters, experience: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="">Any level</option>
                    <option value="junior">Junior (1-3 years)</option>
                    <option value="mid">Mid-level (3-6 years)</option>
                    <option value="senior">Senior (6+ years)</option>
                  </select>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="Enter location..."
                    value={filters.location}
                    onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                {/* Availability */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Availability
                  </label>
                  <select
                    value={filters.availability || ''}
                    onChange={(e) => setFilters({ ...filters, availability: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="">Any time</option>
                    <option value="immediate">Immediate</option>
                    <option value="2weeks">Within 2 weeks</option>
                    <option value="1month">Within 1 month</option>
                  </select>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => setFilters({ minScore: 0, maxScore: 100, location: '', experience: '', availability: '', skills: [] })}
                    className="flex-1 px-3 py-2 text-sm border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Clear All
                  </button>
                  <button
                    className="flex-1 px-3 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user?.email}</p>
              <p className="text-xs text-slate-500">Premium Account</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};
