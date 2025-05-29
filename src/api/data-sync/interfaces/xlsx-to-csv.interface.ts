export interface ConversionResult {
  success: boolean;
  csvPath?: string;
  csvFileName?: string;
  rowCount?: number;
  columnCount?: number;
  headers?: string[];
  error?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  emptyRows: number;
  duplicateRows: number;
}

export interface ProcessedFileInfo {
  csvPath: string;
  originalName: string;
  rowCount: number;
  columnCount: number;
  fileSize: number;
  headers: string[];
  validationResult: ValidationResult;
}

export interface FileTransformationResult {
  success: boolean;
  processedFile?: ProcessedFileInfo;
  tempFiles?: string[];
  errors?: string[];
}