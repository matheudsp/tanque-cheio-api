import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Not, IsNull, ILike } from 'typeorm';
import { PriceHistoryEntity } from '@/database/entity/price-history.entity';
import { PriceByProductDto } from '../dtos/price-history.dto';
import type { FuelPriceProduct } from '../interfaces/fuel-prices.interface';

@Injectable()
export class PriceHistoryRepository {
  constructor(
    @InjectRepository(PriceHistoryEntity)
    private readonly repository: Repository<PriceHistoryEntity>,
  ) {}

  /**
   * Encontra os dois registros de preço mais recentes para um produto em um posto específico.
   * @returns Uma tupla com [preço_mais_recente, preço_anterior] ou um array vazio/parcial se não houver registros suficientes.
   */
  async findTwoMostRecentPrices(
    station_id: string,
    product_id: string,
  ): Promise<[PriceHistoryEntity?, PriceHistoryEntity?]> {
    try {
      const prices = await this.repository.find({
        where: {
          gas_station: { id: station_id },
          product: { id: product_id },
        },
        order: { collection_date: 'DESC' },
        take: 2,
      });
      return [prices[0], prices[1]];
    } catch (error) {
      throw error;
    }
  }

  async getLatestPricesForMultipleStations(
    stationIds: string[],
  ): Promise<Map<string, FuelPriceProduct[]>> {
    if (!stationIds || stationIds.length === 0) {
      return new Map();
    }

    const query = `
    WITH RankedPrices AS (
      SELECT
        ph.gas_station_id,
        p.id AS product_id,
        p.name AS product_name,
        p.unit_of_measure,
        ph.price,
        ph.collection_date,
        ROW_NUMBER() OVER(PARTITION BY ph.gas_station_id, p.id ORDER BY ph.collection_date DESC) as rn,
        LAG(ph.price) OVER(PARTITION BY ph.gas_station_id, p.id ORDER BY ph.collection_date DESC) AS previous_price
      FROM price_history ph
      INNER JOIN product p ON p.id = ph.product_id
      WHERE ph.gas_station_id = ANY($1) AND ph.is_active = true
    ),
    FinalPrices AS (
      SELECT * FROM RankedPrices WHERE rn = 1
    )
    SELECT
      gas_station_id,
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'product_id', product_id,
          'product_name', product_name,
          'unit_of_measure', unit_of_measure,
          'price', price::text,
          'collection_date', TO_CHAR(collection_date, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
          'percentage_change',
            CASE
              WHEN previous_price IS NOT NULL AND previous_price > 0 THEN
                ROUND(((price - previous_price) / previous_price * 100)::numeric, 2)
              ELSE NULL
            END,
          'trend',
            CASE
              WHEN previous_price IS NULL THEN NULL
              WHEN price > previous_price THEN 'UP'
              WHEN price < previous_price THEN 'DOWN'
              ELSE 'STABLE'
            END
        ) ORDER BY product_name
      ) AS prices
    FROM FinalPrices
    GROUP BY gas_station_id
    ORDER BY gas_station_id;
  `;

    const rows = await this.repository.manager.query(query, [stationIds]);

    const resultMap = new Map<string, FuelPriceProduct[]>();
    for (const row of rows) {
      resultMap.set(row.gas_station_id, row.prices);
    }
    return resultMap;
  }

  /**
   * Busca os preços mais recentes de todos os produtos do posto.
   * @param stationId ID do posto de combustível
   * @param productFilter Filtro opcional para buscar apenas um produto específico
   */
  async getLatestPrices(station_id: string, product_name?: string) {
    // A subquery busca os IDs dos 2 registros mais recentes para cada produto.

    const qb = this.repository
      .createQueryBuilder('hp')
      .innerJoinAndSelect('hp.product', 'prod')
      .where('hp.gas_station_id = :station_id', { station_id })
      .andWhere('hp.is_active = true')
      .andWhere('hp.price IS NOT NULL')
      .where((subQb) => {
        const subQuery = subQb
          .subQuery()
          .select('sub.id')
          .from(PriceHistoryEntity, 'sub')
          .where('sub.product_id = hp.product_id')
          .andWhere('sub.gas_station_id = :station_id', { station_id })
          .orderBy('sub.collection_date', 'DESC')
          .limit(2)
          .getQuery();
        return `hp.id IN ${subQuery}`;
      });

    if (product_name && product_name.trim()) {
      qb.andWhere('prod.name ILIKE :product_name', {
        product_name: `%${product_name.trim()}%`,
      });
    }

    qb.orderBy('prod.name', 'ASC').addOrderBy('hp.collection_date', 'DESC');

    const allPrices = await qb.getMany();

    const pricesByProduct = new Map<string, PriceHistoryEntity[]>();
    for (const price of allPrices) {
      const existing = pricesByProduct.get(price.product.id) || [];
      existing.push(price);
      pricesByProduct.set(price.product.id, existing);
    }

    const latestPrices = Array.from(pricesByProduct.values()).map((prices) => {
      const [latestPrice, previousPrice] = prices; // Ordenação da query garante a ordem [recente, anterior]

      return {
        product_id: latestPrice.product.id,
        product_name: latestPrice.product.name,
        price: latestPrice.price,
        unit_of_measure: latestPrice.product.unit_of_measure,
        collection_date: latestPrice.collection_date,

        percentage_change:
          latestPrice.getPriceVariationPercentage(previousPrice),
        trend: latestPrice.getTrend(previousPrice),
      };
    });

    return latestPrices;
  }

  /**
   * Busca o histórico de preços por período, agrupado por produto.
   */
  async getPriceHistoryGrouped(
    station_id: string,
    start_date: Date,
    end_date: Date,
    product_name?: string,
  ): Promise<PriceByProductDto[]> {
    const whereConditions: any = {
      gas_station: { id: station_id },
      collection_date: Between(start_date, end_date),
      is_active: true,
      price: Not(IsNull()),
    };

    if (product_name) {
      whereConditions.product = {
        name: ILike(`%${product_name}%`),
      };
    }

    const priceHistories = await this.repository.find({
      where: whereConditions,
      relations: ['product'],
      order: {
        product: { name: 'ASC' },
        collection_date: 'ASC',
      },
    });

    if (priceHistories.length === 0) {
      return [];
    }

    // Agrupamento dos resultados por nome do produto
    const groupedByProduct = new Map<string, PriceHistoryEntity[]>();
    for (const history of priceHistories) {
      const productNameKey = history.product.name;
      if (!groupedByProduct.has(productNameKey)) {
        groupedByProduct.set(productNameKey, []);
      }
      groupedByProduct.get(productNameKey)!.push(history);
    }

    const result: PriceByProductDto[] = [];
    for (const [productNameKey, histories] of groupedByProduct.entries()) {
      const prices = histories
        .map((current, index, array) => {
          const previous = index > 0 ? array[index - 1] : undefined;
          return {
            id: current.id,
            product_id: current.product.id,
            product_name: current.product.name,
            price: current.price,
            collection_date: current.collection_date.toString(),
            unit_of_measure: current.product.unit_of_measure,
            percentage_change: current.getPriceVariationPercentage(previous),
            trend: current.getTrend(previous),
          };
        })
        .reverse(); // Inverte para ter os mais recentes primeiro na resposta

      result.push({
        product_name: productNameKey,
        prices,
      });
    }

    return result;
  }
}
