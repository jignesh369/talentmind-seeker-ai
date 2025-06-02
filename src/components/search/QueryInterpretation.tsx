
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Info, MapPin, Code, Briefcase } from 'lucide-react';
import { ParsedQuery } from '@/services/queryParsingService';

interface QueryInterpretationProps {
  interpretation: string;
  parsedQuery?: ParsedQuery;
  className?: string;
}

export const QueryInterpretation = ({ 
  interpretation, 
  parsedQuery, 
  className = "" 
}: QueryInterpretationProps) => {
  if (!parsedQuery) {
    return (
      <div className={`flex items-center gap-2 text-sm text-slate-600 ${className}`}>
        <Info className="h-4 w-4" />
        <span>{interpretation}</span>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <Info className="h-4 w-4" />
        <span>{interpretation}</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {parsedQuery.roleTypes && parsedQuery.roleTypes.length > 0 && (
          <div className="flex items-center gap-1">
            <Briefcase className="h-3 w-3 text-blue-600" />
            <span className="text-xs text-slate-600">Roles:</span>
            {parsedQuery.roleTypes.slice(0, 2).map(role => (
              <Badge key={role} variant="outline" className="text-xs">
                {role}
              </Badge>
            ))}
          </div>
        )}

        {parsedQuery.enhancedSkills && parsedQuery.enhancedSkills.length > 0 && (
          <div className="flex items-center gap-1">
            <Code className="h-3 w-3 text-green-600" />
            <span className="text-xs text-slate-600">Skills:</span>
            {parsedQuery.enhancedSkills.slice(0, 3).map(skill => (
              <Badge key={skill} variant="outline" className="text-xs">
                {skill}
              </Badge>
            ))}
          </div>
        )}

        {parsedQuery.normalizedLocation && parsedQuery.normalizedLocation.length > 0 && (
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3 text-purple-600" />
            <span className="text-xs text-slate-600">Location:</span>
            {parsedQuery.normalizedLocation.slice(0, 2).map(location => (
              <Badge key={location} variant="outline" className="text-xs">
                {location}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
