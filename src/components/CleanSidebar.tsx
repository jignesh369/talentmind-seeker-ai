
import React, { useState } from 'react';
import { 
  Database, BarChart3, Filter, Settings, LogOut, 
  Users, Star, MapPin, Calendar 
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

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
  };

  const mainActions = [
    {
      title: "Collect Data",
      icon: Database,
      action: onDataCollection,
      description: "Gather new candidate data"
    },
    {
      title: "Analytics",
      icon: BarChart3,
      action: onShowInsights,
      description: "View insights & trends"
    },
    {
      title: "Filters",
      icon: Filter,
      action: () => setShowFilters(!showFilters),
      description: "Refine search results"
    }
  ];

  return (
    <Sidebar className="border-r border-slate-200">
      <SidebarHeader className="p-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">T</span>
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Menu</h2>
            <p className="text-xs text-slate-500">Tools & Actions</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Actions</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainActions.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton onClick={item.action} className="w-full">
                    <item.icon className="w-4 h-4" />
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{item.title}</span>
                      <span className="text-xs text-slate-500">{item.description}</span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Filters Section */}
        {showFilters && (
          <SidebarGroup>
            <SidebarGroupLabel>Filters</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="p-3 space-y-4">
                {/* Score Range */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Star className="w-4 h-4 inline mr-1" />
                    Score Range: {filters.minScore}-{filters.maxScore}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={filters.minScore}
                    onChange={(e) => setFilters({ ...filters, minScore: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="Enter location..."
                    value={filters.location}
                    onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Last Active */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Last Active
                  </label>
                  <select
                    value={filters.lastActive}
                    onChange={(e) => setFilters({ ...filters, lastActive: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Any time</option>
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                  </select>
                </div>

                <button
                  onClick={() => setFilters({ minScore: 0, maxScore: 100, location: '', lastActive: '', skills: [] })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};
