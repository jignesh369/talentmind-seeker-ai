
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useState } from "react"
import { useDataCollection } from "@/hooks/useDataCollection"
import { Progress } from "@/components/ui/progress"

interface DataCollectionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onDataCollected: () => Promise<void>;
}

interface ResultsDrawerProps {
  result: any;
  open: boolean;
  setOpen: (open: boolean) => void;
}

// Results display drawer for showing collection results
export function ResultsDrawer({ result, open, setOpen }: ResultsDrawerProps) {
  if (!result) return null;

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Collection Results</DrawerTitle>
          <DrawerDescription>
            Detailed results from the data collection process.
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-6 pb-4">
          <h3 className="text-lg font-semibold mb-2">Quality Metrics</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-gray-600">Validation Rate:</div>
            <div className="font-medium">{result.quality_metrics?.validation_rate || 'N/A'}</div>
            
            <div className="text-gray-600">Processing Time:</div>
            <div className="font-medium">{result.quality_metrics?.processing_time || 'N/A'}</div>
            
            <div className="text-gray-600">Time Efficiency:</div>
            <div className="font-medium">{result.quality_metrics?.time_efficiency || 'N/A'}</div>
            
            <div className="text-gray-600">Parallel Processing:</div>
            <div className="font-medium">{result.quality_metrics?.parallel_processing ? '✅ Yes' : '❌ No'}</div>
            
            <div className="text-gray-600">Smart Limiting:</div>
            <div className="font-medium">{result.quality_metrics?.smart_limiting ? '✅ Yes' : '❌ No'}</div>
            
            <div className="text-gray-600">Early Returns:</div>
            <div className="font-medium">{result.quality_metrics?.early_returns ? '✅ Yes' : '❌ No'}</div>
          </div>
          
          {result.results && (
            <>
              <h3 className="text-lg font-semibold mt-4 mb-2">Source Results</h3>
              <Table>
                <TableCaption>Results from each source.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Candidates</TableHead>
                    <TableHead>Validated</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(result.results).map(([source, data]: [string, any]) => (
                    <TableRow key={source}>
                      <TableCell>{source}</TableCell>
                      <TableCell>{data.total}</TableCell>
                      <TableCell>{data.validated}</TableCell>
                      <TableCell>{data.error || 'None'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </div>
        <DrawerFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

// Main data collection drawer component
export function DataCollectionDrawer({ isOpen, onClose, onDataCollected }: DataCollectionDrawerProps) {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [sources, setSources] = useState<string[]>(['github', 'stackoverflow', 'linkedin', 'google']);
  const [showResults, setShowResults] = useState(false);
  
  const { collectData, isCollecting, collectionResult, progress } = useDataCollection();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const result = await collectData(query, location || undefined, sources);
    if (result) {
      setShowResults(true);
      await onDataCollected();
    }
  };

  const handleClose = () => {
    if (!isCollecting) {
      onClose();
      setQuery("");
      setLocation("");
      setShowResults(false);
    }
  };

  const sourceOptions = [
    { id: 'github', label: 'GitHub' },
    { id: 'stackoverflow', label: 'Stack Overflow' },
    { id: 'linkedin', label: 'LinkedIn' },
    { id: 'google', label: 'Google Search' },
    { id: 'kaggle', label: 'Kaggle' },
    { id: 'devto', label: 'Dev.to' }
  ];

  return (
    <>
      <Drawer open={isOpen} onOpenChange={handleClose}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Collect Candidate Data</DrawerTitle>
            <DrawerDescription>
              Search for candidates across multiple platforms using our time-budget optimized system.
            </DrawerDescription>
          </DrawerHeader>
          
          <form onSubmit={handleSubmit} className="px-6 pb-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="query">Search Query</Label>
              <Input
                id="query"
                placeholder="e.g., React developer, Machine learning engineer"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={isCollecting}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location">Location (optional)</Label>
              <Input
                id="location"
                placeholder="e.g., San Francisco, Remote"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={isCollecting}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Sources to Search</Label>
              <div className="grid grid-cols-2 gap-2">
                {sourceOptions.map((source) => (
                  <label key={source.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={sources.includes(source.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSources([...sources, source.id]);
                        } else {
                          setSources(sources.filter(s => s !== source.id));
                        }
                      }}
                      disabled={isCollecting}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">{source.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {isCollecting && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Collecting data...</span>
                  <span>⚡ Time-budget optimized</span>
                </div>
                <Progress value={33} className="w-full" />
                {progress && (
                  <p className="text-sm text-gray-600">{progress}</p>
                )}
              </div>
            )}
            
            <div className="flex space-x-2 pt-4">
              <Button 
                type="submit" 
                disabled={isCollecting || !query.trim() || sources.length === 0}
                className="flex-1"
              >
                {isCollecting ? "Collecting..." : "Start Collection"}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                disabled={isCollecting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DrawerContent>
      </Drawer>

      {/* Results drawer */}
      <ResultsDrawer 
        result={collectionResult} 
        open={showResults} 
        setOpen={setShowResults} 
      />
    </>
  );
}
