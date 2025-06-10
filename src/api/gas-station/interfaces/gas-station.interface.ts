import type { GasStationEntity } from '@/database/entity/gas-station.entity';

export interface SearchResult {
  results: GasStationEntity[];
  total: number;
  limit: number;
  offset: number;
}


export interface NearbyParams {
  lat: number;
  lng: number;
  radius: number; // em km
  limit?: number;
  offset?: number;
}







