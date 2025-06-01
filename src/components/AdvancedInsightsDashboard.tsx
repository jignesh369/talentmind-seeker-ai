
import React from 'react';
import { TrendingUp, Users, MapPin, Zap, Clock, Award } from 'lucide-react';

interface AdvancedInsightsDashboardProps {
  candidates: any[];
}

export const AdvancedInsightsDashboard: React.FC<AdvancedInsightsDashboardProps> = ({ candidates }) => {
  const totalCandidates = candidates.length;
  const withEmails = candidates.filter(c => c.email).length;
  const highScorers = candidates.filter(c => c.overall_score >= 80).length;
  const recentActivity = candidates.filter(c => {
    const lastActive = new Date(c.last_active || c.created_at);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return lastActive > thirtyDaysAgo;
  }).length;

  // Top skills analysis
  const skillCounts = candidates.reduce((acc, candidate) => {
    (candidate.skills || []).forEach(skill => {
      acc[skill] = (acc[skill] || 0) + 1;
    });
    return acc;
  }, {});
  
  const topSkills = Object.entries(skillCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 6);

  // Location distribution
  const locationCounts = candidates.reduce((acc, candidate) => {
    const location = candidate.location || 'Unknown';
    acc[location] = (acc[location] || 0) + 1;
    return acc;
  }, {});
  
  const topLocations = Object.entries(locationCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 4);

  const insights = [
    {
      title: 'Total Candidates',
      value: totalCandidates,
      icon: Users,
      color: 'bg-blue-500',
      change: '+12% from last week'
    },
    {
      title: 'Contactable',
      value: withEmails,
      icon: Zap,
      color: 'bg-green-500',
      change: `${Math.round((withEmails / totalCandidates) * 100)}% have emails`
    },
    {
      title: 'High Quality',
      value: highScorers,
      icon: Award,
      color: 'bg-purple-500',
      change: `${Math.round((highScorers / totalCandidates) * 100)}% score 80+`
    },
    {
      title: 'Recently Active',
      value: recentActivity,
      icon: Clock,
      color: 'bg-orange-500',
      change: 'Active in last 30 days'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {insights.map((insight, index) => {
          const Icon = insight.icon;
          return (
            <div key={index} className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{insight.title}</p>
                  <p className="text-2xl font-bold text-slate-900">{insight.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{insight.change}</p>
                </div>
                <div className={`p-3 rounded-lg ${insight.color}`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Skills */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-slate-900">Top Skills in Talent Pool</h3>
          </div>
          <div className="space-y-3">
            {topSkills.map(([skill, count], index) => (
              <div key={skill} className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">{skill}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 h-2 bg-slate-200 rounded-full">
                    <div 
                      className="h-2 bg-blue-500 rounded-full"
                      style={{ width: `${(count / totalCandidates) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-slate-600">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Location Distribution */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
          <div className="flex items-center space-x-2 mb-4">
            <MapPin className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-slate-900">Talent Distribution</h3>
          </div>
          <div className="space-y-3">
            {topLocations.map(([location, count], index) => (
              <div key={location} className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">{location}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 h-2 bg-slate-200 rounded-full">
                    <div 
                      className="h-2 bg-green-500 rounded-full"
                      style={{ width: `${(count / totalCandidates) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-slate-600">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
