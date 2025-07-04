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
      .leftJoinAndSelect('gs.price_history', 'hp')
      .leftJoinAndSelect('hp.product', 'prod')
      .where('gs.is_active = :ativo', { ativo: true })
      .select([
        'gs.id',
        'gs.tax_id',
        'gs.legal_name',
        'gs.trade_name',
        'gs.brand',
        'gs.is_active',
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
      .andWhere('gs.is_active = :isActive', { isActive: true })
      .select([
        'gs.id',
        'gs.tax_id',
        'gs.legal_name',
        'gs.trade_name',
        'gs.brand',
        'loc.address',
        'loc.neighborhood',
        'loc.number',
        'loc.zip_code',
        'loc.city',
        'loc.state',
        'loc.coordinates',
      ])
      .getOne();
  }

  async nearby(params: GetNearbyStationsSchema) {
    const { lat, lng, radius, limit = 20, offset = 0, product, sort } = params;

    const radiusInMeters = radius * 1000;
    const basePoint = `ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography`;

    let qb = this.repo
      .createQueryBuilder('gs')
      .innerJoin('gs.localization', 'loc')
      .where('gs.is_active = :isActive', { isActive: true })
      .andWhere(
        `ST_DWithin(loc.coordinates::geography, ${basePoint}, :radiusInMeters)`,
      );

    if (product) {
      qb.andWhere(
        `EXISTS (
        SELECT 1 FROM price_history ph
        INNER JOIN product p ON p.id = ph.product_id
        WHERE ph.gas_station_id = gs.id
        AND p.name ILIKE :product
        AND ph.is_active = true
      )`,
      );
    }

    qb.select([
      'gs.id AS id',
      `ST_Distance(loc.coordinates::geography, ${basePoint}) AS distance`,
    ]);

    const priceSubQuery = product
      ? `(SELECT ph.price FROM price_history ph 
        INNER JOIN product p ON p.id = ph.product_id 
        WHERE ph.gas_station_id = gs.id 
        AND p.name ILIKE :product 
        AND ph.is_active = true 
        ORDER BY ph.collection_date DESC 
        LIMIT 1)`
      : null;

    if (product && sort === 'priceAsc') {
      qb.orderBy(`${priceSubQuery}`, 'ASC', 'NULLS LAST');
    } else if (product && sort === 'priceDesc') {
      qb.orderBy(`${priceSubQuery}`, 'DESC', 'NULLS LAST');
    } else if (sort === 'distanceDesc') {
      qb.orderBy('distance', 'DESC');
    } else {
      qb.orderBy('distance', 'ASC'); // somente se não for distanceDesc
    }

    qb.setParameters({
      lat,
      lng,
      radiusInMeters,
      product: `%${product || ''}%`,
    });

    const [paginatedStations, total] = await Promise.all([
      qb.limit(limit).offset(offset).getRawMany(),
      qb.getCount(),
    ]);

    const stationIds = paginatedStations.map((s) => s.id);

    if (stationIds.length === 0) {
      return {
        results: [],
        total,
        limit,
        offset,
        geo: [{ lat, long: lng }],
        radius,
        sort,
        product: product?.trim() || null,
      };
    }

    const [stationsDetails, fuelPricesMap] = await Promise.all([
      this.repo
        .createQueryBuilder('gs')
        .innerJoinAndSelect('gs.localization', 'loc')
        .where('gs.id IN (:...stationIds)', { stationIds })
        .getMany(),
      this.priceHistoryRepo.getLatestPricesForMultipleStations(stationIds),
    ]);

    const distanceMap = new Map(
      paginatedStations.map((s) => [s.id, s.distance]),
    );
    const orderMap = new Map(stationIds.map((id, idx) => [id, idx]));

    const results = stationsDetails
      .map((station) => ({
        id: station.id,
        legal_name: station.legal_name,
        trade_name: station.trade_name,
        brand: station.brand,
        tax_id: station.tax_id,
        localization: {
          state: station.localization.state,
          city: station.localization.city,
          address: station.localization.address,
          number: station.localization.number,
          neighborhood: station.localization.neighborhood,
          zip_code: station.localization.zip_code,
          coordinates: station.localization.coordinates,
        },
        distance: parseFloat(
          (Number(distanceMap.get(station.id)) / 1000).toFixed(1),
        ),
        fuel_prices: fuelPricesMap.get(station.id) || [],
      }))
      .sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

    return {
      results,
      total,
      limit,
      offset,
      geo: [{ lat, long: lng }],
      radius,
      sort,
      product: product?.trim() || null,
    };
  }
}
