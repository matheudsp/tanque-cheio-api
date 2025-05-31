import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PriceHistoryEntity } from '@/database/entity/price-history.entity';

@Injectable()
export class PriceHistoryRepository {
  constructor(
    @InjectRepository(PriceHistoryEntity)
    private readonly repository: Repository<PriceHistoryEntity>,
  ) {}

  /**
   * Busca os últimos preços de todos os produtos do posto
   * Otimizado para dashboard
   */
  async getLatestPricesAllProducts(
    stationId: string,
  ): Promise<PriceHistoryEntity[]> {
    return await this.repository
      .createQueryBuilder('hp')
      .leftJoinAndSelect('hp.product', 'prod')
      .where('hp.gas_station_id = :stationId', { stationId })
      .andWhere('hp.isActive = :isActive', { isActive: true })
      .andWhere('hp.price IS NOT NULL')
      .andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('MAX(hp2.collection_date)')
          .from(PriceHistoryEntity, 'hp2')
          .where('hp2.gas_station_id = hp.gas_station_id')
          .andWhere('hp2.product_id = hp.product_id')
          .andWhere('hp2.isActive = true')
          .andWhere('hp2.price IS NOT NULL')
          .getQuery();
        return `hp.collection_date = (${subQuery})`;
      })
      .orderBy('prod.name', 'ASC')
      .getMany();
  }

  /**
   * Busca preço anterior para cálculo de variação
   */
  async getPreviousPrice(
    stationId: string,
    productId: string,
    currentDate: Date,
  ): Promise<PriceHistoryEntity | null> {
    return await this.repository
      .createQueryBuilder('hp')
      .where('hp.gas_station_id = :stationId', { stationId })
      .andWhere('hp.product_id = :productId', { productId })
      .andWhere('hp.collection_date < :currentDate', { currentDate })
      .andWhere('hp.isActive = :ativo', { ativo: true })
      .andWhere('hp.price IS NOT NULL')
      .orderBy('hp.collection_date', 'DESC')
      .limit(1)
      .getOne();
  }

  /**
   * Busca histórico otimizado para gráficos
   */
  async getPriceHistoryForChart(
    stationId: string,
    productName: string,
    startDate: Date,
    endDate: Date,
    limit: number = 30,
  ): Promise<PriceHistoryEntity[]> {
    return await this.repository
      .createQueryBuilder('hp')
      .leftJoinAndSelect('hp.product', 'prod')
      .where('hp.gas_station_id = :stationId', { stationId })
      .andWhere('UPPER(prod.name) ILIKE UPPER(:productName)', {
        productName: `%${productName}%`,
      })
      .andWhere('hp.collection_date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('hp.isActive = :ativo', { ativo: true })
      .andWhere('hp.price IS NOT NULL')
      .orderBy('hp.collection_date', 'DESC')
      .limit(limit)
      .getMany();
  }

  /**
   * Resumo estatístico dos preços por período
   */
  async getPriceSummary(
    stationId: string,
    periodo: 'semana' | 'mes' | 'trimestre',
  ) {
    const now = new Date();
    const startDate = new Date();

    switch (periodo) {
      case 'semana':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'mes':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'trimestre':
        startDate.setMonth(now.getMonth() - 3);
        break;
    }

    const query = await this.repository
      .createQueryBuilder('hp')
      .leftJoin('hp.product', 'prod')
      .select([
        'prod.name as product_name',
        'COUNT(*) as total_registros',
        'MIN(hp.price) as min_price',
        'MAX(hp.price) as max_price',
        'AVG(hp.price) as med_pricce',
        'STDDEV(hp.price) as standard_deviation',
      ])
      .where('hp.gas_station_id = :stationId', { stationId })
      .andWhere('hp.collection_date >= :startDate', {
        startDate,
      })
      .andWhere('hp.isActive = :isActive', { ativo: true })
      .andWhere('hp.price IS NOT NULL')
      .groupBy('prod.id, prod.name')
      .orderBy('prod.name', 'ASC')
      .getRawMany();

    return {
      periodo,
      resumo: query.map((item) => ({
        produto: item.produto_nome,
        totalRegistros: parseInt(item.total_registros),
        precoMinimo: parseFloat(item.preco_minimo),
        precoMaximo: parseFloat(item.preco_maximo),
        precoMedio: parseFloat(parseFloat(item.preco_medio).toFixed(3)),
        desvioPadrao: item.desvio_padrao
          ? parseFloat(parseFloat(item.desvio_padrao).toFixed(3))
          : 0,
        volatilidade:
          item.desvio_padrao && item.preco_medio
            ? parseFloat(
                (
                  (parseFloat(item.desvio_padrao) /
                    parseFloat(item.preco_medio)) *
                  100
                ).toFixed(2),
              )
            : 0,
      })),
    };
  }

  /**
   * Análise de tendências de preço
   */
  async getPriceTrends(stationId: string, periodo: 'mes' | 'trimestre') {
    const now = new Date();
    const startDate = new Date();

    switch (periodo) {
      case 'mes':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'trimestre':
        startDate.setMonth(now.getMonth() - 3);
        break;
    }

    // Buscar preços agrupados por semana
    const weeklyPrices = await this.repository
      .createQueryBuilder('hp')
      .leftJoin('hp.produto', 'prod')
      .select([
        'prod.name as product_name',
        "DATE_TRUNC('week', hp.collection_date) as week",
        'AVG(hp.price) as med_price_weekly',
      ])
      .where('hp.gas_station_id = :stationId', { stationId })
      .andWhere('hp.collection_date >= :startDate ', {
        startDate,
      })
      .andWhere('hp.isActive = :ativo', { ativo: true })
      .andWhere('hp.price IS NOT NULL')
      .groupBy("prod.id, prod.name, DATE_TRUNC('week', hp.collection_date)")
      .orderBy('prod.name', 'ASC')
      .addOrderBy('week', 'ASC')
      .getRawMany();

    // Agrupar por produto e calcular tendência
    const trendsByProduct = weeklyPrices.reduce((acc, item) => {
      const produto = item.produto_nome;
      if (!acc[produto]) {
        acc[produto] = [];
      }
      acc[produto].push({
        semana: item.semana,
        preco: parseFloat(item.preco_medio_semanal),
      });
      return acc;
    }, {});

    const trends = Object.entries(trendsByProduct).map(
      ([produto, prices]: [string, any[]]) => {
        if (prices.length < 2) {
          return {
            produto,
            tendencia: 'estavel',
            variacao: 0,
            variacao_percentual: 0,
          };
        }

        const primeiro = prices[0].preco;
        const ultimo = prices[prices.length - 1].preco;
        const variacao = ultimo - primeiro;
        const variacaoPercentual = (variacao / primeiro) * 100;

        let tendencia = 'estavel';
        if (Math.abs(variacaoPercentual) > 2) {
          tendencia = variacaoPercentual > 0 ? 'alta' : 'baixa';
        }

        return {
          produto,
          tendencia,
          variacao: parseFloat(variacao.toFixed(3)),
          variacao_percentual: parseFloat(variacaoPercentual.toFixed(2)),
          historico_semanal: prices,
        };
      },
    );

    return {
      periodo,
      tendencias: trends,
    };
  }

  /**
   * Método legado mantido para compatibilidade
   */
  async getPriceHistoryByStation(
    stationId: string,
    produto?: string,
    limit = 50,
  ): Promise<PriceHistoryEntity[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('hp')
      .leftJoinAndSelect('hp.product', 'prod')
      .where('hp.gas_station_id = :stationId', { stationId })
      .andWhere('hp.isActive = :ativo', { ativo: true })
      .andWhere('hp.price IS NOT NULL');

    if (produto) {
      queryBuilder.andWhere('UPPER(prod.name) ILIKE UPPER(:product)', {
        product: `%${produto}%`,
      });
    }

    return await queryBuilder
      .orderBy('hp.collection_date', 'DESC')
      .addOrderBy('prod.name', 'ASC')
      .limit(limit)
      .getMany();
  }
}
