import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
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

interface DataCollectionDrawerProps {
  result: any;
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function DataCollectionDrawer({ result, open, setOpen }: DataCollectionDrawerProps) {
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
                    <div className="font-medium">{result.quality_metrics.validation_rate}</div>
                    
                    <div className="text-gray-600">Processing Time:</div>
                    <div className="font-medium">{result.quality_metrics.processing_time}</div>
                    
                    <div className="text-gray-600">Time Efficiency:</div>
                    <div className="font-medium">{result.quality_metrics.time_efficiency}</div>
                    
                    <div className="text-gray-600">Parallel Processing:</div>
                    <div className="font-medium">{result.quality_metrics.parallel_processing ? '✅ Yes' : '❌ No'}</div>
                    
                    <div className="text-gray-600">Smart Limiting:</div>
                    <div className="font-medium">{result.quality_metrics.smart_limiting ? '✅ Yes' : '❌ No'}</div>
                    
                    <div className="text-gray-600">Early Returns:</div>
                    <div className="font-medium">{result.quality_metrics.early_returns ? '✅ Yes' : '❌ No'}</div>
                  </div>
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
        </div>
        <DrawerFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
