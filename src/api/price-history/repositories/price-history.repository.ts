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
   */
  async getLatestPrices(stationId: string): Promise<PriceHistoryEntity[]> {
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
   * Busca histórico de preços por período (reutilizável)
   */
  async getPriceHistory(
    stationId: string,
    startDate: Date,
    endDate: Date,
    productName?: string,
  ): Promise<PriceHistoryEntity[]> {
    const query = this.repository
      .createQueryBuilder('hp')
      .leftJoinAndSelect('hp.product', 'prod')
      .where('hp.gas_station_id = :stationId', { stationId })
      .andWhere('hp.collection_date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('hp.isActive = :isActive', { isActive: true })
      .andWhere('hp.price IS NOT NULL');

    if (productName) {
      query.andWhere('UPPER(prod.name) ILIKE UPPER(:productName)', {
        productName: `%${productName}%`,
      });
    }

    return await query
      .orderBy('hp.collection_date', 'DESC')
      .addOrderBy('prod.name', 'ASC')
      .getMany();
  }

  /**
   * Busca preço anterior para cálculo de variação (reutilizável)
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
      .andWhere('hp.isActive = :isActive', { isActive: true })
      .andWhere('hp.price IS NOT NULL')
      .orderBy('hp.collection_date', 'DESC')
      .limit(1)
      .getOne();
  }
}