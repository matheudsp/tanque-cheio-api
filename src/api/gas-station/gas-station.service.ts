import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { seconds } from '@nestjs/throttler';

import {
  responseOk,
  responseNotFound,
  responseInternalServerError,
  responseBadRequest,
} from '@/common/utils/response-api';
import { getErrorResponse } from '@/common/utils/lib';
import { CacheRequestService } from '@/common/services/cache-request/cache-request.service';

import {
  getNearbyStationsSchema,
  searchGasStationsQuerySchema,
  SearchGasStationsQuerySchema,
  type GetNearbyStationsSchema,
} from './schemas/gas-station.schema';
import {
  SearchResult,
  type NearbyParams,
} from './interfaces/gas-station.interface';
import { GasStationRepository } from './repositories/gas-station.repository';
import { PriceHistoryRepository } from '../price-history/repositories/price-history.repository';
import type { PriceHistoryQueryDto } from './dtos/gas-station.dto';

@Injectable()
export class GasStationService {
  private readonly logger = new Logger(GasStationService.name);

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly cache: CacheRequestService,
    private readonly repo: GasStationRepository,
    private readonly priceHistoryRepo: PriceHistoryRepository,
  ) {}

  async all(){
    try {
      const key = this.cache.getCacheKey();
      // let data = await this.cacheManager.get(key);

      // if (data) return responseOk({ data });

      let data = await this.repo.all();
      if (!data) return responseNotFound({ message: 'Nenhum posto encontrado' });

      // cached for 15 min in redis
      // await this.cacheManager.set(key, data, seconds(900));

      return responseOk({ data });
    } catch (e) {
      return getErrorResponse(e);
    }
  }
  async findById(stationId: string) {
    try {
      const key = this.cache.getCacheKey();
      let data = await this.cacheManager.get(key);

      if (data) return responseOk({ data });

      const station = await this.repo.findById(stationId);
      const fuelPricesData =
        await this.priceHistoryRepo.getLatestPrices(stationId);
      data = {
        ...station,
        fuelPrices: fuelPricesData,
      };
      if (!data) return responseNotFound({ message: 'Posto não encontrado' });
      // cached for 15 min in redis
      await this.cacheManager.set(key, data, seconds(900));

      return responseOk({ data });
    } catch (e) {
      return getErrorResponse(e);
    }
  }


   async getPriceHistoryForChart(stationId: string, query: PriceHistoryQueryDto) {
    try {
      

      // Valida se o posto existe antes de prosseguir
      const stationExists = await this.repo.findById(stationId);
      if (!stationExists) {
        return responseNotFound({ message: 'Posto não encontrado' });
      }

      // Define o período padrão (últimos 30 dias) se não for fornecido
      const endDate = query.endDate ? new Date(query.endDate) : new Date();
      const startDate = query.startDate
        ? new Date(query.startDate)
        : new Date(new Date().setDate(endDate.getDate() - 30));

      // Busca o histórico de preços agrupado usando o método que já existe
      const priceHistoryData =
        await this.priceHistoryRepo.getPriceHistoryGrouped(
          stationId,
          startDate,
          endDate,
          query.product, // Passa o filtro de produto, se houver
        );
      
      return responseOk({ data: priceHistoryData });

    } catch (e) {
      this.logger.error(`Erro ao buscar histórico de preços para o posto ${stationId}:`, e);
      return getErrorResponse(e);
    }
  }

  async search(filters: SearchGasStationsQuerySchema) {
    try {
      searchGasStationsQuerySchema.parse({ filters });
      const key = this.cache.getCacheKey();

      let data = await this.cacheManager.get(key);
      if (data) return responseOk({ data });

      const { results, total } = await this.repo.filter(filters);

      const searchResult: SearchResult = {
        results,
        total,
        limit: filters.limit || 50,
        offset: filters.offset || 0,
      };

      await this.cacheManager.set(key, searchResult, seconds(300)); // 5 minutos
      return responseOk({ data: searchResult });
    } catch (e) {
      // this.logger.error('Error searching gas stations:', e);
      return getErrorResponse(e);
    }
  }

  async findNearby(params: GetNearbyStationsSchema) {
  try {
    const parsed = getNearbyStationsSchema.parse(params);
    
    // const key = this.cache.getCacheKey();
    // let cached = await this.cacheManager.get(key);

    // if (cached) {
    //   return responseOk({ data: cached });
    // }


     const result = await this.repo.nearby(parsed);
    
    // await this.cacheManager.set(key, nearbyResult, seconds(600));

    return responseOk({ data: result });
  } catch (e) {
    this.logger.error('Error finding nearby stations:', e);
    return getErrorResponse(e);
  }
}

  
}
