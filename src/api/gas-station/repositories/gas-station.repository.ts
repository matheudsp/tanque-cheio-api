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
    const { lat, lng, radius, limit = 10, offset = 0, product, sortBy = 'distanceAsc' } = params;

    const radiusInMeters = radius * 1000;

    let qb = this.repo
      .createQueryBuilder('gs')
      .innerJoin('gs.localization', 'loc')
      .select([
        'gs.id',
        'gs.taxId',
        'gs.legal_name',
        'gs.trade_name',
        'gs.brand',
        'loc.city',
        'loc.state',
      ])
      // Calcula a distância
      .addSelect(`
        ST_Distance(
          loc.coordinates::geography,
          ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
        )
      `, 'distance')
      .where('gs.isActive = :isActive', { isActive: true })
      // Filtra por raio de distância
      .andWhere(`
        ST_DWithin(
          loc.coordinates::geography,
          ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
          :radiusInMeters
        )
      `)
      .setParameters({ lat, lng, radiusInMeters });

    if (product && product.trim()) {
      qb = qb
        .innerJoin('gs.priceHistory', 'hp', 'hp."isActive" = true AND hp.price IS NOT NULL')
        .innerJoin('hp.product', 'prod')
        .andWhere('UPPER(prod.name) ILIKE UPPER(:product)', { 
          product: `%${product.trim()}%` 
        });
    }

    // Agrupa pelos campos necessários
    qb = qb.groupBy(`
      gs.id,
      gs.taxId,
      gs.legal_name,
      gs.trade_name,
      gs.brand,
      loc.city,
      loc.state,
      loc.coordinates
    `);

    // Para ordenação por preço, precisamos incluir o preço na seleção
    if (sortBy === 'priceAsc' || sortBy === 'priceDesc') {
      if (product && product.trim()) {
        // Adiciona o preço mais recente do produto específico para ordenação
        qb = qb
          .addSelect(`
            (
              SELECT hp_latest.price 
              FROM price_history hp_latest
              INNER JOIN product prod_latest ON hp_latest.product_id = prod_latest.id
              WHERE hp_latest.gas_station_id = gs.id 
               
                AND hp_latest.price IS NOT NULL
                AND UPPER(prod_latest.name) ILIKE UPPER(:product)
                AND hp_latest.collection_date = (
                  SELECT MAX(hp_max.collection_date)
                  FROM price_history hp_max
                  INNER JOIN product prod_max ON hp_max.product_id = prod_max.id
                  WHERE hp_max.gas_station_id = gs.id 
                    AND hp_max.product_id = prod_latest.id
                    AND hp_max.price IS NOT NULL
                )
              LIMIT 1
            )
          `, 'latest_price');
      } else {
        this.logger.warn('Ordenação por preço solicitada sem especificar produto. Usando ordenação por distância.');
      }
    }

    const total = await qb.getCount();

    // Aplica ordenação
    switch (sortBy) {
      case 'distanceDesc':
        qb = qb.orderBy('distance', 'DESC');
        break;
      case 'priceAsc':
        if (product && product.trim()) {
          qb = qb.orderBy('latest_price', 'ASC', 'NULLS LAST').addOrderBy('distance', 'ASC');
        } else {
          qb = qb.orderBy('distance', 'ASC');
        }
        break;
      case 'priceDesc':
        if (product && product.trim()) {
          qb = qb.orderBy('latest_price', 'DESC', 'NULLS LAST').addOrderBy('distance', 'ASC');
        } else {
          qb = qb.orderBy('distance', 'ASC');
        }
        break;
      case 'distanceAsc':
      default:
        qb = qb.orderBy('distance', 'ASC');
        break;
    }

    // Aplica paginação
    const rawResults = await qb
      .limit(limit)
      .offset(offset)
      .getRawMany();

    // Mapeia os resultados e busca os preços mais recentes para cada posto
    const results = await Promise.all(
      rawResults.map(async (r) => {
        // Passa o filtro de produto para getLatestPrices quando existe filtro
        const latestPrices = await this.priceHistoryRepo.getLatestPrices(
          r.gs_id, 
          product?.trim() // Passa o filtro de produto
        );
        
        return {
          id: r.gs_id,
          taxId: r.gs_taxId,
          legal_name: r.gs_legal_name,
          trade_name: r.gs_trade_name,
          brand: r.gs_brand,
          localization: {
            city: r.loc_city,
            state: r.loc_state,
          },
          distance: (Number(r.distance) / 1000).toFixed(1),
          fuelPrices: latestPrices, 
          ...(r.latest_price && { filteredProductPrice: Number(r.latest_price).toFixed(2) })
        };
      })
    );

    return {
      results,
      total,
      limit,
      offset,
      geo: { lat, lng },
      radius,
      sortBy,
      productFilter: product?.trim() || null,
    };
  }
}