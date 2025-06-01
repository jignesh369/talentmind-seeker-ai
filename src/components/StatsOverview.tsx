
import React from 'react';
import { Users, TrendingUp, Clock, Shield } from 'lucide-react';

interface StatsOverviewProps {
  totalCandidates: number;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ totalCandidates }) => {
  const stats = [
    {
      label: 'Total Candidates',
      value: totalCandidates.toLocaleString(),
      icon: Users,
      color: 'blue'
    },
    {
      label: 'High-Quality Matches',
      value: Math.floor(totalCandidates * 0.75).toLocaleString(),
      icon: TrendingUp,
      color: 'green'
    },
    {
      label: 'Response Time',
      value: '< 10s',
      icon: Clock,
      color: 'yellow'
    },
    {
      label: 'Verified Profiles',
      value: Math.floor(totalCandidates * 0.85).toLocaleString(),
      icon: Shield,
      color: 'purple'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'from-blue-500 to-blue-600',
      green: 'from-green-500 to-green-600',
      yellow: 'from-yellow-500 to-yellow-600',
      purple: 'from-purple-500 to-purple-600'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        
        return (
          <div key={index} className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-2">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg bg-gradient-to-r ${getColorClasses(stat.color)}`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
