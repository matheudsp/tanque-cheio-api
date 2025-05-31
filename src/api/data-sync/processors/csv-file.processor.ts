import type { ProcessingResult } from '../interfaces/processor.interface';
import type { CsvRow } from '../interfaces/csv-row.interface';
import { DataUtils } from '../utils/data-utils';
import { Injectable, Logger } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GasStationEntity } from '@/database/entity/gas-station.entity';
import { LocalizationEntity } from '@/database/entity/localization.entity';
import { ProductEntity } from '@/database/entity/product.entity';
import { PriceHistoryEntity } from '@/database/entity/price-history.entity';
import { EntityFactory } from '../repositories/entity.factory';
import * as Papa from 'papaparse';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CsvProcessor {
  private readonly logger = new Logger(CsvProcessor.name);

  constructor(
    @InjectRepository(GasStationEntity)
    private gasStationRepo: Repository<GasStationEntity>,
    @InjectRepository(LocalizationEntity)
    private localizationRepo: Repository<LocalizationEntity>,
    @InjectRepository(ProductEntity) private productRepo: Repository<ProductEntity>,
    @InjectRepository(PriceHistoryEntity)
    private priceHistoryRepo: Repository<PriceHistoryEntity>,
  ) {}

  async processFile(filePath: string): Promise<ProcessingResult> {
    const startTime = Date.now();
    const result: ProcessingResult = {
      totalProcessed: 0,
      totalInserted: 0,
      totalUpdated: 0,
      totalSkipped: 0,
      totalErrors: 0,
      errors: [],
    };

    try {
      const content = this.readAndPreprocessFile(filePath);
      const rows = await this.parseCSV(content);
      const validRows = rows.filter(DataUtils.isValidRow);

      this.logger.log(
        `🧪Processando ${validRows.length} linhas válidas de ${rows.length}`,
      );

      await this.processRowsInBatches(validRows, result);

      result.processingTimeSeconds = (Date.now() - startTime) / 1000;
      return result;
    } catch (error) {
      this.logger.error('❌Processamento do arquivo falhou:', error);
      result.totalErrors++;
      result.errors.push({ row: -1, data: null, error: error.message });
      return result;
    }
  }

  private readAndPreprocessFile(filePath: string): string {
    const fullPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), 'public', filePath);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`❌Arquivo não encontrado: ${fullPath}`);
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');

    const headerIndex = lines.findIndex(
      (line) =>
        line.includes('CNPJ') &&
        line.includes('RAZÃO') &&
        line.includes('FANTASIA'),
    );

    if (headerIndex === -1) {
      throw new Error('❌CSV cabeçaçlho não encontrado');
    }

    return lines
      .slice(headerIndex)
      .filter((line) => line.trim() && !line.match(/^,+$/))
      .join('\n');
  }

  private parseCSV(content: string): Promise<CsvRow[]> {
    return new Promise((resolve, reject) => {
      Papa.parse<CsvRow>(content, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim(),
        complete: (result) => resolve(result.data),
        error: reject,
      });
    });
  }

  private async processRowsInBatches(
    rows: CsvRow[],
    result: ProcessingResult,
    batchSize = 100,
  ): Promise<void> {
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      await this.processBatch(batch, result, i);
    }
  }

  private async processBatch(
    batch: CsvRow[],
    result: ProcessingResult,
    startIndex: number,
  ): Promise<void> {
    const queryRunner =
      this.gasStationRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { entities, priceHistories } = await this.processEntities(
        batch,
        queryRunner,
      );
      await this.upsertPriceHistories(
        priceHistories,
        entities,
        queryRunner,
        result,
      );

      result.totalProcessed += batch.length;
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handleBatchError(batch, startIndex, error, result);
    } finally {
      await queryRunner.release();
    }
  }

  private async processEntities(batch: CsvRow[], queryRunner: any) {
    const localizationMap = new Map<string, LocalizationEntity>();
    const productMap = new Map<string, ProductEntity>();
    const gasStationMap = new Map<string, GasStationEntity>();
    const priceHistories: Array<{
      row: CsvRow;
      gasStation: GasStationEntity;
      product: ProductEntity;
    }> = [];

    for (const row of batch) {
      try {
        // Process localization
        const localization = EntityFactory.createLocalization(row);
        const locKey = localization.getLocationKey();
        if (!localizationMap.has(locKey)) {
          const existing = await this.findOrCreateEntity(
            queryRunner,
            LocalizationEntity,
            localization,
            this.getLocalizationQuery(localization),
          );
          localizationMap.set(locKey, existing);
        }

        // Process product
        const product = EntityFactory.createProduct(row);
        const prodKey = product.name;
        if (!productMap.has(prodKey)) {
          const existing = await this.findOrCreateEntity(
            queryRunner,
            ProductEntity,
            product,
            { nome: product.name },
          );
          productMap.set(prodKey, existing);
        }

        // Process gas station
        const gasStation = EntityFactory.createGasStation(
          row,
          localizationMap.get(locKey)!,
        );
        const gasKey = gasStation.taxId;
        if (!gasStationMap.has(gasKey)) {
          const existing = await this.findOrCreateEntity(
            queryRunner,
            GasStationEntity,
            gasStation,
            { cnpj: gasStation.taxId },
          );
          gasStationMap.set(gasKey, existing);
        }

        priceHistories.push({
          row,
          gasStation: gasStationMap.get(gasKey)!,
          product: productMap.get(prodKey)!,
        });
      } catch (error) {
        this.logger.warn(`❌Erro ao processar linha:`, error);
      }
    }

    return {
      entities: { localizationMap, productMap, gasStationMap },
      priceHistories,
    };
  }

  private async findOrCreateEntity<T extends Object>(
    queryRunner: any,
    EntityClass: new () => T,
    entity: T,
    findCriteria: any,
  ): Promise<T> {
    const existing = await queryRunner.manager.findOne(EntityClass, {
      where: findCriteria,
    });
    if (existing) {
      Object.assign(entity, { id: existing.id, criadoEm: existing.criadoEm });
      return existing;
    }
    return await queryRunner.manager.save(entity);
  }

  private getLocalizationQuery(localization: LocalizationEntity) {
    return {
      uf: localization.state,
      municipio: localization.city,
      endereco: localization.address,
      bairro: localization.neighborhood,
      cep: localization.zipCode,
    };
  }

  private async upsertPriceHistories(
    priceHistories: Array<{
      row: CsvRow;
      gasStation: GasStationEntity;
      product: ProductEntity;
    }>,
    entities: any,
    queryRunner: any,
    result: ProcessingResult,
  ): Promise<void> {
    const toInsert: PriceHistoryEntity[] = [];
    const toUpdate: PriceHistoryEntity[] = [];

    // Build search criteria for batch lookup
    const searchCriteria = priceHistories.map(
      ({ row, gasStation, product }) => ({
        posto_id: gasStation.id,
        produto_id: product.id,
        data_coleta: DataUtils.parseDate(row['DATA DA COLETA'])
          .toISOString()
          .split('T')[0],
      }),
    );

    const existingMap = await this.findExistingPriceHistories(
      searchCriteria,
      queryRunner,
    );

    for (const { row, gasStation, product } of priceHistories) {
      try {
        const priceHistory = EntityFactory.createPriceHistory(
          row,
          gasStation,
          product,
        );
        const key = PriceHistoryEntity.createUpsertKey(
          gasStation.id,
          product.id,
          priceHistory.collection_date,
        );
        const existing = existingMap.get(key);

        if (!existing) {
          // Registro não existe, inserir
          toInsert.push(priceHistory);
        } else {
          // Registro existe, verificar se precisa atualizar
          const needsUpdate = this.shouldUpdatePriceHistory(
            existing,
            priceHistory,
          );

          if (needsUpdate) {
            priceHistory.id = existing.id;
            priceHistory.createdAt = existing.createdAt; // Preservar data de criação original
            toUpdate.push(priceHistory);
          } else {
            // Registro idêntico ou mais antigo, pular
            result.totalSkipped++;
            this.logger.debug(`⏭️ Registro ignorado - dados idênticos: ${key}`);
          }
        }
      } catch (error) {
        result.totalErrors++;
        result.errors.push({
          row: -1,
          data: row,
          error: error.message,
        });
      }
    }

    if (toInsert.length > 0) {
      await queryRunner.manager.save(toInsert, { chunk: 100 });
      result.totalInserted += toInsert.length;
      this.logger.log(`✅ ${toInsert.length} registros inseridos`);
    }

    if (toUpdate.length > 0) {
      await queryRunner.manager.save(toUpdate, { chunk: 100 });
      result.totalUpdated += toUpdate.length;
      this.logger.log(`🔄 ${toUpdate.length} registros atualizados`);
    }

    if (result.totalSkipped > 0) {
      this.logger.log(
        `⏭️ ${result.totalSkipped} registros ignorados (dados idênticos)`,
      );
    }
  }

  /**
   * Determina se um registro de histórico de preço deve ser atualizado
   * Critérios:
   * 1. Preço diferente
   * 2. Data de coleta igual (permite re-processamento do mesmo arquivo)
   * 3. Outros campos relevantes diferentes
   */
  private shouldUpdatePriceHistory(
    existing: PriceHistoryEntity,
    newRecord: PriceHistoryEntity,
  ): boolean {
    // Se os preços são iguais, não há necessidade de atualizar
    if (existing.price == newRecord.price) {
      return false;
    }

    // Se a data de coleta é mais antiga que a existente, não atualizar
    const existingDate = new Date(existing.collection_date);
    const newDate = new Date(newRecord.collection_date);

    if (newDate < existingDate) {
      this.logger.debug(
        `⏭️ Data mais antiga detectada - existente: ${existingDate.toISOString()}, nova: ${newDate.toISOString()}`,
      );
      return false;
    }

    // Se chegou até aqui, o registro deve ser atualizado
    // (preço diferente E data igual)
    this.logger.debug(
      `🔄 Atualização necessária - preço: ${existing.price} → ${newRecord.price}`,
    );
    return true;
  }

  private async findExistingPriceHistories(
    criteria: Array<{
      posto_id: string;
      produto_id: string;
      data_coleta: string;
    }>,
    queryRunner: any,
  ): Promise<Map<string, PriceHistoryEntity>> {
    if (criteria.length === 0) return new Map();

    const conditions = criteria
      .map(
        (_, index) =>
          `(ph.posto_id = :posto_id_${index} AND ph.produto_id = :produto_id_${index} AND DATE(ph.data_coleta) = :data_coleta_${index})`,
      )
      .join(' OR ');

    const parameters = criteria.reduce(
      (params, c, index) => ({
        ...params,
        [`posto_id_${index}`]: c.posto_id,
        [`produto_id_${index}`]: c.produto_id,
        [`data_coleta_${index}`]: c.data_coleta,
      }),
      {},
    );

    const records = await queryRunner.manager
      .createQueryBuilder(PriceHistoryEntity, 'ph')
      .where(`(${conditions})`, parameters)
      .getMany();

    const resultMap = new Map<string, PriceHistoryEntity>();
    records.forEach((record) => {
      const key = record.getUpsertKey();
      resultMap.set(key, record);
    });

    return resultMap;
  }

  private handleBatchError(
    batch: CsvRow[],
    startIndex: number,
    error: any,
    result: ProcessingResult,
  ): void {
    this.logger.error('❌Processamento do lote falhou:', error);
    batch.forEach((row, index) => {
      result.totalErrors++;
      result.errors.push({
        row: startIndex + index + 1,
        data: row,
        error: `❌Erro do lote: ${error.message}`,
      });
    });
  }
}
