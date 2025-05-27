

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