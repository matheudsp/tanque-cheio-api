import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PriceHistoryRepository } from './repositories/price-history.repository';
import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { CacheRequestService } from '@/common/services/cache-request/cache-request.service';
import {
  priceHistoryQuerySchema,
  PriceHistoryQuerySchema,
} from './schemas/price-history.schema';
import { getErrorResponse } from '@/common/utils/lib';
import {
  responseNotFound,
  responseOk,
} from '@/common/utils/response-api';
import { seconds } from '@nestjs/throttler';
import { PriceHistoryQueryDto, GasStationPriceHistory } from './dtos/price-history.dto';

@Injectable()
export class PriceHistoryService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly cache: CacheRequestService,
    private readonly repo: PriceHistoryRepository,
  ) {}

  async index(query: PriceHistoryQueryDto) {
    try {
      const parsed = priceHistoryQuerySchema.parse({
        produto_id: query.produto_id,
        dataInicio: query.dataInicio ? new Date(query.dataInicio) : undefined,
        dataFim: query.dataFim ? new Date(query.dataFim) : undefined,
        limite: query.limite || 100,
      });
      
      const key = this.cache.getCacheKey();
      let data = await this.cacheManager.get(key);
      
      if (data) return responseOk({ data });
      
      // Buscar histórico de preços com filtros
      const result = await this.repo.getStationPriceHistory('', parsed);
      
      if (!result.results.length) {
        return responseNotFound({ message: 'Price history not found' });
      }
      
      await this.cacheManager.set(key, result, seconds(300)); // 5 minutes cache
      return responseOk({ data: result });
    } catch (error) {
      return getErrorResponse(error);
    }
  }

  

  async getByStation(stationId: string, query: GasStationPriceHistory) {
    try {
      const key = this.cache.getCacheKey();
      let data = await this.cacheManager.get(key);
      
      if (data) return responseOk({ data });
      
      const result = await this.repo.getPriceHistoryByStation(
        stationId, 
        query.produto, 
        50
      );
      
      if (!result.length) {
        return responseNotFound({ 
          message: 'No price history found for this gas station' 
        });
      }
      
      await this.cacheManager.set(key, result, seconds(300));
      return responseOk({ data: result });
    } catch (error) {
      return getErrorResponse(error);
    }
  }

  async getLatestPrices(stationId: string) {
    try {
      const key = this.cache.getCacheKey();
      let data = await this.cacheManager.get(key);
      
      if (data) return responseOk({ data });
      
      // Buscar últimos preços para GLP, GASOLINA e DIESEL
      const [glp, gasolina, diesel] = await Promise.all([
        this.repo.getPriceHistoryByStation(stationId, 'GLP', 1),
        this.repo.getPriceHistoryByStation(stationId, 'GASOLINA', 1),
        this.repo.getPriceHistoryByStation(stationId, 'DIESEL', 1),
      ]);

      const latestPrices = {
        glp: glp[0] || null,
        gasolina: gasolina[0] || null,
        diesel: diesel[0] || null,
        updatedAt: new Date().toISOString(),
      };
      
      await this.cacheManager.set(key, latestPrices, seconds(180)); // 3 minutes cache
      return responseOk({ data: latestPrices });
    } catch (error) {
      return getErrorResponse(error);
    }
  }

  async getByStationAndProduct(
    stationId: string, 
    productName: string, 
    options: { periodo?: 'semana' | 'mes'; limite?: number } = {}
  ) {
    try {
      const key = this.cache.getCacheKey();
      let data = await this.cacheManager.get(key);
      
      if (data) return responseOk({ data });
      
      // Calcular data de início baseado no período
      const now = new Date();
      const dataInicio = new Date();
      
      switch (options.periodo) {
        case 'semana':
          dataInicio.setDate(now.getDate() - 7);
          break;
        case 'mes':
          dataInicio.setMonth(now.getMonth() - 1);
          break;
        default:
          dataInicio.setMonth(now.getMonth() - 1); // Default: último mês
      }
      
      const filters: PriceHistoryQuerySchema = {
        produto_id: productName,
        dataInicio,
        dataFim: now,
        limite: options.limite || 100,
      };
      
      const result = await this.repo.getStationPriceHistory(stationId, filters);
      
      if (!result.results.length) {
        return responseNotFound({ 
          message: `Sem dados sobre ${productName} nesse periodo` 
        });
      }
    
      
      const response = {
        ...result,
        periodo: options.periodo || 'mes',
        produto: productName,

      };
      
      await this.cacheManager.set(key, response, seconds(300));
      return responseOk({ data: response });
    } catch (error) {
      return getErrorResponse(error);
    }
  }

  
}