export interface IFileValidator<TRow = any> {
  validate(rows: TRow[]): ValidationResult[];
}
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

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  rowIndex: number;
}
