export class SearchGasStationsDto {
  /**
   * Nome do município
   * @example "São Paulo"
   */
  municipio?: string;

  /**
   * Tipo de combustível
   * @example "GASOLINA COMUM"
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

export class GetNearbyStationsDto {
  /**
   * Latitude da localização
   * @example -23.5505
   */
  latitude: number;

  /**
   * Longitude da localização
   * @example -46.6333
   */
  longitude: number;

  /**
   * Raio de busca em quilômetros
   * @example 10
   */
  radius?: number;

  /**
   * Filtrar por tipo de combustível
   * @example "GASOLINA COMUM"
   */
  produto?: string;

  /**
   * Quantidade máxima de resultados
   * @example 20
   */
  limit?: number;
}

export class GetStationsByProductDto {
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
   * Ordenação dos resultados
   * @example "price_asc"
   */
  orderBy?: 'price_asc' | 'price_desc' | 'date_desc';

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

export class GetStationPriceHistoryDto {
  /**
   * Filtrar por produto específico
   * @example "GASOLINA COMUM"
   */
  produto?: string;

  /**
   * Data inicial para filtro (YYYY-MM-DD)
   * @example "2025-01-01"
   */
  startDate?: string;

  /**
   * Data final para filtro (YYYY-MM-DD)
   * @example "2025-05-29"
   */
  endDate?: string;

  /**
   * Quantidade máxima de resultados
   * @example 100
   */
  limit?: number;
}
