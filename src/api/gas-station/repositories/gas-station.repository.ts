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
      .leftJoinAndSelect('gs.localizacao', 'loc')
      .leftJoinAndSelect('gs.historicoPrecos', 'hp')
      .leftJoinAndSelect('hp.produto', 'prod')
      .where('gs.ativo = :ativo', { ativo: true });

    if (filters.municipio) {
      queryBuilder.andWhere('UPPER(loc.municipio) ILIKE UPPER(:municipio)', {
        municipio: `%${filters.municipio}%`,
      });
    }

    if (filters.produto) {
      queryBuilder.andWhere('UPPER(prod.nome) ILIKE UPPER(:produto)', {
        produto: `%${filters.produto}%`,
      });
    }

    if (filters.bandeira) {
      queryBuilder.andWhere('UPPER(gs.bandeira) ILIKE UPPER(:bandeira)', {
        bandeira: `%${filters.bandeira}%`,
      });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Get results with pagination
    const results = await queryBuilder
      .orderBy('gs.nome_razao', 'ASC')
      .addOrderBy('gs.bandeira', 'ASC')
      .limit(filters.limit || 50)
      .offset(filters.offset || 0)
      .getMany();

    return { results, total };
  }

  async findById(id: string): Promise<GasStationEntity | null> {
    return await this.repo
      .createQueryBuilder('gs')
      .leftJoinAndSelect('gs.localizacao', 'loc')
      .leftJoinAndSelect('gs.historicoPrecos', 'hp')
      .leftJoinAndSelect('hp.produto', 'prod')
      .where('gs.id = :id', { id })
      .andWhere('gs.ativo = :ativo', { ativo: true })
      .getOne();
  }

  async findByCnpj(cnpj: string): Promise<GasStationEntity | null> {
    const normalizedCnpj = DataUtils.normalizeCnpj(cnpj);
    return await this.repo
      .createQueryBuilder('gs')
      .leftJoinAndSelect('gs.localizacao', 'loc')
      .where(
        "gs.cnpj = :cnpj OR REPLACE(REPLACE(REPLACE(gs.cnpj, '.', ''), '/', ''), '-', '') = :normalizedCnpj",
        { cnpj, normalizedCnpj },
      )
      .andWhere('gs.ativo = :ativo', { ativo: true })
      .getOne();
  }

  async findByLocalization(
    localizationId: string,
  ): Promise<GasStationEntity[]> {
    return await this.repo
      .createQueryBuilder('gs')
      .leftJoinAndSelect('gs.localizacao', 'loc')
      .where('gs.localizacao_id = :localizacaoId', { localizationId })
      .andWhere('gs.ativo = :ativo', { ativo: true })
      .orderBy('gs.nome_razao', 'ASC')
      .getMany();
  }

  async searchByName(name: string): Promise<GasStationEntity[]> {
    return await this.repo
      .createQueryBuilder('gs')
      .leftJoinAndSelect('gs.localizacao', 'loc')
      .where(
        '(UPPER(gs.nome_razao) ILIKE UPPER(:name) OR UPPER(gs.nome_fantasia) ILIKE UPPER(:name))',
        {
          name: `%${name}%`,
        },
      )
      .andWhere('gs.ativo = :ativo', { ativo: true })
      .orderBy('gs.nome_razao', 'ASC')
      .limit(100)
      .getMany();
  }

  async findNearby(
    latitude: number,
    longitude: number,
    radius: number,
    produto?: string,
    limit = 20,
  ): Promise<GasStationEntity[]> {
    const queryBuilder = this.repo
      .createQueryBuilder('gs')
      .leftJoinAndSelect('gs.localization', 'loc')
      .leftJoinAndSelect('gs.priceHistory', 'hp')
      .leftJoinAndSelect('hp.product', 'prod')
      .where('gs.isActive = :ativo', { ativo: true })
      .andWhere('loc.latitude IS NOT NULL')
      .andWhere('loc.longitude IS NOT NULL')
      .andWhere('loc.latitude != :emptyLat', { emptyLat: '' })
      .andWhere('loc.longitude != :emptyLon', { emptyLon: '' });

    // Filtro por produto se especificado
    if (produto) {
      queryBuilder.andWhere('UPPER(prod.name) ILIKE UPPER(:product)', {
        product: `%${produto}%`,
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
      byState: byState.map(item => ({
        state: item.state,
        total: parseInt(item.total),
      })),
    };
  }
}
