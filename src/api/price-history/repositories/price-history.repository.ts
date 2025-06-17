import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PriceHistoryEntity } from '@/database/entity/price-history.entity';
import type {
  FuelPriceDto,
  PriceByProductDto,
} from '../dtos/price-history.dto';

@Injectable()
export class PriceHistoryRepository {
  constructor(
    @InjectRepository(PriceHistoryEntity)
    private readonly repository: Repository<PriceHistoryEntity>,
  ) {}

  /**
   * Busca os últimos preços de todos os produtos do posto
   * @param stationId ID do posto de combustível
   * @param productFilter Filtro opcional para buscar apenas um produto específico
   */
  async getLatestPrices(
    stationId: string,
    productFilter?: string,
  ): Promise<FuelPriceDto[]> {
    const cteQuery = this.repository
      .createQueryBuilder('hp')
      .select([
        'hp.price AS price',
        'hp.collection_date AS "lastUpdated"',
        'prod.name AS name',
        'prod."unitOfMeasure" AS unit',
        // https://learn.microsoft.com/pt-br/sql/t-sql/functions/lag-transact-sql?view=sql-server-ver17#:~:text=LAG%20fornece%20acesso%20a%20uma,valores%20em%20uma%20linha%20anterior.
        // Usa LAG para pegar o preço anterior para o mesmo produto
        'LAG(hp.price, 1) OVER (PARTITION BY hp.product_id ORDER BY hp.collection_date ASC) as "previousPrice"',
        // Enumera os registros do mais novo para o mais antigo para cada produto
        'ROW_NUMBER() OVER (PARTITION BY hp.product_id ORDER BY hp.collection_date DESC) as rn',
      ])
      .innerJoin('hp.product', 'prod')
      .where('hp.gas_station_id = :stationId', { stationId })
      .andWhere('hp.isActive = true')
      .andWhere('hp.price IS NOT NULL');

    if (productFilter && productFilter.trim()) {
      cteQuery.andWhere('UPPER(prod.name) ILIKE UPPER(:productFilter)', {
        productFilter: `%${productFilter.trim()}%`,
      });
    }

    const qb = this.repository.manager.connection
      .createQueryBuilder()
      .addCommonTableExpression(cteQuery, 'ranked_prices')
      .select([
        'rp.name AS name',
        'rp.price AS price',
        'rp.unit AS unit',
        `TO_CHAR(rp."lastUpdated", 'YYYY-MM-DD') AS "lastUpdated"`,
        // Calcula a variação percentual
        `CASE
          WHEN rp."previousPrice" IS NOT NULL AND rp."previousPrice" > 0 THEN
            ROUND(((rp.price - rp."previousPrice") / rp."previousPrice" * 100.0)::numeric, 2)
          ELSE NULL
        END AS "percentageChange"`,
        // Define a tendência
        `CASE
          WHEN rp."previousPrice" IS NULL THEN NULL
          WHEN rp.price > rp."previousPrice" THEN 'UP'
          WHEN rp.price < rp."previousPrice" THEN 'DOWN'
          ELSE 'STABLE'
        END AS trend`,
      ])
      .from('ranked_prices', 'rp')
      .where('rp.rn = 1') // Filtra apenas o preço mais recente de cada produto
      .orderBy('rp.name', 'ASC');

    return await qb.getRawMany<FuelPriceDto>();
  }

  /**
   * Busca histórico de preços por período
   */
  async getPriceHistoryGrouped(
    stationId: string,
    startDate: Date,
    endDate: Date,
    productNameFilter?: string,
  ): Promise<PriceByProductDto[]> {
    
    const cteQuery = this.repository
      .createQueryBuilder('hp')
      .select([
        'hp.*', 
        'prod.id AS "productId"',
        'prod.name AS "productName"',
        'prod."unitOfMeasure" AS unit',
        // https://learn.microsoft.com/pt-br/sql/t-sql/functions/lag-transact-sql?view=sql-server-ver17#:~:text=LAG%20fornece%20acesso%20a%20uma,valores%20em%20uma%20linha%20anterior.
        // Usa LAG para pegar o preço anterior para o mesmo produto
        'LAG(hp.price, 1) OVER (PARTITION BY hp.product_id ORDER BY hp.collection_date ASC) as "previousPrice"',
      ])
      .innerJoin('hp.product', 'prod')
      .where('hp.gas_station_id = :stationId', { stationId })
      .andWhere('hp.collection_date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('hp.isActive = :isActive', { isActive: true })
      .andWhere('hp.price IS NOT NULL');

    if (productNameFilter) {
      cteQuery.andWhere('UPPER(prod.name) ILIKE UPPER(:productName)', {
        productName: `%${productNameFilter}%`,
      });
    }

    
    const qb = this.repository.manager.connection
      .createQueryBuilder()
      .addCommonTableExpression(cteQuery, 'prices_with_previous')
      .select('p."productName"', 'productName')
      .addSelect(
        `JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', p.id,
            'productId', p."productId",
            'productName', p."productName",
            'price', p.price,
            'date', TO_CHAR(p.collection_date, 'YYYY-MM-DD'),
            'unit', p.unit,
            'percentageChange', CASE 
                                  WHEN p."previousPrice" IS NOT NULL AND p."previousPrice" > 0 THEN
                                    ROUND(((p.price - p."previousPrice") / p."previousPrice" * 100.0)::numeric, 2)
                                  ELSE NULL 
                                END,
            'trend',            CASE 
                                  WHEN p."previousPrice" IS NULL THEN NULL
                                  WHEN p.price > p."previousPrice" THEN 'UP'
                                  WHEN p.price < p."previousPrice" THEN 'DOWN'
                                  ELSE 'STABLE'
                                END
          )
          ORDER BY p.collection_date DESC
        )`,
        'prices',
      )
      .from('prices_with_previous', 'p')
      .groupBy('p."productName"')
      .orderBy('p."productName"', 'ASC');

    return await qb.getRawMany<PriceByProductDto>();
  }
}
