
import React, { useState } from 'react';
import { Zap, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DataEnrichmentPanelProps {
  candidates: any[];
  onEnrichmentComplete: () => void;
}

export const DataEnrichmentPanel: React.FC<DataEnrichmentPanelProps> = ({ 
  candidates, 
  onEnrichmentComplete 
}) => {
  const [isEnriching, setIsEnriching] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [enrichmentProgress, setEnrichmentProgress] = useState<string>('');
  const { toast } = useToast();

  const candidatesNeedingEnrichment = candidates.filter(candidate => 
    !candidate.email || 
    !candidate.linkedin_url || 
    (candidate.skills?.length || 0) < 3 ||
    !candidate.summary
  );

  const handleSelectCandidate = (candidateId: string) => {
    setSelectedCandidates(prev => 
      prev.includes(candidateId) 
        ? prev.filter(id => id !== candidateId)
        : [...prev, candidateId]
    );
  };

  const handleSelectAll = () => {
    setSelectedCandidates(
      selectedCandidates.length === candidatesNeedingEnrichment.length 
        ? [] 
        : candidatesNeedingEnrichment.map(c => c.id)
    );
  };

  const handleEnrichData = async () => {
    if (selectedCandidates.length === 0) {
      toast({
        title: "No candidates selected",
        description: "Please select candidates to enrich",
        variant: "destructive"
      });
      return;
    }

    setIsEnriching(true);
    setEnrichmentProgress('Starting data enrichment...');

    try {
      const candidatesToEnrich = candidates.filter(c => selectedCandidates.includes(c.id));
      
      for (let i = 0; i < candidatesToEnrich.length; i++) {
        const candidate = candidatesToEnrich[i];
        setEnrichmentProgress(`Enriching ${candidate.name} (${i + 1}/${candidatesToEnrich.length})`);
        
        const { data, error } = await supabase.functions.invoke('enrich-candidate-data', {
          body: {
            candidateId: candidate.id,
            candidateName: candidate.name,
            existingData: {
              email: candidate.email,
              location: candidate.location,
              title: candidate.title,
              skills: candidate.skills || []
            }
          }
        });

        if (error) {
          console.error(`Enrichment failed for ${candidate.name}:`, error);
        }
        
        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      setEnrichmentProgress('');
      onEnrichmentComplete();
      
      toast({
        title: "Data enrichment completed",
        description: `Successfully enriched ${selectedCandidates.length} candidates`,
      });
      
      setSelectedCandidates([]);
    } catch (error: any) {
      console.error('Enrichment error:', error);
      toast({
        title: "Enrichment failed",
        description: error.message || "Failed to enrich candidate data",
        variant: "destructive"
      });
    } finally {
      setIsEnriching(false);
      setEnrichmentProgress('');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Zap className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Data Enrichment</h3>
            <p className="text-sm text-slate-600">
              Enhance candidate profiles with additional information
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleSelectAll}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            {selectedCandidates.length === candidatesNeedingEnrichment.length ? 'Deselect All' : 'Select All'}
          </button>
          
          <button
            onClick={handleEnrichData}
            disabled={isEnriching || selectedCandidates.length === 0}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
              isEnriching || selectedCandidates.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            {isEnriching ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            <span>Enrich Selected ({selectedCandidates.length})</span>
          </button>
        </div>
      </div>

      {enrichmentProgress && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">{enrichmentProgress}</p>
        </div>
      )}

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {candidatesNeedingEnrichment.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
            <p>All candidates have complete data profiles!</p>
          </div>
        ) : (
          candidatesNeedingEnrichment.map(candidate => {
            const missingData = [];
            if (!candidate.email) missingData.push('Email');
            if (!candidate.linkedin_url) missingData.push('LinkedIn');
            if ((candidate.skills?.length || 0) < 3) missingData.push('Skills');
            if (!candidate.summary) missingData.push('Summary');

            return (
              <div 
                key={candidate.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedCandidates.includes(candidate.id)
                    ? 'border-purple-300 bg-purple-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                onClick={() => handleSelectCandidate(candidate.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedCandidates.includes(candidate.id)}
                      onChange={() => handleSelectCandidate(candidate.id)}
                      className="rounded border-slate-300"
                    />
                    <img
                      src={candidate.avatar_url || '/placeholder.svg'}
                      alt={candidate.name}
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <h4 className="font-medium text-slate-900">{candidate.name}</h4>
                      <p className="text-sm text-slate-600">{candidate.title || 'Developer'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-orange-500" />
                    <span className="text-sm text-slate-600">
                      Missing: {missingData.join(', ')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
