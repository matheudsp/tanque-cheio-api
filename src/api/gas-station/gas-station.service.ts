import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { seconds } from '@nestjs/throttler';

import {
  responseOk,
  responseNotFound,
  responseInternalServerError,
} from '@/common/utils/response-api';
import { getErrorResponse } from '@/common/utils/lib';
import { CacheRequestService } from '@/common/services/cache-request/cache-request.service';

import {
  searchGasStationsQuerySchema,
  SearchGasStationsQuerySchema,
} from './schemas/gas-station.schema';
import {
  SearchResult,
  StationWithDistance,
} from './interfaces/gas-station.interface';
import { GasStationRepository } from './repositories/gas-station.repository';
import { PriceHistoryRepository } from '../price-history/repositories/price-history.repository';

@Injectable()
export class GasStationService {
  private readonly logger = new Logger(GasStationService.name);

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly cache: CacheRequestService,
    private readonly repo: GasStationRepository,
    private readonly priceHistoryRepo: PriceHistoryRepository,
  ) {}

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

  /**
   * Obtém histórico de preços de um produto de um posto específico
   */
  // async getStationPriceHistory(stationId: string, produto?: string, limit = 50) {
  //   try {
  //     const key = this.cache.getCacheKey();

  //     let data = await this.cacheManager.get(key);
  //     if (data) return responseOk({ data });

  //     // Verificar se o posto existe
  //     const station = await this.repo.findById(stationId);
  //     if (!station) {
  //       return responseNotFound({ message: 'Gas station not found' });
  //     }

  //     // Buscar histórico de preços
  //     const priceHistory = await this.priceHistoryRepo.getPriceHistory(
  //       stationId,
  //       produto,
  //       limit
  //     );

  //     const result= {
  //       stationId,
  //       results: priceHistory,
  //       total: priceHistory.length,
  //       limit,
  //       filters: {
  //         produto,
  //       },
  //     };

  //     await this.cacheManager.set(key, result, seconds(600)); // 5 minutos
  //     return responseOk({ data: result });
  //   } catch (error) {
  //     this.logger.error('Error getting price history:', error);
  //     return getErrorResponse(error);
  //   }
  // }
}
