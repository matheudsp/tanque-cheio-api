import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PriceHistoryRepository } from './repositories/price-history.repository';
import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { CacheRequestService } from '@/common/services/cache-request/cache-request.service';
import { getErrorResponse } from '@/common/utils/lib';
import { responseNotFound, responseOk } from '@/common/utils/response-api';
import { seconds } from '@nestjs/throttler';
import {
  GasStationPriceHistory,
  PriceChartQueryDto,
} from './dtos/price-history.dto';

interface PriceData {
  date: string;
  price: number | null;
  variation?: number;
  variationPercent?: number;
}

interface ProductLatestPrice {
  productId: string;
  productName: string;
  price: number | null;
  date: string;
  variation?: number;
  variationPercent?: number;
  unit: string;
}

interface DashboardData {
  latestPrices: ProductLatestPrice[];
  totalProducts: number;
  lastUpdated: string;
  stationId: string;
}

@Injectable()
export class PriceHistoryService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly cache: CacheRequestService,
    private readonly repo: PriceHistoryRepository,
  ) {}

  /**
   * Dashboard completo do posto com últimos preços e estatísticas básicas
   */
  async getStationDashboard(stationId: string) {
    try {
      const key = this.cache.getCacheKey();
      let data = await this.cacheManager.get<DashboardData>(key);

      if (data) return responseOk({ data });

      const latestPrices =
        await this.repo.getLatestPricesAllProducts(stationId);

      if (!latestPrices.length) {
        return responseNotFound({
          message: 'Nenhum preço encontrado para este posto',
        });
      }

      // Calcular variações de preço
      const enrichedPrices = await Promise.all(
        latestPrices.map(async (current) => {
          const previous = await this.repo.getPreviousPrice(
            stationId,
            current.product.id,
            current.collection_date,
          );

          let variation = 0;
          let variationPercent = 0;

          if (previous && previous.price && current.price) {
            variation = Number(
              (current.price - previous.price).toFixed(3),
            );
            variationPercent = Number(
              ((variation / previous.price) * 100).toFixed(2),
            );
          }

          return {
            productId: current.product.id,
            productName: current.product.name,
            price: current.price,
            date: current.collection_date.toISOString().split('T')[0],
            variation,
            variationPercent,
            unit: current.product.unitOfMeasure || 'L',
          };
        }),
      );

      const dashboardData: DashboardData = {
        latestPrices: enrichedPrices,
        totalProducts: enrichedPrices.length,
        lastUpdated: new Date().toISOString(),
        stationId,
      };

      await this.cacheManager.set(key, dashboardData, seconds(180)); // 3 minutes
      return responseOk({ data: dashboardData });
    } catch (error) {
      return getErrorResponse(error);
    }
  }

  /**
   * Últimos preços simplificados - otimizado para carregamento rápido
   */
  async getLatestPrices(stationId: string) {
    try {
      const key = this.cache.getCacheKey();
      let data = await this.cacheManager.get(key);

      if (data) return responseOk({ data });

      const prices = await this.repo.getLatestPricesAllProducts(stationId);

      if (!prices.length) {
        return responseNotFound({
          message: 'Nenhum preço encontrado',
        });
      }

      // Formato simplificado para resposta rápida
      const simplified = prices.map((p) => ({
        product: p.product.name,
        price: p.price,
        date: p.collection_date.toISOString().split('T')[0],
        unit: p.product.unitOfMeasure || 'L',
      }));

      await this.cacheManager.set(key, simplified, seconds(120)); // 2 minutes
      return responseOk({ data: simplified });
    } catch (error) {
      return getErrorResponse(error);
    }
  }

  /**
   * Dados formatados para gráfico de linha
   */
  async getPriceChart(
    stationId: string,
    productName: string,
    query: PriceChartQueryDto,
  ) {
    try {
      const key = this.cache.getCacheKey();
      let data = await this.cacheManager.get(key);

      if (data) return responseOk({ data });

      const periodo = query.periodo || 'mes';
      const limit = query.limit || 30;

      // Calcular data de início
      const endDate = new Date();
      const startDate = new Date();

      switch (periodo) {
        case 'semana':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'mes':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case 'trimestre':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case 'semestre':
          startDate.setMonth(endDate.getMonth() - 6);
          break;
        case 'ano':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      const history = await this.repo.getPriceHistoryForChart(
        stationId,
        productName,
        startDate,
        endDate,
        limit,
      );

      if (!history.length) {
        return responseNotFound({
          message: `Sem dados para ${productName} no período selecionado`,
        });
      }

      // Formatar dados para gráfico
      const chartData: PriceData[] = history
        .map((item, index) => {
          const previous = history[index + 1];
          let variation = 0;
          let variationPercent = 0;

          if (previous && previous.price && item.price) {
            variation = Number(
              (item.price - previous.price).toFixed(3),
            );
            variationPercent = Number(
              ((variation / previous.price) * 100).toFixed(2),
            );
          }

          return {
            date: item.collection_date.toISOString().split('T')[0],
            price: item.price,
            variation,
            variationPercent,
          };
        })
        .reverse(); // Reverter para ordem cronológica

      const response = {
        product: productName,
        periodo,
        data: chartData,
        stats: {
          min: Math.min(...chartData.map((d) => d.price!)),
          max: Math.max(...chartData.map((d) => d.price!)),
          avg: Number(
            (
              chartData.reduce((sum, d) => sum + d.price!, 0) / chartData.length
            ).toFixed(3),
          ),
          trend: this.calculateTrend(chartData),
        },
      };

      await this.cacheManager.set(key, response, seconds(300)); // 5 minutes
      return responseOk({ data: response });
    } catch (error) {
      return getErrorResponse(error);
    }
  }

  /**
   * Resumo estatístico dos preços
   */
  async getPriceSummary(
    stationId: string,
    periodo: 'semana' | 'mes' | 'trimestre' = 'mes',
  ) {
    try {
      const key = this.cache.getCacheKey();
      let data = await this.cacheManager.get(key);

      if (data) return responseOk({ data });

      const summary = await this.repo.getPriceSummary(stationId, periodo);

      await this.cacheManager.set(key, summary, seconds(600)); // 10 minutes
      return responseOk({ data: summary });
    } catch (error) {
      return getErrorResponse(error);
    }
  }

  /**
   * Análise de tendências
   */
  async getPriceTrends(
    stationId: string,
    periodo: 'mes' | 'trimestre' = 'mes',
  ) {
    try {
      const key = this.cache.getCacheKey();
      let data = await this.cacheManager.get(key);

      if (data) return responseOk({ data });

      const trends = await this.repo.getPriceTrends(stationId, periodo);

      await this.cacheManager.set(key, trends, seconds(900)); // 15 minutes
      return responseOk({ data: trends });
    } catch (error) {
      return getErrorResponse(error);
    }
  }

  /**
   * Histórico detalhado por produto (mantido para compatibilidade)
   */
  async getByStationAndProduct(
    stationId: string,
    productName: string,
    options: GasStationPriceHistory,
  ) {
    try {
      const key = this.cache.getCacheKey();
      let data = await this.cacheManager.get(key);

      if (data) return responseOk({ data });

      const periodo = options.periodo || 'mes';
      const limit = options.limite || 50;

      const now = new Date();
      const startDate = new Date();

      switch (periodo) {
        case 'semana':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'mes':
          startDate.setMonth(now.getMonth() - 1);
          break;
      }

      const history = await this.repo.getPriceHistoryForChart(
        stationId,
        productName,
        startDate,
        now,
        limit,
      );

      if (!history.length) {
        return responseNotFound({
          message: `Sem dados sobre ${productName} nesse período`,
        });
      }

      const response = {
        results: history,
        total: history.length,
        periodo,
        produto: productName,
      };

      await this.cacheManager.set(key, response, seconds(300));
      return responseOk({ data: response });
    } catch (error) {
      return getErrorResponse(error);
    }
  }

  /**
   * Calcula tendência simples dos preços
   */
  private calculateTrend(data: PriceData[]): 'up' | 'down' | 'stable' {
    if (data.length < 2) return 'stable';

    const first = data[0].price;
    const last = data[data.length - 1].price;
    const diff = last! - first!;
    const threshold = first! * 0.02; // 2% threshold

    if (diff > threshold) return 'up';
    if (diff < -threshold) return 'down';
    return 'stable';
  }
}
