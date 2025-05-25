import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GasStation } from '@/database/entity/gas-station.entity';
import { 
  responseOk, 
  responseInternalServerError,
  responseBadRequest 
} from '@/common/utils/response-api';
import { SearchFilters, SearchResult, StatisticsResult } from './interfaces/gas-station.interface';


@Injectable()
export class CollectorService {
  private readonly logger = new Logger(CollectorService.name);

  constructor(
    @InjectRepository(GasStation)
    private readonly gasStationRepository: Repository<GasStation>,
  ) {}

 
  async searchGasStations(filters: SearchFilters) {
    try {
      const queryBuilder = this.gasStationRepository.createQueryBuilder('gs');

      // Aplicar filtros
      if (filters.uf) {
        queryBuilder.andWhere('UPPER(gs.uf) = UPPER(:uf)', { uf: filters.uf });
      }

      if (filters.municipio) {
        queryBuilder.andWhere('UPPER(gs.municipio) ILIKE UPPER(:municipio)', { 
          municipio: `%${filters.municipio}%` 
        });
      }

      if (filters.produto) {
        queryBuilder.andWhere('UPPER(gs.produto) ILIKE UPPER(:produto)', { 
          produto: `%${filters.produto}%` 
        });
      }

      if (filters.bandeira) {
        queryBuilder.andWhere('UPPER(gs.bandeira) ILIKE UPPER(:bandeira)', { 
          bandeira: `%${filters.bandeira}%` 
        });
      }

      // Contagem total
      const total = await queryBuilder.getCount();

      // Aplicar paginação e ordenação
      const results = await queryBuilder
        .orderBy('gs.data_coleta', 'DESC')
        .addOrderBy('gs.municipio', 'ASC')
        .limit(filters.limit || 50)
        .offset(filters.offset || 0)
        .getMany();

      const searchResult: SearchResult = {
        results,
        total,
        limit: filters.limit || 50,
        offset: filters.offset || 0,
      };

      return responseOk({ data: searchResult });
    } catch (error) {
      this.logger.error('Erro na busca de postos:', error);
      return responseInternalServerError({
        message: 'Erro ao buscar postos de combustível',
      });
    }
  }

  async getFuelStatistics() {
    try {
      // Total de postos
      const totalStations = await this.gasStationRepository.count();

      // Estatísticas por estado
      const byState = await this.gasStationRepository
        .createQueryBuilder('gs')
        .select('gs.uf', 'uf')
        .addSelect('COUNT(*)', 'total')
        .groupBy('gs.uf')
        .orderBy('total', 'DESC')
        .getRawMany();

      // Estatísticas por produto
      const byProduct = await this.gasStationRepository
        .createQueryBuilder('gs')
        .select('gs.produto', 'produto')
        .addSelect('COUNT(*)', 'total')
        .addSelect('ROUND(AVG(gs.preco_venda), 3)', 'preco_medio')
        .addSelect('ROUND(MIN(gs.preco_venda), 3)', 'preco_minimo')
        .addSelect('ROUND(MAX(gs.preco_venda), 3)', 'preco_maximo')
        .where('gs.preco_venda IS NOT NULL')
        .groupBy('gs.produto')
        .orderBy('total', 'DESC')
        .getRawMany();

      // Data da última atualização
      const lastUpdateResult = await this.gasStationRepository
        .createQueryBuilder('gs')
        .select('MAX(gs.data_coleta)', 'lastUpdate')
        .getRawOne();

      const statistics: StatisticsResult = {
        totalStations,
        byState: byState.map(item => ({
          uf: item.uf,
          total: parseInt(item.total),
        })),
        byProduct: byProduct.map(item => ({
          produto: item.produto,
          total: parseInt(item.total),
          preco_medio: parseFloat(item.preco_medio) || 0,
          preco_minimo: parseFloat(item.preco_minimo) || 0,
          preco_maximo: parseFloat(item.preco_maximo) || 0,
        })),
        lastUpdate: lastUpdateResult?.lastUpdate || null,
      };

      return responseOk({ data: statistics });
    } catch (error) {
      this.logger.error('Erro ao obter estatísticas:', error);
      return responseInternalServerError({
        message: 'Erro ao obter estatísticas dos combustíveis',
      });
    }
  }
}