import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';

import { PriceHistoryRepository } from './repositories/price-history.repository';
import { CacheRequestService } from '@/common/services/cache-request/cache-request.service';
import { zodErrorParse } from '@/common/utils/lib';
import {
  responseNotFound,
  responseOk,
  responseBadRequest,
  responseInternalServerError,
} from '@/common/utils/response-api';

import {
  LatestPricesResponseDto,
  HistoryResponseDto,
  PriceItemDto,
  type PeriodQueryDto,
} from './dtos/price-history.dto';
import {
  periodQuerySchema,
  stationParamSchema,
  type PeriodQueryType,
} from './schemas/price-history.schema';

@Injectable()
export class PriceHistoryService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly cacheService: CacheRequestService,
    private readonly repository: PriceHistoryRepository,
  ) {}

  /**
   * Busca os últimos preços de todos os produtos do posto
   */
  async getLatestPrices(stationId: string) {
    try {
      // Validação do parâmetro
      stationParamSchema.parse({ stationId });

      const cacheKey = this.cacheService.getCacheKey();
      const cachedData = await this.cacheManager.get<LatestPricesResponseDto>(cacheKey);

      if (cachedData) {
        return responseOk({ data: cachedData });
      }

      const latestPrices = await this.repository.getLatestPrices(stationId);

      if (!latestPrices.length) {
        return responseNotFound({
          message: 'Nenhum preço encontrado para este posto',
        });
      }

      // Calcular variações usando método reutilizável
      const prices = await this.calculatePriceVariations(latestPrices, stationId);

      const response: LatestPricesResponseDto = {
        stationId,
        prices,
        totalProducts: prices.length,
        updatedAt: new Date().toISOString(),
      };

      // Cache por 2 minutos
      await this.cacheManager.set(cacheKey, response, 120000);

      return responseOk({ data: response });
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Busca histórico de preços por período
   */
  async getPriceHistory(stationId: string, query: PeriodQueryDto) {
    try {
      // Validações
      stationParamSchema.parse({ stationId });
      const parsed = periodQuerySchema.parse(query);

      const cacheKey = this.cacheService.getCacheKey();
      const cachedData = await this.cacheManager.get<HistoryResponseDto>(cacheKey);

      if (cachedData) {
        return responseOk({ data: cachedData });
      }

      const startDate = new Date(parsed.startDate);
      const endDate = new Date(parsed.endDate);

      const priceHistory = await this.repository.getPriceHistory(
        stationId,
        startDate,
        endDate,
        parsed.product,
      );

      if (!priceHistory.length) {
        const productFilter = parsed.product ? ` para o produto ${parsed.product}` : '';
        return responseNotFound({
          message: `Nenhum preço encontrado no período de ${parsed.startDate} a ${parsed.endDate}${productFilter}`,
        });
      }

      // Calcular variações usando método reutilizável
      const prices = await this.calculatePriceVariations(priceHistory, stationId);

      const response: HistoryResponseDto = {
        stationId,
        startDate: parsed.startDate,
        endDate: parsed.endDate,
        product: parsed.product,
        prices,
        total: prices.length,
        queryTime: new Date().toISOString(),
      };

      // Cache por 3 minutos
      await this.cacheManager.set(cacheKey, response, 180000);

      return responseOk({ data: response });
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ================ MÉTODOS AUXILIARES REUTILIZÁVEIS ================

  /**
   * Calcula variações de preço de forma reutilizável
   */
  private async calculatePriceVariations(
    priceList: any[],
    stationId: string,
  ): Promise<PriceItemDto[]> {
    return await Promise.all(
      priceList.map(async (current) => {
        const previous = await this.repository.getPreviousPrice(
          stationId,
          current.product.id,
          current.collection_date,
        );

        let variation: number | undefined;
        let variationPercent: number | undefined;

        if (previous?.price && current.price) {
          const rawVariation = current.price - previous.price;
          variation = Number(rawVariation.toFixed(3));
          variationPercent = Number(((rawVariation / previous.price) * 100).toFixed(2));
        }

        return {
          id: current.id,
          productId: current.product.id,
          productName: current.product.name,
          price: Number(current.price),
          date: current.collection_date.toString(),
          unit: current.product.unitOfMeasure || 'L',
          variation,
          variationPercent,
        };
      }),
    );
  }

  /**
   * Tratamento de erros padronizado e reutilizável
   */
  private handleError(error: any) {
    const zodErr = zodErrorParse(error);
    if (zodErr.isError) {
      return responseBadRequest({
        error: zodErr.errors,
      });
    }

    return responseInternalServerError({
      message: error?.message || 'Erro interno do servidor',
    });
  }
}