import type { GasStationEntity } from '@/database/entity/gas-station.entity';
import type { PriceHistoryEntity} from '@/database/entity/price-history.entity';
import type { ProductEntity } from '@/database/entity/product.entity';

// Filtros de busca geral
export interface SearchFilters {
  uf?: string;
  municipio?: string;
  produto?: string;
  bandeira?: string;
  limit?: number;
  offset?: number;
}


// Resultado da busca geral - usando posto simplificado
export interface SearchResult {
  results: GasStationEntity[];
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
  GasStationEntity,
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
  results: PriceHistoryEntity[];
  total: number;
  limit: number;
  offset: number;
  orderBy: string;
}

// Resultado do histórico de preços
export interface PriceHistoryResult {
  stationId: string;
  results: PriceHistoryEntity[];
  total: number;
  limit: number;
  filters: {
    produto?: string;
    startDate?: Date;
    endDate?: Date;
  };
}





