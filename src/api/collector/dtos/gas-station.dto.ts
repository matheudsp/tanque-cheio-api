
export class DownloadSpreadsheetDto {
  /**
   * URL da planilha XLSX da ANP
   * @example "https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/arquivos-lpc/2025/revendas_lpc_2025-05-18_2025-05-24.xlsx"
   */
  url: string;
}

export class SearchGasStationsDto {
  /**
   * Sigla do estado (UF)
   * @example "SP"
   */
  uf?: string;

  /**
   * Nome do município
   * @example "São Paulo"
   */
  municipio?: string;

  /**
   * Tipo de combustível
   * @example "Etanol"
   */
  produto?: string;

  /**
   * Bandeira do posto
   * @example "Petrobras"
   */
  bandeira?: string;

  /**
   * Quantidade máxima de resultados
   * @example 50
   */
  limit?: number;

  /**
   * Quantidade de registros a pular
   * @example 0
   */
  offset?: number;
}