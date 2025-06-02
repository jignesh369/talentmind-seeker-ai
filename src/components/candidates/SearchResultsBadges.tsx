
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Brain, Target, Zap, Layers, Lightbulb } from 'lucide-react';

interface SearchResultsBadgesProps {
  searchMetadata?: any;
}

export const SearchResultsBadges = ({ searchMetadata }: SearchResultsBadgesProps) => {
  const getAdvancedSearchBadges = () => {
    if (!searchMetadata?.enhanced_features) return null;
    
    const badges = [];
    const features = searchMetadata.enhanced_features;
    
    if (features.contextual_search) {
      badges.push(
        <Badge key="contextual" variant="default" className="ml-2 bg-purple-600">
          <Brain className="w-3 h-3 mr-1" />
          Contextual AI
        </Badge>
      );
    }
    
    if (features.technology_stack) {
      badges.push(
        <Badge key="stack" variant="default" className="ml-2 bg-cyan-500">
          <Layers className="w-3 h-3 mr-1" />
          Stack Match
        </Badge>
      );
    }
    
    if (features.intent_detection) {
      badges.push(
        <Badge key="intent" variant="default" className="ml-2 bg-emerald-500">
          <Lightbulb className="w-3 h-3 mr-1" />
          Intent Detection
        </Badge>
      );
    }
    
    if (features.semantic_search) {
      badges.push(
        <Badge key="semantic" variant="default" className="ml-2 bg-purple-500">
          <Brain className="w-3 h-3 mr-1" />
          Semantic
        </Badge>
      );
    }
    
    if (features.role_matching) {
      badges.push(
        <Badge key="role" variant="default" className="ml-2 bg-blue-500">
          <Target className="w-3 h-3 mr-1" />
          Role Match
        </Badge>
      );
    }
    
    if (features.confidence_scoring && features.confidence_scoring > 70) {
      badges.push(
        <Badge key="confidence" variant="default" className="ml-2 bg-green-600">
          <Zap className="w-3 h-3 mr-1" />
          High Confidence
        </Badge>
      );
    }
    
    return badges;
  };

  const getAdvancedSearchQualityBadge = () => {
    if (!searchMetadata) return null;
    
    const { search_strategies, fallback_used, service_status, enhanced_features } = searchMetadata;
    
    // Service status indicator
    if (service_status === 'degraded') {
      return <Badge variant="destructive" className="ml-2">Service Degraded</Badge>;
    }
    
    if (fallback_used) {
      return <Badge variant="secondary" className="ml-2">Broad Match</Badge>;
    }
    
    // Enhanced quality indicators
    if (enhanced_features?.confidence_scoring) {
      const confidence = enhanced_features.confidence_scoring;
      if (confidence >= 80) {
        return <Badge variant="default" className="ml-2 bg-green-600">AI Precision+</Badge>;
      } else if (confidence >= 60) {
        return <Badge variant="default" className="ml-2 bg-blue-600">AI Enhanced</Badge>;
      } else if (confidence >= 40) {
        return <Badge variant="default" className="ml-2 bg-indigo-500">AI Assisted</Badge>;
      }
    }
    
    if (search_strategies) {
      const activeStrategies = Object.keys(search_strategies).filter(
        key => search_strategies[key].count > 0
      );
      
      if (activeStrategies.length >= 5) {
        return <Badge variant="default" className="ml-2 bg-green-500">Maximum Precision</Badge>;
      } else if (activeStrategies.length >= 4) {
        return <Badge variant="default" className="ml-2 bg-blue-500">High Precision</Badge>;
      } else if (activeStrategies.length >= 3) {
        return <Badge variant="default" className="ml-2 bg-indigo-500">Enhanced Match</Badge>;
      }
    }
    
    return <Badge variant="outline" className="ml-2">Standard Search</Badge>;
  };

  return (
    <>
      {getAdvancedSearchQualityBadge()}
      {getAdvancedSearchBadges()}
    </>
  );
};
