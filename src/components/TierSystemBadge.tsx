
import React from 'react';
import { Award, Star, Target } from 'lucide-react';

interface TierSystemBadgeProps {
  tier: 'bronze' | 'silver' | 'gold';
  score?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const TierSystemBadge: React.FC<TierSystemBadgeProps> = ({ 
  tier, 
  score, 
  size = 'md' 
}) => {
  const configs = {
    bronze: {
      icon: Target,
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      label: 'Bronze',
      description: 'Quality candidate with solid basics'
    },
    silver: {
      icon: Star,
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      label: 'Silver',
      description: 'High-quality candidate with strong profile'
    },
    gold: {
      icon: Award,
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      label: 'Gold',
      description: 'Premium candidate with exceptional profile'
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const config = configs[tier];
  const Icon = config.icon;

  return (
    <div 
      className={`inline-flex items-center space-x-1 rounded-full border font-medium ${config.color} ${sizeClasses[size]}`}
      title={config.description}
    >
      <Icon className={iconSizes[size]} />
      <span>{config.label}</span>
      {score !== undefined && (
        <span className="ml-1 opacity-75">({score})</span>
      )}
    </div>
  );
};
