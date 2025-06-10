import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GasStationEntity } from '@/database/entity/gas-station.entity';
import {
  SearchGasStationsQuerySchema,
  type GetNearbyStationsSchema,
} from '../schemas/gas-station.schema';
import { PriceHistoryRepository } from '@/api/price-history/repositories/price-history.repository';
import type { NearbyParams } from '../interfaces/gas-station.interface';

@Injectable()
export class GasStationRepository {
  private readonly logger = new Logger(GasStationRepository.name);

  constructor(
    @InjectRepository(GasStationEntity)
    private readonly repo: Repository<GasStationEntity>,
    private readonly priceHistoryRepo: PriceHistoryRepository,
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
        'loc.city',
        'loc.state',
      ])
      .getOne();
  }

  async nearby(params: GetNearbyStationsSchema) {
  const { lat, lng, radius, limit, offset, product } = params;

  const radiusInMeters = radius * 1000;

  const qb = this.repo
    .createQueryBuilder('gs')
    .innerJoin('gs.localization', 'loc')            // uso de inner join para não trazer postos sem localização
    .leftJoin('gs.priceHistory', 'hp')
    .leftJoin('hp.product', 'prod')
    .select([
      'gs.id',
      'gs.taxId',
      'gs.legal_name',
      'gs.trade_name',
      'gs.brand',
      'loc.city',
      'loc.state',
    ])
    // calculate distance
    .addSelect(`
      ST_Distance(
        loc.coordinates::geography,
        ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
      )
    `, 'distance')
    
    .where('gs.isActive = :isActive', { isActive: true })
    // filter in radius distance
    .andWhere(`
      ST_DWithin(
        loc.coordinates::geography,
        ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
        :radiusInMeters
      )
    `)

    .andWhere(product
      ? `UPPER(prod.name) ILIKE UPPER(:product)`
      : '1=1',
      product ? { product: `%${product}%` } : {}
    )

    .groupBy(`
      gs.id,
      gs.taxId,
      gs.legal_name,
      gs.trade_name,
      gs.brand,
      loc.city,
      loc.state,
      loc.coordinates
    `)

    .setParameters({ lat, lng, radiusInMeters });

  const total = await qb.getCount();

  // pagina e ordena por distância
  const rawResults = await qb
    .orderBy('distance', 'ASC')
    .limit(limit)
    .offset(offset)
    .getRawMany();   

  
  const results = rawResults.map(r => ({
    id:        r.gs_id,
    taxId:     r.gs_taxId,
    legal_name:r.gs_legal_name,
    trade_name:r.gs_trade_name,
    brand:     r.gs_brand,
    localization: {
      city:  r.loc_city,
      state: r.loc_state,
    },
    distance: (Number(r.distance) / 1000).toFixed(1),
  }));

  return {
    results,
    total,
    limit,
    offset,
    geo:    { lat, lng },
    radius,
    sortBy: params.sortBy,
  };
}
}
