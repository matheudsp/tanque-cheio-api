import type { GasStation } from "@/database/entity/gas-station.entity";


export interface SearchFilters {
  uf?: string;
  municipio?: string;
  produto?: string;
  bandeira?: string;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  results: GasStation[];
  total: number;
  limit: number;
  offset: number;
}

export interface StatisticsResult {
  totalStations: number;
  byState: Array<{ uf: string; total: number }>;
  byProduct: Array<{ 
    produto: string; 
    total: number; 
    preco_medio: number;
    preco_minimo: number;
    preco_maximo: number;
  }>;
  lastUpdate: Date | null;
}