import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GasStationEntity } from '@/database/entity/gas-station.entity';
import type { SearchGasStationsQuerySchema } from '../schemas/gas-station.schema';
import { DataUtils } from '@/api/data-sync/utils/data-utils';

@Injectable()
export class GasStationRepository {
  constructor(
    @InjectRepository(GasStationEntity)
    private readonly repo: Repository<GasStationEntity>,
  ) {}

  async filter(filters: SearchGasStationsQuerySchema) {
    const queryBuilder = this.repo
      .createQueryBuilder('gs')
      .leftJoinAndSelect('gs.localization', 'loc')
      .leftJoinAndSelect('gs.priceHistory', 'hp')
      .leftJoinAndSelect('hp.product', 'prod')
      .where('gs.isActive = :ativo', { ativo: true })
      .select([
        'gs.id',
        'gs.taxId',
        'gs.legal_name',
        'gs.trade_name',
        'gs.brand',
        'gs.isActive',
        'loc.city',
        'loc.state',
        'loc.latitude',
        'loc.longitude',
      ]);

    if (filters.city) {
      queryBuilder.andWhere('UPPER(loc.city) ILIKE UPPER(:city)', {
        city: `%${filters.city}%`,
      });
    }

    if (filters.product) {
      queryBuilder.andWhere('UPPER(prod.name) ILIKE UPPER(:product)', {
        product: `%${filters.product}%`,
      });
    }

    if (filters.brand) {
      queryBuilder.andWhere('UPPER(gs.brand) ILIKE UPPER(:brand)', {
        brand: `%${filters.brand}%`,
      });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Get results with pagination
    const results = await queryBuilder
      .orderBy('gs.legal_name', 'ASC')
      .addOrderBy('gs.brand', 'ASC')
      .limit(filters.limit || 50)
      .offset(filters.offset || 0)
      .getMany();

    return { results, total };
  }

  async findById(id: string): Promise<GasStationEntity | null> {
    return await this.repo
      .createQueryBuilder('gs')
      .leftJoinAndSelect('gs.localization', 'loc')
      .where('gs.id = :id', { id })
      .andWhere('gs.isActive = :isActive', { isActive: true })
      .select([
        'gs.id',
        'gs.taxId',
        'gs.legal_name',
        'gs.trade_name',
        'gs.brand',
        // 'gs.isActive',
        'loc.city',
        'loc.state',
        'loc.latitude',
        'loc.longitude',
      ])
      .getOne();
  }


}
