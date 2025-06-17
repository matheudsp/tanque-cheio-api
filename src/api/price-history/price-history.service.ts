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

import {
PeriodQueryDto,
PriceByProductDto,
} from './dtos/price-history.dto';
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
  async getLatestFuelPrices(stationId: string) {
    try {
      // Validação do parâmetro
      stationParamSchema.parse({ stationId });

      const cacheKey = this.cacheService.getCacheKey();
      const cachedData = await this.cacheManager.get(cacheKey);

      if (cachedData) {
        return responseOk({ data: cachedData });
      }

      const data = await this.repository.getLatestPrices(stationId);

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
  async getPriceHistory(stationId: string, query: PeriodQueryDto) {
    try {
      stationParamSchema.parse({ stationId });
      const {
        startDate: startStr,
        endDate: endStr,
        product: productNameFilter,
      } = periodQuerySchema.parse(query);

      const cacheKey = this.cacheService.getCacheKey();
      const cachedData =
        await this.cacheManager.get(cacheKey);

      if (cachedData) {
        return responseOk({ data: cachedData });
      }

      const startDate = new Date(startStr);
      const endDate = new Date(endStr);

      const grouped: PriceByProductDto[] =
        await this.repository.getPriceHistoryGrouped(
          stationId,
          startDate,
          endDate,
          productNameFilter,
        );

      if (!grouped.length) {
        const productFilter = productNameFilter
          ? ` para o produto ${productNameFilter}`
          : '';
        return responseNotFound({
          message: `Nenhum preço encontrado no período de ${startStr} a ${endStr}${productFilter}`,
        });
      }

      const response = {
        stationId,
        startDate: startStr,
        endDate: endStr,
        prices: grouped,
        totalProducts: grouped.length,
        queryTime: new Date().toISOString(),
      };

      // Cache por 3 minutos
      await this.cacheManager.set(cacheKey, response, 1);

      return responseOk({ data: response });
    } catch (error) {
      return getErrorResponse(error);
    }
  }
}
