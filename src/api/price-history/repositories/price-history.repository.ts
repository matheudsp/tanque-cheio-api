import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PriceHistoryEntity } from '@/database/entity/price-history.entity';
import type { PriceHistoryQuerySchema } from '../schemas/price-history.schema';

@Injectable()
export class PriceHistoryRepository {
  constructor(
    @InjectRepository(PriceHistoryEntity)
    private readonly repository: Repository<PriceHistoryEntity>,
  ) {}


  /**
   * Find price history by station ID - simplified method
   */
  async getPriceHistoryByStation(
    stationId: string,
    produto?: string,
    limit = 50,
  ): Promise<PriceHistoryEntity[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('hp')
      .leftJoinAndSelect('hp.produto', 'prod')
      .leftJoinAndSelect('hp.posto', 'gs')
      .where('hp.posto_id = :stationId', { stationId })
      .andWhere('hp.ativo = :ativo', { ativo: true })
      .andWhere('hp.preco_venda IS NOT NULL');

    if (produto) {
      queryBuilder.andWhere('UPPER(prod.nome) ILIKE UPPER(:produto)', {
        produto: `%${produto}%`,
      });
    }

    return await queryBuilder
      .orderBy('hp.data_coleta', 'DESC')
      .addOrderBy('prod.nome', 'ASC')
      .limit(limit)
      .getMany();
  }

  /**
   * Get station price history with full filtering - best method
   */
  async getStationPriceHistory(
    stationId: string,
    filters: PriceHistoryQuerySchema,
  ) {
    const queryBuilder = this.repository
      .createQueryBuilder('hp')
      .leftJoinAndSelect('hp.produto', 'prod')
      .leftJoinAndSelect('hp.posto', 'gs')
      .where('hp.posto_id = :stationId', { stationId })
      .andWhere('hp.ativo = :ativo', { ativo: true })
      .andWhere('hp.preco_venda IS NOT NULL');

    if (filters.produto_id) {
      queryBuilder.andWhere('UPPER(prod.nome) ILIKE UPPER(:produto)', {
        produto: `%${filters.produto_id}%`,
      });
    }

    if (filters.dataInicio) {
      queryBuilder.andWhere('hp.data_coleta >= :startDate', {
        startDate: filters.dataInicio,
      });
    }

    if (filters.dataFim) {
      queryBuilder.andWhere('hp.data_coleta <= :endDate', {
        endDate: filters.dataFim,
      });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Get results with pagination
    const results = await queryBuilder
      .orderBy('hp.data_coleta', 'DESC')
      .addOrderBy('prod.nome', 'ASC')
      .limit(filters.limite || 100)
      .getMany();

    return { results, total };
  }
}
