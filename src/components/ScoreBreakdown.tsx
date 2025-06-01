
import React from 'react';
import { TrendingUp, Award, Clock, Users, AlertTriangle } from 'lucide-react';

interface Candidate {
  skillMatch: number;
  experience: number;
  reputation: number;
  freshness: number;
  socialProof: number;
  riskFlags: string[];
}

interface ScoreBreakdownProps {
  candidate: Candidate;
}

export const ScoreBreakdown: React.FC<ScoreBreakdownProps> = ({ candidate }) => {
  const scoreComponents = [
    {
      label: 'Skill Match',
      value: candidate.skillMatch,
      weight: 40,
      icon: TrendingUp,
      color: 'blue'
    },
    {
      label: 'Experience',
      value: candidate.experience,
      weight: 20,
      icon: Award,
      color: 'green'
    },
    {
      label: 'Reputation',
      value: candidate.reputation,
      weight: 15,
      icon: Users,
      color: 'purple'
    },
    {
      label: 'Freshness',
      value: candidate.freshness,
      weight: 10,
      icon: Clock,
      color: 'yellow'
    },
    {
      label: 'Social Proof',
      value: candidate.socialProof,
      weight: 5,
      icon: Users,
      color: 'indigo'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-800',
      green: 'bg-green-100 text-green-800',
      purple: 'bg-purple-100 text-purple-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      indigo: 'bg-indigo-100 text-indigo-800'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const totalWeightedScore = scoreComponents.reduce((total, component) => {
    return total + (component.value * component.weight / 100);
  }, 0);

  const riskPenalty = candidate.riskFlags.length * 10;
  const finalScore = Math.max(0, totalWeightedScore - riskPenalty);

  return (
    <div className="bg-slate-50 rounded-lg p-4 space-y-4">
      {/* Score Components */}
      <div className="space-y-3">
        {scoreComponents.map((component, index) => {
          const Icon = component.icon;
          const weightedValue = (component.value * component.weight / 100);
          
          return (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${getColorClasses(component.color)}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-900">
                    {component.label}
                  </div>
                  <div className="text-xs text-slate-600">
                    Weight: {component.weight}%
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-slate-900">
                  {component.value}/100
                </div>
                <div className="text-xs text-slate-600">
                  = {weightedValue.toFixed(1)} pts
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Risk Flags */}
      {candidate.riskFlags.length > 0 && (
        <div className="border-t border-slate-200 pt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-red-100 text-red-800">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-900">Risk Penalties</div>
                <div className="text-xs text-slate-600">
                  {candidate.riskFlags.join(', ')}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-red-600">
                -{riskPenalty} pts
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Final Calculation */}
      <div className="border-t border-slate-300 pt-3">
        <div className="flex items-center justify-between text-base font-semibold">
          <span className="text-slate-900">Final Score</span>
          <span className="text-slate-900">{finalScore.toFixed(0)}/100</span>
        </div>
      </div>
    </div>
  );
};
