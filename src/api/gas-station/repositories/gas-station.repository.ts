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
      .leftJoinAndSelect('gs.priceHistory', 'hp')
      .leftJoinAndSelect('hp.product', 'prod')
      .where('gs.id = :id', { id })
      .andWhere('gs.isActive = :isActive', { isActive: true })
      .getOne();
  }

  async findByCnpj(taxId: string): Promise<GasStationEntity | null> {
    const normalizedTaxId = DataUtils.normalizeCnpj(taxId);
    return await this.repo
      .createQueryBuilder('gs')
      .leftJoinAndSelect('gs.localization', 'loc')
      .where(
        "gs.taxId = :taxId OR REPLACE(REPLACE(REPLACE(gs.taxId, '.', ''), '/', ''), '-', '') = :normalizedCnpj",
        { taxId, normalizedTaxId },
      )
      .andWhere('gs.isActive = :isActive', { isActive: true })
      .getOne();
  }

  async findByLocalization(
    localizationId: string,
  ): Promise<GasStationEntity[]> {
    return await this.repo
      .createQueryBuilder('gs')
      .leftJoinAndSelect('gs.localization', 'loc')
      .where('gs.isActive_id = :localizationId', { localizationId })
      .andWhere('gs.isActive = :isActive', { isActive: true })
      .orderBy('gs.legal_name', 'ASC')
      .getMany();
  }

  async searchByName(name: string): Promise<GasStationEntity[]> {
    return await this.repo
      .createQueryBuilder('gs')
      .leftJoinAndSelect('gs.localization', 'loc')
      .where(
        '(UPPER(gs.legal_name) ILIKE UPPER(:name) OR UPPER(gs.trade_name) ILIKE UPPER(:name))',
        {
          name: `%${name}%`,
        },
      )
      .andWhere('gs.isActive = :isActive', { isActive: true })
      .orderBy('gs.legal_name', 'ASC')
      .limit(100)
      .getMany();
  }

  async findNearby(
    latitude: number,
    longitude: number,
    radius: number,
    product?: string,
    limit = 20,
  ): Promise<GasStationEntity[]> {
    const queryBuilder = this.repo
      .createQueryBuilder('gs')
      .leftJoinAndSelect('gs.localization', 'loc')
      .leftJoinAndSelect('gs.priceHistory', 'hp')
      .leftJoinAndSelect('hp.product', 'prod')
      .where('gs.isActive = :isActive', { isActive: true })
      .andWhere('loc.latitude IS NOT NULL')
      .andWhere('loc.longitude IS NOT NULL')
      .andWhere('loc.latitude != :emptyLat', { emptyLat: '' })
      .andWhere('loc.longitude != :emptyLon', { emptyLon: '' });

    // Filtro por produto se especificado
    if (product) {
      queryBuilder.andWhere('UPPER(prod.name) ILIKE UPPER(:product)', {
        product: `%${product}%`,
      });
    }

    // Filtro por proximidade usando fórmula de distância
    // Esta é uma aproximação simplificada para testes - para maior precisão, implementarei PostGIS
    queryBuilder.andWhere(
      `(
        6371 * acos(
          cos(radians(:latitude)) * 
          cos(radians(CAST(loc.latitude AS FLOAT))) * 
          cos(radians(CAST(loc.longitude AS FLOAT)) - radians(:longitude)) + 
          sin(radians(:latitude)) * 
          sin(radians(CAST(loc.latitude AS FLOAT)))
        )
      ) <= :radius`,
      { latitude, longitude, radius },
    );

    return await queryBuilder
      .orderBy('gs.legal_name', 'ASC')
      .limit(limit)
      .getMany();
  }
  async getCountStations() {
    const totalStations = await this.repo
      .createQueryBuilder('gs')
      .where('gs.isActive = :ativo', { ativo: true })
      .getCount();

    const byState = await this.repo
      .createQueryBuilder('gs')
      .leftJoin('gs.localization', 'loc')
      .select('loc.state', 'uf')
      .addSelect('COUNT(*)', 'total')
      .where('gs.isActive = :ativo', { ativo: true })
      .groupBy('loc.state')
      .orderBy('total', 'DESC')
      .getRawMany();

    return {
      totalStations,
      byState: byState.map((item) => ({
        state: item.state,
        total: parseInt(item.total),
      })),
    };
  }
}
