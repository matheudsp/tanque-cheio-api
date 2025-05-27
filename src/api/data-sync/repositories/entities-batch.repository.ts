import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GasStation } from '@/database/entity/gas-station.entity';
import { Localization } from '@/database/entity/localization.entity';
import { Product } from '@/database/entity/product.entity';
import { PriceHistory } from '@/database/entity/price-history.entity';
import { MappedEntities } from '../mappers/csv-to-entities.mapper';
import { ProcessingResult } from '../interfaces/base.interface';

@Injectable()
export class EntitiesBatchRepository {
  private readonly logger = new Logger(EntitiesBatchRepository.name);

  constructor(
    @InjectRepository(GasStation)
    private readonly gasStationRepository: Repository<GasStation>,
    @InjectRepository(Localization)
    private readonly localizationRepository: Repository<Localization>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(PriceHistory)
    private readonly priceHistoryRepository: Repository<PriceHistory>,
  ) {}

  async saveInBatches(
    mappedData: MappedEntities,
    batchSize = 500,
  ): Promise<ProcessingResult> {
    const result: ProcessingResult = {
      totalProcessed: 0,
      totalErrors: 0,
      totalSkipped: 0,
      totalInserted: 0,
      totalUpdated: 0,
      errors: [],
    };

    this.logger.log('Iniciando processamento das entidades...');

    try {
      // 1. Processar localizações primeiro
      await this.processLocalizations(mappedData.localizations, result);

      // 2. Processar produtos
      await this.processProducts(mappedData.products, result);

      // 3. Processar postos de gasolina
      await this.processGasStations(mappedData.gasStations, result);

      // 4. Processar históricos de preços
      await this.processPriceHistories(
        mappedData.priceHistories,
        result,
        batchSize,
      );
    } catch (error) {
      this.logger.error('Erro no processamento das entidades:', error);
      result.totalErrors++;
      result.errors.push({
        row: -1,
        data: null,
        error: `Erro geral: ${error.message}`,
      });
    }

    this.logger.log(
      `Processamento concluído: ${result.totalInserted} inseridos, ` +
        `${result.totalUpdated} atualizados, ${result.totalSkipped} ignorados, ` +
        `${result.totalErrors} erros`,
    );

    return result;
  }

  private async processLocalizations(
    localizations: Localization[],
    result: ProcessingResult,
  ): Promise<void> {
    this.logger.log(`Processando ${localizations.length} localizações...`);

    for (const localization of localizations) {
      try {
        const existing = await this.localizationRepository
          .createQueryBuilder('loc')
          .where('loc.uf = :uf', { uf: localization.uf })
          .andWhere('loc.municipio = :municipio', {
            municipio: localization.municipio,
          })
          .andWhere("COALESCE(loc.endereco, '') = COALESCE(:endereco, '')", {
            endereco: localization.endereco || '',
          })
          .andWhere("COALESCE(loc.bairro, '') = COALESCE(:bairro, '')", {
            bairro: localization.bairro || '',
          })
          .andWhere("COALESCE(loc.cep, '') = COALESCE(:cep, '')", {
            cep: localization.cep || '',
          })
          .getOne();

        if (existing) {
          // Atualizar referência na entidade original
          localization.id = existing.id;
          localization.criadoEm = existing.criadoEm;
          result.totalSkipped!++;
        } else {
          const saved = await this.localizationRepository.save(localization);
          localization.id = saved.id;
          result.totalInserted!++;
        }

        result.totalProcessed++;
      } catch (error) {
        result.totalErrors++;
        result.errors.push({
          row: -1,
          data: localization,
          error: `Erro ao processar localização: ${error.message}`,
        });
      }
    }
  }

  private async processProducts(
    products: Product[],
    result: ProcessingResult,
  ): Promise<void> {
    this.logger.log(`Processando ${products.length} produtos...`);

    for (const product of products) {
      try {
        const existing = await this.productRepository.findOne({
          where: { nome: product.nome },
        });

        if (existing) {
          // Atualizar referência na entidade original
          product.id = existing.id;
          product.criadoEm = existing.criadoEm;
          result.totalSkipped!++;
        } else {
          const saved = await this.productRepository.save(product);
          product.id = saved.id;
          result.totalInserted!++;
        }

        result.totalProcessed++;
      } catch (error) {
        result.totalErrors++;
        result.errors.push({
          row: -1,
          data: product,
          error: `Erro ao processar produto: ${error.message}`,
        });
      }
    }
  }

  private async processGasStations(
    gasStations: GasStation[],
    result: ProcessingResult,
  ): Promise<void> {
    this.logger.log(`Processando ${gasStations.length} postos de gasolina...`);

    for (const gasStation of gasStations) {
      try {
        // Definir os IDs das entidades relacionadas
        gasStation.localizacao_id = gasStation.localizacao.id;

        const existing = await this.gasStationRepository.findOne({
          where: { cnpj: gasStation.cnpj },
        });

        if (existing) {
          // Atualizar dados se necessário
          existing.nome = gasStation.nome;
          existing.nome_fantasia = gasStation.nome_fantasia;
          existing.bandeira = gasStation.bandeira;
          existing.localizacao_id = gasStation.localizacao_id;

          const updated = await this.gasStationRepository.save(existing);

          // Atualizar referência na entidade original
          gasStation.id = updated.id;
          gasStation.criadoEm = updated.criadoEm;

          result.totalUpdated!++;
        } else {
          const saved = await this.gasStationRepository.save(gasStation);
          gasStation.id = saved.id;
          result.totalInserted!++;
        }

        result.totalProcessed++;
      } catch (error) {
        result.totalErrors++;
        result.errors.push({
          row: -1,
          data: { cnpj: gasStation.cnpj, nome: gasStation.nome },
          error: `Erro ao processar posto: ${error.message}`,
        });
      }
    }
  }

  private async processPriceHistories(
    priceHistories: PriceHistory[],
    result: ProcessingResult,
    batchSize: number,
  ): Promise<void> {
    this.logger.log(
      `Processando ${priceHistories.length} históricos de preços em lotes de ${batchSize}...`,
    );

    for (let i = 0; i < priceHistories.length; i += batchSize) {
      const batch = priceHistories.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(priceHistories.length / batchSize);

      this.logger.log(
        `Processando lote ${batchNumber}/${totalBatches} (${batch.length} registros)`,
      );

      await this.processPriceHistoryBatch(batch, result, i);
    }
  }

  private async processPriceHistoryBatch(
    batch: PriceHistory[],
    result: ProcessingResult,
    startIndex: number,
  ): Promise<void> {
    try {
      // Preparar dados para busca de registros existentes
      const searchCriteria = batch.map((ph) => {
        // Garantir que data_coleta é um objeto Date válido
        const date =
          ph.data_coleta instanceof Date
            ? ph.data_coleta
            : new Date(ph.data_coleta);

        return {
          posto_id: ph.posto.id,
          produto_id: ph.produto.id,
          data_coleta: date.toISOString().split('T')[0],
        };
      });

      // Buscar registros existentes para todo o lote
      const existingRecords =
        await this.findExistingPriceHistories(searchCriteria);

      const toInsert: PriceHistory[] = [];
      const toUpdate: PriceHistory[] = [];

      for (const priceHistory of batch) {
        try {
          // Definir IDs das entidades relacionadas
          priceHistory.posto_id = priceHistory.posto.id;
          priceHistory.produto_id = priceHistory.produto.id;

          // Garantir que data_coleta é um objeto Date válido
          if (!(priceHistory.data_coleta instanceof Date)) {
            priceHistory.data_coleta = new Date(priceHistory.data_coleta);
          }

          const key = PriceHistory.createUpsertKey(
            priceHistory.posto_id,
            priceHistory.produto_id,
            priceHistory.data_coleta,
          );

          const existing = existingRecords.get(key);

          if (existing) {
            // Verificar se deve atualizar (se o preço mudou)
            if (existing.preco_venda !== priceHistory.preco_venda) {
              priceHistory.id = existing.id;
              priceHistory.criadoEm = existing.criadoEm;
              toUpdate.push(priceHistory);
            } else {
              result.totalSkipped!++;
            }
          } else {
            toInsert.push(priceHistory);
          }
        } catch (itemError) {
          this.logger.error(
            `Erro ao processar item individual no lote:`,
            itemError,
          );
          result.totalErrors++;
          result.errors.push({
            row: startIndex + batch.indexOf(priceHistory) + 1,
            data: {
              posto: priceHistory.posto?.nome || 'Desconhecido',
              produto: priceHistory.produto?.nome || 'Desconhecido',
              data_coleta: priceHistory.data_coleta,
            },
            error: `Erro no processamento: ${itemError.message}`,
          });
        }
      }

      // Inserir novos registros
      if (toInsert.length > 0) {
        await this.priceHistoryRepository.save(toInsert, { chunk: 100 });
        result.totalInserted! += toInsert.length;
        result.totalProcessed += toInsert.length;
      }

      // Atualizar registros existentes
      if (toUpdate.length > 0) {
        await this.priceHistoryRepository.save(toUpdate, { chunk: 100 });
        result.totalUpdated! += toUpdate.length;
        result.totalProcessed += toUpdate.length;
      }

      // Não somar totalSkipped aqui pois já foi contado no loop acima
    } catch (error) {
      this.logger.error(`Erro no processamento do lote de preços:`, error);

      // Processar individualmente em caso de erro
      for (const [index, priceHistory] of batch.entries()) {
        try {
          await this.processSinglePriceHistory(priceHistory, result);
        } catch (individualError) {
          result.totalErrors++;
          result.errors.push({
            row: startIndex + index + 1,
            data: {
              posto: priceHistory.posto?.nome || 'Desconhecido',
              produto: priceHistory.produto?.nome || 'Desconhecido',
              data_coleta: priceHistory.data_coleta,
            },
            error: individualError.message,
          });
        }
      }
    }
  }

  private async findExistingPriceHistories(
    criteria: Array<{
      posto_id: string;
      produto_id: string;
      data_coleta: string;
    }>,
  ): Promise<Map<string, PriceHistory>> {
    const resultMap = new Map<string, PriceHistory>();

    if (criteria.length === 0) return resultMap;

    // Criar condições para a query
    const conditions = criteria
      .map(
        (c, index) =>
          `(ph.posto_id = :posto_id_${index} AND ph.produto_id = :produto_id_${index} AND DATE(ph.data_coleta) = :data_coleta_${index})`,
      )
      .join(' OR ');

    const parameters: any = {};
    criteria.forEach((c, index) => {
      parameters[`posto_id_${index}`] = c.posto_id;
      parameters[`produto_id_${index}`] = c.produto_id;
      parameters[`data_coleta_${index}`] = c.data_coleta;
    });

    const existingRecords = await this.priceHistoryRepository
      .createQueryBuilder('ph')
      .where(`(${conditions})`, parameters)
      .getMany();

    for (const record of existingRecords) {
      const key = record.getUpsertKey();
      resultMap.set(key, record);
    }

    return resultMap;
  }

  private async processSinglePriceHistory(
    priceHistory: PriceHistory,
    result: ProcessingResult,
  ): Promise<void> {
    priceHistory.posto_id = priceHistory.posto.id;
    priceHistory.produto_id = priceHistory.produto.id;

    // Garantir que data_coleta é um objeto Date válido
    if (!(priceHistory.data_coleta instanceof Date)) {
      priceHistory.data_coleta = new Date(priceHistory.data_coleta);
    }

    const existing = await this.priceHistoryRepository
      .createQueryBuilder('ph')
      .where('ph.posto_id = :posto_id', { posto_id: priceHistory.posto_id })
      .andWhere('ph.produto_id = :produto_id', {
        produto_id: priceHistory.produto_id,
      })
      .andWhere('DATE(ph.data_coleta) = DATE(:data_coleta)', {
        data_coleta: priceHistory.data_coleta,
      })
      .getOne();

    if (existing) {
      if (existing.preco_venda !== priceHistory.preco_venda) {
        priceHistory.id = existing.id;
        priceHistory.criadoEm = existing.criadoEm;
        await this.priceHistoryRepository.save(priceHistory);
        result.totalUpdated!++;
      } else {
        result.totalSkipped!++;
      }
    } else {
      await this.priceHistoryRepository.save(priceHistory);
      result.totalInserted!++;
    }

    result.totalProcessed++;
  }
}
