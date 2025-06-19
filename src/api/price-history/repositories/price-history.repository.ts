import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Not, IsNull, ILike } from 'typeorm';
import { PriceHistoryEntity } from '@/database/entity/price-history.entity';
import { PriceByProductDto } from '../dtos/price-history.dto';

@Injectable()
export class PriceHistoryRepository {
  constructor(
    @InjectRepository(PriceHistoryEntity)
    private readonly repository: Repository<PriceHistoryEntity>,
  ) {}

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
