


export interface ProcessingResult {
  totalProcessed: number;
  totalInserted: number;
  totalUpdated: number;
  totalSkipped: number;
  totalErrors: number;
  errors: ProcessingError[];
  processingTimeSeconds?: number;
}

interface ProcessingError {
  row: number;
  data: any;
  error: string;
}
