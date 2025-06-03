import type { GasStationEntity } from '@/database/entity/gas-station.entity';



// Resultado da busca geral - usando posto simplificado
export interface SearchResult {
  results: GasStationEntity[];
  total: number;
  limit: number;
  offset: number;
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







