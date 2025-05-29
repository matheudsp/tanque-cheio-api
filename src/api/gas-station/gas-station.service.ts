import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GasStation } from '@/database/entity/gas-station.entity';
import { PriceHistory } from '@/database/entity/price-history.entity';
import { Product } from '@/database/entity/product.entity';
import { Localization } from '@/database/entity/localization.entity';
import { 
  responseOk, 
  responseInternalServerError,
  responseBadRequest 
} from '@/common/utils/response-api';
import { 
  SearchFilters, 
  SearchResult, 
  StatisticsResult,
  NearbyStationsFilter,
  NearbyStationsResult,
  StationsByProductFilter,
  StationsByProductResult,
  PriceHistoryFilter,
  PriceHistoryResult,
  StationDetail
} from './interfaces/gas-station.interface';

@Injectable()
export class GasStationService {
  private readonly logger = new Logger(GasStationService.name);

  constructor(
    @InjectRepository(GasStation)
    private readonly gasStationRepository: Repository<GasStation>,
    @InjectRepository(PriceHistory)
    private readonly priceHistoryRepository: Repository<PriceHistory>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Localization)
    private readonly localizationRepository: Repository<Localization>,
  ) {}

  /**
   * Busca postos de combustível com filtros
   */
  async searchGasStations(filters: SearchFilters) {
    try {
      const queryBuilder = this.gasStationRepository
        .createQueryBuilder('gs')
        .leftJoinAndSelect('gs.localizacao', 'loc')
        .leftJoinAndSelect('gs.historicoPrecos', 'hp')
        .leftJoinAndSelect('hp.produto', 'prod')
        .where('gs.ativo = :ativo', { ativo: true });

      if (filters.uf) {
        queryBuilder.andWhere('UPPER(loc.uf) = UPPER(:uf)', { 
          uf: filters.uf 
        });
      }

      if (filters.municipio) {
        queryBuilder.andWhere('UPPER(loc.municipio) ILIKE UPPER(:municipio)', { 
          municipio: `%${filters.municipio}%` 
        });
      }

      if (filters.produto) {
        queryBuilder.andWhere('UPPER(prod.nome) ILIKE UPPER(:produto)', { 
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
        .orderBy('hp.data_coleta', 'DESC')
        .addOrderBy('loc.municipio', 'ASC')
        .addOrderBy('gs.nome_razao', 'ASC')
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

  /**
   * Busca postos próximos a uma coordenada
   */
  async getNearbyStations(filters: NearbyStationsFilter) {
    try {
      const queryBuilder = this.gasStationRepository
        .createQueryBuilder('gs')
        .leftJoinAndSelect('gs.localizacao', 'loc')
        .leftJoinAndSelect('gs.historicoPrecos', 'hp')
        .leftJoinAndSelect('hp.produto', 'prod')
        .where('gs.ativo = :ativo', { ativo: true })
        .andWhere('loc.latitude IS NOT NULL')
        .andWhere('loc.longitude IS NOT NULL');

      // Cálculo de distância usando fórmula de Haversine
      const earthRadius = 6371; // Raio da Terra em km
      queryBuilder.addSelect(
        `(${earthRadius} * acos(
          cos(radians(:latitude)) * cos(radians(loc.latitude)) * 
          cos(radians(loc.longitude) - radians(:longitude)) + 
          sin(radians(:latitude)) * sin(radians(loc.latitude))
        ))`,
        'distance'
      );

      queryBuilder.setParameters({
        latitude: filters.latitude,
        longitude: filters.longitude,
      });

      // Filtro por raio
      const radius = filters.radius || 10;
      queryBuilder.having('distance <= :radius', { radius });

      // Filtro por produto se especificado
      if (filters.produto) {
        queryBuilder.andWhere('UPPER(prod.nome) ILIKE UPPER(:produto)', { 
          produto: `%${filters.produto}%` 
        });
      }

      // Aplicar paginação e ordenação por distância
      const results = await queryBuilder
        .orderBy('distance', 'ASC')
        .addOrderBy('hp.data_coleta', 'DESC')
        .limit(filters.limit || 20)
        .getRawAndEntities();

      const stationsWithDistance = results.entities.map((station, index) => ({
        ...station,
        distance: parseFloat(results.raw[index]?.distance || '0'),
      }));

      const nearbyResult: NearbyStationsResult = {
        results: stationsWithDistance,
        total: stationsWithDistance.length,
        limit: filters.limit || 20,
        searchCenter: {
          latitude: filters.latitude,
          longitude: filters.longitude,
          radius,
        },
      };

      return responseOk({ data: nearbyResult });
    } catch (error) {
      this.logger.error('Erro na busca de postos próximos:', error);
      return responseInternalServerError({
        message: 'Erro ao buscar postos próximos',
      });
    }
  }

  /**
   * Busca postos por produto específico
   */
  async getStationsByProduct(productName: string, filters: StationsByProductFilter) {
    try {
      const queryBuilder = this.priceHistoryRepository
        .createQueryBuilder('hp')
        .leftJoinAndSelect('hp.posto', 'gs')
        .leftJoinAndSelect('gs.localizacao', 'loc')
        .leftJoinAndSelect('hp.produto', 'prod')
        .where('gs.ativo = :ativo', { ativo: true })
        .andWhere('hp.ativo = :ativo', { ativo: true })
        .andWhere('UPPER(prod.nome) ILIKE UPPER(:productName)', { 
          productName: `%${productName}%` 
        })
        .andWhere('hp.preco_venda IS NOT NULL');

      if (filters.uf) {
        queryBuilder.andWhere('UPPER(loc.uf) = UPPER(:uf)', { 
          uf: filters.uf 
        });
      }

      if (filters.municipio) {
        queryBuilder.andWhere('UPPER(loc.municipio) ILIKE UPPER(:municipio)', { 
          municipio: `%${filters.municipio}%` 
        });
      }

      // Contagem total
      const total = await queryBuilder.getCount();

      // Aplicar ordenação
      let orderByClause = 'hp.preco_venda';
      let orderDirection: 'ASC' | 'DESC' = 'ASC';

      switch (filters.orderBy) {
        case 'price_desc':
          orderDirection = 'DESC';
          break;
        case 'date_desc':
          orderByClause = 'hp.data_coleta';
          orderDirection = 'DESC';
          break;
        default: // price_asc
          break;
      }

      const results = await queryBuilder
        .orderBy(orderByClause, orderDirection)
        .addOrderBy('loc.municipio', 'ASC')
        .addOrderBy('gs.nome_razao', 'ASC')
        .limit(filters.limit || 50)
        .offset(filters.offset || 0)
        .getMany();

      const productResult: StationsByProductResult = {
        productName,
        results,
        total,
        limit: filters.limit || 50,
        offset: filters.offset || 0,
        orderBy: filters.orderBy || 'price_asc',
      };

      return responseOk({ data: productResult });
    } catch (error) {
      this.logger.error('Erro na busca de postos por produto:', error);
      return responseInternalServerError({
        message: 'Erro ao buscar postos por produto',
      });
    }
  }

  /**
   * Obtém histórico de preços de um posto específico
   */
  async getStationPriceHistory(stationId: string, filters: PriceHistoryFilter) {
    try {
      const queryBuilder = this.priceHistoryRepository
        .createQueryBuilder('hp')
        .leftJoinAndSelect('hp.produto', 'prod')
        .leftJoinAndSelect('hp.posto', 'gs')
        .where('hp.posto_id = :stationId', { stationId })
        .andWhere('hp.ativo = :ativo', { ativo: true })
        .andWhere('hp.preco_venda IS NOT NULL');

      if (filters.produto) {
        queryBuilder.andWhere('UPPER(prod.nome) ILIKE UPPER(:produto)', { 
          produto: `%${filters.produto}%` 
        });
      }

      if (filters.startDate) {
        queryBuilder.andWhere('hp.data_coleta >= :startDate', { 
          startDate: filters.startDate 
        });
      }

      if (filters.endDate) {
        queryBuilder.andWhere('hp.data_coleta <= :endDate', { 
          endDate: filters.endDate 
        });
      }

      // Contagem total
      const total = await queryBuilder.getCount();

      const results = await queryBuilder
        .orderBy('hp.data_coleta', 'DESC')
        .addOrderBy('prod.nome', 'ASC')
        .limit(filters.limit || 100)
        .getMany();

      const historyResult: PriceHistoryResult = {
        stationId,
        results,
        total,
        limit: filters.limit || 100,
        filters: {
          produto: filters.produto,
          startDate: filters.startDate,
          endDate: filters.endDate,
        },
      };

      return responseOk({ data: historyResult });
    } catch (error) {
      this.logger.error('Erro ao obter histórico de preços:', error);
      return responseInternalServerError({
        message: 'Erro ao obter histórico de preços',
      });
    }
  }

  /**
   * Obtém detalhes completos de um posto específico
   */
  async getStationById(id: string) {
    try {
      const station = await this.gasStationRepository
        .createQueryBuilder('gs')
        .leftJoinAndSelect('gs.localizacao', 'loc')
        .leftJoinAndSelect('gs.historicoPrecos', 'hp')
        .leftJoinAndSelect('hp.produto', 'prod')
        .where('gs.id = :id', { id })
        .andWhere('gs.ativo = :ativo', { ativo: true })
        .orderBy('hp.data_coleta', 'DESC')
        .getOne();

      if (!station) {
        return responseBadRequest({
          message: 'Posto não encontrado',
        });
      }

      // Organizar dados por produto
      const pricesByProduct = station.historicoPrecos.reduce((acc, history) => {
        const productName = history.produto.nome;
        if (!acc[productName]) {
          acc[productName] = [];
        }
        acc[productName].push(history);
        return acc;
      }, {} as Record<string, PriceHistory[]>);

      const stationDetail: StationDetail = {
        station,
        pricesByProduct,
        totalProducts: Object.keys(pricesByProduct).length,
        lastUpdate: station.historicoPrecos[0]?.data_coleta || null,
      };

      return responseOk({ data: stationDetail });
    } catch (error) {
      this.logger.error('Erro ao obter detalhes do posto:', error);
      return responseInternalServerError({
        message: 'Erro ao obter detalhes do posto',
      });
    }
  }

  /**
   * Obtém estatísticas gerais dos combustíveis
   */
  async getFuelStatistics() {
    try {
      // Total de postos ativos
      const totalStations = await this.gasStationRepository.count({
        where: { ativo: true }
      });

      // Estatísticas por estado
      const byState = await this.localizationRepository
        .createQueryBuilder('loc')
        .innerJoin('loc.postos', 'gs')
        .select('loc.uf', 'uf')
        .addSelect('COUNT(DISTINCT gs.id)', 'total')
        .where('gs.ativo = :ativo', { ativo: true })
        .groupBy('loc.uf')
        .orderBy('total', 'DESC')
        .getRawMany();

      // Estatísticas por produto
      const byProduct = await this.priceHistoryRepository
        .createQueryBuilder('hp')
        .innerJoin('hp.produto', 'prod')
        .innerJoin('hp.posto', 'gs')
        .select('prod.nome', 'produto')
        .addSelect('COUNT(DISTINCT hp.id)', 'total')
        .addSelect('ROUND(AVG(hp.preco_venda), 3)', 'preco_medio')
        .addSelect('ROUND(MIN(hp.preco_venda), 3)', 'preco_minimo')
        .addSelect('ROUND(MAX(hp.preco_venda), 3)', 'preco_maximo')
        .where('hp.preco_venda IS NOT NULL')
        .andWhere('hp.ativo = :ativo', { ativo: true })
        .andWhere('gs.ativo = :ativo', { ativo: true })
        .groupBy('prod.nome')
        .orderBy('total', 'DESC')
        .getRawMany();

      // Data da última atualização
      const lastUpdateResult = await this.priceHistoryRepository
        .createQueryBuilder('hp')
        .select('MAX(hp.data_coleta)', 'lastUpdate')
        .where('hp.ativo = :ativo', { ativo: true })
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

  /**
   * Lista todos os produtos disponíveis
   */
  async getAvailableProducts() {
    try {
      const products = await this.productRepository.find({
        where: { ativo: true },
        order: { nome: 'ASC' },
      });

      return responseOk({ data: products });
    } catch (error) {
      this.logger.error('Erro ao obter produtos:', error);
      return responseInternalServerError({
        message: 'Erro ao obter lista de produtos',
      });
    }
  }

  /**
   * Lista todas as UFs disponíveis
   */
  async getAvailableStates() {
    try {
      const states = await this.localizationRepository
        .createQueryBuilder('loc')
        .innerJoin('loc.postos', 'gs')
        .select('DISTINCT loc.uf', 'uf')
        .addSelect('COUNT(DISTINCT gs.id)', 'total_stations')
        .where('gs.ativo = :ativo', { ativo: true })
        .groupBy('loc.uf')
        .orderBy('loc.uf', 'ASC')
        .getRawMany();

      const formattedStates = states.map(state => ({
        uf: state.uf,
        totalStations: parseInt(state.total_stations),
      }));

      return responseOk({ data: formattedStates });
    } catch (error) {
      this.logger.error('Erro ao obter estados:', error);
      return responseInternalServerError({
        message: 'Erro ao obter lista de estados',
      });
    }
  }

  /**
   * Lista municípios por UF
   */
  async getCitiesByState(uf: string) {
    try {
      const cities = await this.localizationRepository
        .createQueryBuilder('loc')
        .innerJoin('loc.postos', 'gs')
        .select('DISTINCT loc.municipio', 'municipio')
        .addSelect('COUNT(DISTINCT gs.id)', 'total_stations')
        .where('UPPER(loc.uf) = UPPER(:uf)', { uf })
        .andWhere('gs.ativo = :ativo', { ativo: true })
        .groupBy('loc.municipio')
        .orderBy('loc.municipio', 'ASC')
        .getRawMany();

      const formattedCities = cities.map(city => ({
        municipio: city.municipio,
        totalStations: parseInt(city.total_stations),
      }));

      return responseOk({ data: formattedCities });
    } catch (error) {
      this.logger.error('Erro ao obter municípios:', error);
      return responseInternalServerError({
        message: 'Erro ao obter lista de municípios',
      });
    }
  }
}