import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';

import { PriceHistoryRepository } from './repositories/price-history.repository';
import { CacheRequestService } from '@/common/services/cache-request/cache-request.service';
import { getErrorResponse } from '@/common/utils/lib';
import {
  responseNotFound,
  responseOk,
  responseBadRequest,
  responseInternalServerError,
} from '@/common/utils/response-api';

import { PeriodQueryDto, PriceByProductDto } from './dtos/price-history.dto';
import {
  periodQuerySchema,
  stationParamSchema,
} from './schemas/price-history.schema';

@Injectable()
export class PriceHistoryService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly cacheService: CacheRequestService,
    private readonly repository: PriceHistoryRepository,
  ) {}

  /**
   * função para buscar preços formatados dos combustíveis
   */
  async getLatestFuelPrices(station_id: string) {
    try {
      // Validação do parâmetro
      stationParamSchema.parse({ station_id });

      const cacheKey = this.cacheService.getCacheKey();

      const cachedData = await this.cacheManager.get(cacheKey);
      if (cachedData) {
        return responseOk({ data: cachedData });
      }

      const data = await this.repository.getLatestPrices(station_id);

      if (!data.length) {
        return responseNotFound({
          message: 'Nenhum preço encontrado para este posto',
        });
      }

      // Cache por 2 minutos
      await this.cacheManager.set(cacheKey, data, 120000);

      return responseOk({ data });
    } catch (error) {
      return getErrorResponse(error);
    }
  }

  /**
   * Busca histórico de preços por período
   */
  async getPriceHistory(station_id: string, query: PeriodQueryDto) {
    try {
      stationParamSchema.parse({ station_id });
      const {
        start_date: startStr,
        end_date: endStr,
        product: product_name,
      } = periodQuerySchema.parse(query);

      const cacheKey = this.cacheService.getCacheKey();
      const cachedData = await this.cacheManager.get(cacheKey);
      
      if (cachedData) {
        return responseOk({ data: cachedData });
      }

      const start_date = new Date(startStr);
      const end_date = new Date(endStr);

      const grouped: PriceByProductDto[] =
        await this.repository.getPriceHistoryGrouped(
          station_id,
          start_date,
          end_date,
          product_name,
        );

      if (!grouped.length) {
        const productFilter = product_name
          ? ` para o produto ${product_name}`
          : '';
        return responseNotFound({
          message: `Nenhum preço encontrado no período de ${startStr} a ${endStr}${productFilter}`,
        });
      }

      const response = {
        station_id,
        start_date: startStr,
        end_date: endStr,
        prices: grouped,
        totalProducts: grouped.length,
      };

      // Cache por 3 minutos
      await this.cacheManager.set(cacheKey, response, 120000);

      return responseOk({ data: response });
    } catch (error) {
      return getErrorResponse(error);
    }
  }
}
