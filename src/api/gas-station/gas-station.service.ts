import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  responseOk,
  responseNotFound,
  responseInternalServerError,
  responseBadRequest,
} from '@/common/utils/response-api';
import { getErrorResponse } from '@/common/utils/lib';

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CacheRequestService } from '@/common/services/cache-request/cache-request.service';
import { seconds } from '@nestjs/throttler';
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
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly cacheKey: CacheRequestService,
    private readonly repo: GasStationRepository,
    private readonly priceHistoryRepo: PriceHistoryRepository,
  ) {}

  async findById(stationId: string) {
    try {
      const cacheKey = `station:${stationId}`;
      const cacheData = await this.cache.get<any>(cacheKey);
      if (cacheData) {
        return responseOk({ data: cacheData });
      }

      const station = await this.repo.findById(stationId);
      if (!station) {
        return responseNotFound({ message: 'Posto não encontrado' });
      }

      const fuelPricesData =
        await this.priceHistoryRepo.getLatestPrices(stationId);
      const data = {
        ...station,
        fuel_prices: fuelPricesData,
      };

      // cache por 15 minutos (900 segundos)
      await this.cache.set(cacheKey, data, seconds(900));

      return responseOk({ data });
    } catch (e) {
      return getErrorResponse(e);
    }
  }
  async getPriceHistoryForChart(
    stationId: string,
    query: PriceHistoryQueryDto,
  ) {
    try {
      const cacheKey = `price-history:${stationId}:${JSON.stringify(query)}`;
      const cachedData = await this.cache.get<any>(cacheKey);
      if (cachedData) {
        return responseOk({ data: cachedData });
      }

      const stationExists = await this.repo.findById(stationId);
      if (!stationExists) {
        return responseNotFound({ message: 'Posto não encontrado' });
      }

      const endDate = query.end_date ? new Date(query.end_date) : new Date();
      const startDate = query.start_date
        ? new Date(query.start_date)
        : new Date(new Date().setDate(endDate.getDate() - 30));

      const priceHistoryData =
        await this.priceHistoryRepo.getPriceHistoryGrouped(
          stationId,
          startDate,
          endDate,
          query.product,
        );

      //cache por 10 minutos (600 segundos)
      await this.cache.set(cacheKey, priceHistoryData, seconds(600));

      return responseOk({ data: priceHistoryData });
    } catch (e) {
      this.logger.error(
        `Erro ao buscar histórico de preços para o posto ${stationId}:`,
        e,
      );
      return getErrorResponse(e);
    }
  }

  async search(filters: SearchGasStationsQuerySchema) {
    try {
      searchGasStationsQuerySchema.parse({ filters });
      const key = `search:${JSON.stringify(filters)}`;

      const cachedData = await this.cache.get<any>(key);
      if (cachedData) {
        return responseOk({ data: cachedData });
      }

      const { results, total } = await this.repo.filter(filters);
      const searchResult = {
        results,
        total,
        limit: filters.limit || 50,
        offset: filters.offset || 0,
      };

      await this.cache.set(key, searchResult, seconds(300)); // 5 minutos

      return responseOk({ data: searchResult });
    } catch (e) {
      return getErrorResponse(e);
    }
  }

  async findNearby(params: GetNearbyStationsSchema) {
    try {
      const parsed = getNearbyStationsSchema.parse(params);
      const { lat, lng, radius, product, sort, limit, offset } = parsed;

      const cacheKey = `nearby-stations:${lat}:${lng}:${radius}:${product || 'any'}:${sort}:${limit}:${offset}`;

      this.logger.log(`[CACHE] Attempting to get data from key: ${cacheKey}`);

      const cachedData = await this.cache.get<any>(cacheKey);
      if (cachedData) {
        this.logger.log(`[CACHE] Hit for key: ${cacheKey}`);
        return responseOk({ data: cachedData });
      }

      this.logger.log(
        `[CACHE] Miss for key: ${cacheKey}. Fetching from repository.`,
      );

      const result = await this.repo.nearby(parsed);

      await this.cache.set(cacheKey, result, seconds(300));

      return responseOk({ data: result });
    } catch (e) {
      this.logger.error('Error finding nearby stations:', e);
      return getErrorResponse(e);
    }
  }
}
