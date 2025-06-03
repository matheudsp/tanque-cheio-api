import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, type SelectQueryBuilder } from 'typeorm';
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
   */
  async getLatestPrices(stationId: string): Promise<FuelPriceDto[]> {
    // Monta a subquery para pegar, por produto, a maior collection_date
    const subQuery = (qb: SelectQueryBuilder<PriceHistoryEntity>) => {
      return qb
        .subQuery()
        .select('MAX(hp2.collection_date)')
        .from(PriceHistoryEntity, 'hp2')
        .where('hp2.gas_station_id = hp.gas_station_id')
        .andWhere('hp2.product_id = hp.product_id')
        .andWhere('hp2.isActive = true')
        .andWhere('hp2.price IS NOT NULL')
        .getQuery();
    };

    // Na query principal, selecionamos só os campos que viram FuelPriceDto
    return await this.repository
      .createQueryBuilder('hp')
      .innerJoin('hp.product', 'prod')
      .select([
        'prod.name            AS name',
        'hp.price             AS price',
        'prod.unitOfMeasure   AS unit',
        'hp.collection_date   AS lastUpdated',
      ])
      .where('hp.gas_station_id = :stationId', { stationId })
      .andWhere('hp.isActive = :isActive', { isActive: true })
      .andWhere('hp.price IS NOT NULL')
      .andWhere(
        `hp.collection_date = (${subQuery(this.repository.createQueryBuilder())})`,
      )
      .orderBy('prod.name', 'ASC')
      .getRawMany<FuelPriceDto>();
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
    const qb = this.repository
      .createQueryBuilder('hp')
      .innerJoin('hp.product', 'prod')
      // monta a condição de data e ativo:
      .where('hp.gas_station_id = :stationId', { stationId })
      .andWhere('hp.collection_date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('hp.isActive = :isActive', { isActive: true })
      .andWhere('hp.price IS NOT NULL');

    if (productNameFilter) {
      qb.andWhere('UPPER(prod.name) ILIKE UPPER(:productName)', {
        productName: `%${productNameFilter}%`,
      });
    }

    // Seleciona o nome do produto e agrega todos os campos de preço em JSON
    return qb
      .select('prod.name', 'productName')
      .addSelect(
        `
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', hp.id,
            'productId', prod.id,
            'productName', prod.name,
            'price', hp.price,
            'date', TO_CHAR(hp.collection_date, 'YYYY-MM-DD'),
            'unit', prod."unitOfMeasure"
          )
          ORDER BY hp.collection_date DESC
        )`,
        'prices',
      )
      .groupBy('prod.name')
      .orderBy('prod.name', 'ASC')
      .getRawMany<PriceByProductDto>();
  }
}
