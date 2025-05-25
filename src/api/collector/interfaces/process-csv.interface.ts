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
