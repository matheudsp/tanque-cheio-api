export interface CsvRow {
  CNPJ: string;
  RAZÃO: string;
  FANTASIA: string;
  ENDEREÇO: string;
  NÚMERO: string;
  COMPLEMENTO: string;
  BAIRRO: string;
  CEP: string;
  MUNICÍPIO: string;
  ESTADO: string;
  BANDEIRA: string;
  PRODUTO: string;
  'UNIDADE DE MEDIDA': string;
  'PREÇO DE REVENDA': string;
  'DATA DA COLETA': string;
}

export interface ProcessingResult {
  totalProcessed: number;
  totalErrors: number;
  errors: Array<{
    row: number;
    data: any;
    error: string;
  }>;
}

export interface FileProcessorOptions {
  validateContent?: boolean;
  requiredHeaders?: string[];
  customValidation?: boolean;
}

export interface FileProcessorResult {
  success: boolean;
  processedFile?: ProcessedFileResult;
  validation?: FileValidationResult;
  message: string;
  errors: string[];
}

export interface FileProcessorConfig {
  tempDir?: string;
  maxFileSize?: number; // em bytes
  allowedExtensions?: string[];
}

export interface ProcessedFileResult {
  csvPath: string;
  originalName: string;
  rowCount: number;
  columnCount: number;
  headers: string[];
  tempFiles: string[]; // arquivos temporários para limpeza
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  rowCount: number;
  emptyRows: number;
  duplicateRows: number;
}
