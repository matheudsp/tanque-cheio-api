import type { GasStation } from '@/database/entity/gas-station.entity';
import type { PriceHistory } from '@/database/entity/price-history.entity';
import type { Product } from '@/database/entity/product.entity';

// Filtros de busca geral
export interface SearchFilters {
  uf?: string;
  municipio?: string;
  produto?: string;
  bandeira?: string;
  limit?: number;
  offset?: number;
}

// Resultado da busca geral
export interface SearchResult {
  results: GasStation[];
  total: number;
  limit: number;
  offset: number;
}

// Filtros para busca por proximidade
export interface NearbyStationsFilter {
  latitude: number;
  longitude: number;
  radius?: number;
  produto?: string;
  limit?: number;
}

// Posto com distância calculada
export type StationWithDistance = Omit<
  GasStation,
  | 'getDisplayName'
  | 'normalizeCnpj'
  | 'formatCnpj'
  | 'getUpsertKey'
  | 'isValid'
  | 'getFullInfo'
> & {
  distance: number;
};

// Resultado da busca por proximidade
export interface NearbyStationsResult {
  results: StationWithDistance[];
  total: number;
  limit: number;
  searchCenter: {
    latitude: number;
    longitude: number;
    radius: number;
  };
}

// Filtros para busca por produto
export interface StationsByProductFilter {
  uf?: string;
  municipio?: string;
  orderBy?: 'price_asc' | 'price_desc' | 'date_desc';
  limit?: number;
  offset?: number;
}

// Resultado da busca por produto
export interface StationsByProductResult {
  productName: string;
  results: PriceHistory[];
  total: number;
  limit: number;
  offset: number;
  orderBy: string;
}

// Filtros para histórico de preços
export interface PriceHistoryFilter {
  produto?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

// Resultado do histórico de preços
export interface PriceHistoryResult {
  stationId: string;
  results: PriceHistory[];
  total: number;
  limit: number;
  filters: {
    produto?: string;
    startDate?: Date;
    endDate?: Date;
  };
}

// Detalhes completos de um posto
export interface StationDetail {
  station: GasStation;
  pricesByProduct: Record<string, PriceHistory[]>;
  totalProducts: number;
  lastUpdate: Date | null;
}

// Estatísticas por estado
export interface StateStatistics {
  uf: string;
  total: number;
}

// Estatísticas por produto
export interface ProductStatistics {
  produto: string;
  total: number;
  preco_medio: number;
  preco_minimo: number;
  preco_maximo: number;
}

// Resultado das estatísticas gerais
export interface StatisticsResult {
  totalStations: number;
  byState: StateStatistics[];
  byProduct: ProductStatistics[];
  lastUpdate: Date | null;
}

// Interface para estado com total de postos
export interface StateWithStations {
  uf: string;
  totalStations: number;
}

// Interface para município com total de postos
export interface CityWithStations {
  municipio: string;
  totalStations: number;
}

// Interface para resposta de análise de preços
export interface PriceAnalysis {
  produto: string;
  preco_atual: number;
  preco_anterior?: number;
  variacao_absoluta?: number;
  variacao_percentual?: number;
  data_atual: Date;
  data_anterior?: Date;
}

// Interface para comparação entre postos
export interface StationComparison {
  stations: Array<{
    station: GasStation;
    prices: Array<{
      produto: string;
      preco: number;
      data_coleta: Date;
    }>;
  }>;
  products: string[];
  summary: {
    cheapest: Record<string, { station: GasStation; price: number }>;
    expensive: Record<string, { station: GasStation; price: number }>;
    average: Record<string, number>;
  };
}

// Interface para ranking de preços
export interface PriceRanking {
  produto: string;
  municipio?: string;
  uf?: string;
  ranking: Array<{
    position: number;
    station: GasStation;
    price: number;
    data_coleta: Date;
  }>;
  statistics: {
    total: number;
    preco_medio: number;
    preco_mediano: number;
    desvio_padrao: number;
  };
}

// Interface para tendências de preço
export interface PriceTrend {
  produto: string;
  periodo: {
    inicio: Date;
    fim: Date;
  };
  dados: Array<{
    data: Date;
    preco_medio: number;
    total_amostras: number;
  }>;
  tendencia: 'alta' | 'baixa' | 'estavel';
  variacao_total: number;
  variacao_percentual: number;
}

// Interface para alertas de preço
export interface PriceAlert {
  id: string;
  posto_id: string;
  produto: string;
  tipo: 'preco_baixo' | 'preco_alto' | 'variacao_grande';
  valor_atual: number;
  valor_referencia: number;
  diferenca: number;
  data_detectado: Date;
  ativo: boolean;
}

// Interface para métricas regionais
export interface RegionalMetrics {
  regiao: {
    uf?: string;
    municipio?: string;
  };
  produtos: Array<{
    nome: string;
    total_postos: number;
    preco_medio: number;
    preco_minimo: number;
    preco_maximo: number;
    desvio_padrao: number;
    ultima_atualizacao: Date;
  }>;
  comparacao_nacional?: {
    diferenca_media: number;
    posicao_ranking: number;
    total_regioes: number;
  };
}
