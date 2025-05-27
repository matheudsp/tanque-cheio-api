
export interface CsvRow {
  REGIÃO: any;
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
