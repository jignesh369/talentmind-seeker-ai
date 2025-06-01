
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Merge, CheckCircle, TrendingUp } from 'lucide-react';

interface DeduplicationStatsProps {
  originalCount: number;
  deduplicatedCount: number;
  duplicatesRemoved: number;
  mergeDecisions: number;
  deduplicationRate: number;
}

export const DeduplicationStatsCard: React.FC<DeduplicationStatsProps> = ({
  originalCount,
  deduplicatedCount,
  duplicatesRemoved,
  mergeDecisions,
  deduplicationRate
}) => {
  const getQualityBadge = (rate: number) => {
    if (rate >= 15) return <Badge variant="default" className="bg-green-500">Excellent</Badge>;
    if (rate >= 10) return <Badge variant="default" className="bg-blue-500">Good</Badge>;
    if (rate >= 5) return <Badge variant="default" className="bg-yellow-500">Fair</Badge>;
    return <Badge variant="destructive">Poor</Badge>;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Merge className="w-5 h-5 text-blue-500" />
          Enhanced Deduplication Results
          {getQualityBadge(deduplicationRate)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-500" />
            <div>
              <div className="text-sm text-gray-600">Original</div>
              <div className="font-semibold">{originalCount}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <div>
              <div className="text-sm text-gray-600">Final</div>
              <div className="font-semibold text-green-600">{deduplicatedCount}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Merge className="w-4 h-4 text-blue-500" />
            <div>
              <div className="text-sm text-gray-600">Merged</div>
              <div className="font-semibold text-blue-600">{duplicatesRemoved}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-500" />
            <div>
              <div className="text-sm text-gray-600">Efficiency</div>
              <div className="font-semibold text-purple-600">{deduplicationRate.toFixed(1)}%</div>
            </div>
          </div>
        </div>
        
        {mergeDecisions > 0 && (
          <div className="mt-3 pt-3 border-t">
            <div className="text-sm text-gray-600">
              Made <span className="font-semibold">{mergeDecisions}</span> intelligent merge decisions
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
