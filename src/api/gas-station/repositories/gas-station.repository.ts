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
    const {
      lat,
      lng,
      radius,
      limit = 20,
      offset = 0,
      product,
      sort = 'distanceAsc',
    } = params;

    const radiusInMeters = radius * 1000;

    let qb = this.repo
      .createQueryBuilder('gs')
      .innerJoin('gs.localization', 'loc')
      .where('gs.is_active = :isActive', { isActive: true })
      .andWhere(
        'ST_DWithin(loc.coordinates::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radiusInMeters)',
      );

    const priceSubQuery = `(
        SELECT ph.price
        FROM price_history ph
        INNER JOIN product p ON p.id = ph.product_id
        WHERE ph.gas_station_id = gs.id
          AND p.name ILIKE :product
          AND ph.is_active = true
        ORDER BY ph.collection_date DESC
        LIMIT 1
      )`;

    qb.select('gs.id', 'id').addSelect(
      'ST_Distance(loc.coordinates::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography)',
      'distance',
    );

    if (sort === 'priceAsc' && product) {
      qb.orderBy(priceSubQuery, 'ASC', 'NULLS LAST');
    } else if (sort === 'priceDesc' && product) {
      qb.orderBy(priceSubQuery, 'DESC', 'NULLS LAST');
    } else if (sort === 'distanceDesc') {
      qb.orderBy('distance', 'DESC');
    }
    qb.addOrderBy('distance', 'ASC');

    qb.setParameters({ lat, lng, radiusInMeters, product: product || '' });

    const total = await qb.getCount();
    const stationIds = (await qb.limit(limit).offset(offset).getRawMany()).map(
      (s) => s.id,
    );

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

    const stationsQuery = `
      WITH LatestPrices AS (
        SELECT
          ph.gas_station_id,
          p.name,
          ph.price,
          ROW_NUMBER() OVER(PARTITION BY ph.gas_station_id, p.id ORDER BY ph.collection_date DESC) as rn
        FROM price_history ph
        INNER JOIN product p ON p.id = ph.product_id
        WHERE ph.gas_station_id = ANY($1) AND ph.is_active = true
      )
      SELECT
        gs.id,
        gs.legal_name,
        gs.trade_name,
        gs.brand,
        gs.tax_id,
        json_build_object(
            'state', loc.state,
            'city', loc.city,
            'address', loc.address,
            'number', loc.number,
            'neighborhood', loc.neighborhood,
            'zip_code', loc.zip_code,
            'coordinates', ST_AsGeoJSON(loc.coordinates)::json
        ) as localization,
        ST_Distance(loc.coordinates::geography, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography) as distance,
        json_agg(json_build_object('product', lp.name, 'price', lp.price)) FILTER (WHERE lp.name IS NOT NULL) as "fuel_prices"
      FROM gas_station gs
      INNER JOIN localization loc ON gs.localization_id = loc.id
      LEFT JOIN LatestPrices lp ON gs.id = lp.gas_station_id AND lp.rn = 1
      WHERE gs.id = ANY($1)
      GROUP BY gs.id, loc.id
    `;

    const rawResults = await this.repo.manager.query(stationsQuery, [
      stationIds,
      lng,
      lat,
    ]);

    const orderMap = new Map(stationIds.map((id, index) => [id, index]));

    const results = rawResults
      .map((r) => ({
        id: r.id,
        legal_name: r.legal_name,
        trade_name: r.trade_name,
        brand: r.brand,
        tax_id: r.tax_id,
        localization: r.localization,
        distance: parseFloat((Number(r.distance) / 1000).toFixed(1)),
        fuel_prices: r.fuel_prices || [],
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
