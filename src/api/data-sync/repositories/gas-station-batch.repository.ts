import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GasStation } from '@/database/entity/gas-station.entity';
import { Localizacao } from '@/database/entity/location.entity';
import { Produto } from '@/database/entity/product.entity';
import {
  IDataRepository,
  type SaveResult,
} from '../interfaces/file-processor.interface';

@Injectable()
export class GasStationBatchRepository implements IDataRepository<GasStation> {
  private readonly logger = new Logger(GasStationBatchRepository.name);

  constructor(
    @InjectRepository(GasStation)
    private readonly gasStationRepository: Repository<GasStation>,
    @InjectRepository(Localizacao)
    private readonly localizacaoRepository: Repository<Localizacao>,
    @InjectRepository(Produto)
    private readonly produtoRepository: Repository<Produto>,
  ) {}

  async saveInBatches(
    entities: GasStation[],
    batchSize = 500,
  ): Promise<SaveResult> {
    const result: SaveResult = {
      totalProcessed: 0,
      totalErrors: 0,
      totalSkipped: 0,
      totalInserted: 0,
      totalUpdated: 0,
      errors: [],
    };

    this.logger.log(
      `Iniciando processamento de ${entities.length} registros em lotes de ${batchSize}`,
    );

    // Primeiro, processar localizações e produtos
    await this.processLocalizacoesAndProdutos(entities);

    for (let i = 0; i < entities.length; i += batchSize) {
      const batch = entities.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(entities.length / batchSize);

      this.logger.log(
        `Processando lote ${batchNumber}/${totalBatches} (${batch.length} registros)`,
      );

      await this.processBatchWithUpsert(batch, result, i);
    }

    this.logger.log(
      `Processamento concluído: ${result.totalInserted} inseridos, ` +
        `${result.totalUpdated} atualizados, ${result.totalSkipped} ignorados, ` +
        `${result.totalErrors} erros`,
    );

    return result;
  }

  private async processLocalizacoesAndProdutos(entities: GasStation[]): Promise<void> {
    // Processar localizações únicas
    const localizacoesMap = new Map<string, Localizacao>();
    const produtosMap = new Map<string, Produto>();

    for (const entity of entities) {
      // Processar localização
      const locKey = entity.localizacao.getLocationKey();
      if (!localizacoesMap.has(locKey)) {
        localizacoesMap.set(locKey, entity.localizacao);
      }

      // Processar produto
      const prodKey = Produto.normalizeName(entity.produto.nome);
      if (!produtosMap.has(prodKey)) {
        produtosMap.set(prodKey, entity.produto);
      }
    }

    // Salvar localizações
    await this.upsertLocalizacoes(Array.from(localizacoesMap.values()));
    
    // Salvar produtos
    await this.upsertProdutos(Array.from(produtosMap.values()));

    // Atualizar referências nas entidades
    for (const entity of entities) {
      const locKey = entity.localizacao.getLocationKey();
      const prodKey = Produto.normalizeName(entity.produto.nome);
      
      entity.localizacao = localizacoesMap.get(locKey)!;
      entity.produto = produtosMap.get(prodKey)!;
      
      entity.localizacao_id = entity.localizacao.id;
      entity.produto_id = entity.produto.id;
    }
  }

  private async upsertLocalizacoes(localizacoes: Localizacao[]): Promise<void> {
    for (const localizacao of localizacoes) {
      const existing = await this.localizacaoRepository
        .createQueryBuilder('loc')
        .where('loc.uf = :uf', { uf: localizacao.uf })
        .andWhere('loc.municipio = :municipio', { municipio: localizacao.municipio })
        .andWhere('COALESCE(loc.endereco, \'\') = COALESCE(:endereco, \'\')', { endereco: localizacao.endereco || '' })
        .andWhere('COALESCE(loc.bairro, \'\') = COALESCE(:bairro, \'\')', { bairro: localizacao.bairro || '' })
        .andWhere('COALESCE(loc.cep, \'\') = COALESCE(:cep, \'\')', { cep: localizacao.cep || '' })
        .getOne();

      if (existing) {
        localizacao.id = existing.id;
        localizacao.criadoEm = existing.criadoEm;
      } else {
        const saved = await this.localizacaoRepository.save(localizacao);
        localizacao.id = saved.id;
      }
    }
  }

  private async upsertProdutos(produtos: Produto[]): Promise<void> {
    for (const produto of produtos) {
      const existing = await this.produtoRepository.findOne({
        where: { nome: produto.nome }
      });

      if (existing) {
        produto.id = existing.id;
        produto.criadoEm = existing.criadoEm;
      } else {
        const saved = await this.produtoRepository.save(produto);
        produto.id = saved.id;
      }
    }
  }

  private async processBatchWithUpsert(
    batch: GasStation[],
    result: SaveResult,
    startIndex: number,
  ): Promise<void> {
    try {
      const existingRecords = await this.findExistingRecords(batch);
      const recordsToProcess = await this.categorizeRecords(
        batch,
        existingRecords,
      );

      if (recordsToProcess.toInsert.length > 0) {
        await this.insertRecords(recordsToProcess.toInsert, result);
      }

      if (recordsToProcess.toUpdate.length > 0) {
        await this.updateRecords(recordsToProcess.toUpdate, result);
      }

      if (recordsToProcess.skipped.length > 0) {
        result.totalSkipped! += recordsToProcess.skipped.length;
        this.logger.debug(
          `Ignorados ${recordsToProcess.skipped.length} registros (data_coleta não é mais recente)`,
        );
      }
    } catch (error) {
      this.logger.error(`Erro no processamento do lote:`, error);
      await this.handleBatchError(batch, result, startIndex, error);
    }
  }

  private async findExistingRecords(
    batch: GasStation[],
  ): Promise<Map<string, GasStation>> {
    if (batch.length === 0) return new Map();

    const cnpjs = [...new Set(batch.map((entity) => entity.cnpj))];
    const produtoIds = [...new Set(batch.map((entity) => entity.produto_id))];

    this.logger.debug(
      `Buscando registros existentes para ${cnpjs.length} CNPJs únicos e ${produtoIds.length} produtos únicos`,
    );

    const existingRecords = await this.gasStationRepository
      .createQueryBuilder('gs')
      .leftJoinAndSelect('gs.produto', 'produto')
      .where('gs.cnpj IN (:...cnpjs)', { cnpjs })
      .andWhere('gs.produto_id IN (:...produtoIds)', { produtoIds })
      .orderBy('gs.data_coleta', 'DESC')
      .getMany();

    this.logger.debug(
      `Encontrados ${existingRecords.length} registros existentes no banco`,
    );

    const recordMap = new Map<string, GasStation>();

    existingRecords.forEach((record) => {
      const key = this.createRecordKey(record.cnpj, record.produto_id);
      const existing = recordMap.get(key);
      
      if (
        !existing ||
        this.isDateNewer(record.data_coleta, existing.data_coleta)
      ) {
        recordMap.set(key, record);
      }
    });

    this.logger.debug(
      `Mapa criado com ${recordMap.size} combinações únicas de CNPJ+Produto`,
    );

    return recordMap;
  }

  private async categorizeRecords(
    batch: GasStation[],
    existingRecords: Map<string, GasStation>,
  ): Promise<{
    toInsert: GasStation[];
    toUpdate: GasStation[];
    skipped: GasStation[];
  }> {
    const toInsert: GasStation[] = [];
    const toUpdate: GasStation[] = [];
    const skipped: GasStation[] = [];

    for (const newRecord of batch) {
      const key = this.createRecordKey(newRecord.cnpj, newRecord.produto_id);
      const existingRecord = existingRecords.get(key);

      if (!existingRecord) {
        toInsert.push(newRecord);
        this.logger.debug(
          `[INSERIR] CNPJ: ${newRecord.cnpj}, Produto: ${newRecord.produto.nome}, ` +
            `Data: ${this.formatDate(newRecord.data_coleta)}`,
        );
      } else {
        const comparison = this.compareDates(
          newRecord.data_coleta,
          existingRecord.data_coleta,
        );

        if (comparison.isNewer) {
          newRecord.id = existingRecord.id;
          newRecord.criadoEm = existingRecord.criadoEm;
          toUpdate.push(newRecord);
          this.logger.debug(
            `[ATUALIZAR] CNPJ: ${newRecord.cnpj}, Produto: ${newRecord.produto.nome}, ` +
              `Data BD: ${this.formatDate(existingRecord.data_coleta)} -> ` +
              `Data CSV: ${this.formatDate(newRecord.data_coleta)}`,
          );
        } else if (comparison.isSame) {
          skipped.push(newRecord);
          this.logger.debug(
            `[IGNORAR] CNPJ: ${newRecord.cnpj}, Produto: ${newRecord.produto.nome}, ` +
              `Data: ${this.formatDate(newRecord.data_coleta)} (mesma data)`,
          );
        } else {
          skipped.push(newRecord);
          this.logger.debug(
            `[IGNORAR] CNPJ: ${newRecord.cnpj}, Produto: ${newRecord.produto.nome}, ` +
              `Data CSV: ${this.formatDate(newRecord.data_coleta)} é anterior à ` +
              `Data BD: ${this.formatDate(existingRecord.data_coleta)}`,
          );
        }
      }
    }

    this.logger.debug(
      `Categorização: ${toInsert.length} inserções, ${toUpdate.length} atualizações, ${skipped.length} ignorados`,
    );

    return { toInsert, toUpdate, skipped };
  }

  private async insertRecords(
    records: GasStation[],
    result: SaveResult,
  ): Promise<void> {
    try {
      await this.gasStationRepository.save(records, {
        chunk: 100,
        reload: false,
      });

      result.totalProcessed += records.length;
      result.totalInserted! += records.length;

      this.logger.log(`✅ ${records.length} novos registros inseridos`);
    } catch (error) {
      this.logger.error(`Erro ao inserir registros em lote:`, error);

      for (const record of records) {
        try {
          await this.gasStationRepository.save(record);
          result.totalProcessed++;
          result.totalInserted!++;
        } catch (individualError) {
          result.totalErrors++;
          result.errors.push({
            row: -1,
            data: {
              cnpj: record.cnpj,
              produto: record.produto.nome,
              data_coleta: record.data_coleta,
            },
            error: `Erro na inserção: ${individualError.message}`,
          });
        }
      }
    }
  }

  private async updateRecords(
    records: GasStation[],
    result: SaveResult,
  ): Promise<void> {
    try {
      await this.gasStationRepository.save(records, {
        chunk: 100,
        reload: false,
      });

      result.totalProcessed += records.length;
      result.totalUpdated! += records.length;

      this.logger.log(`🔄 ${records.length} registros atualizados`);
    } catch (error) {
      this.logger.error(`Erro ao atualizar registros em lote:`, error);

      for (const record of records) {
        try {
          await this.gasStationRepository.save(record);
          result.totalProcessed++;
          result.totalUpdated!++;
        } catch (individualError) {
          result.totalErrors++;
          result.errors.push({
            row: -1,
            data: {
              cnpj: record.cnpj,
              produto: record.produto.nome,
              data_coleta: record.data_coleta,
            },
            error: `Erro na atualização: ${individualError.message}`,
          });
        }
      }
    }
  }

  private compareDates(
    date1: Date,
    date2: Date,
  ): {
    isNewer: boolean;
    isSame: boolean;
    isOlder: boolean;
  } {
    const d1 = this.normalizeDate(date1);
    const d2 = this.normalizeDate(date2);

    const time1 = d1.getTime();
    const time2 = d2.getTime();

    return {
      isNewer: time1 > time2,
      isSame: time1 === time2,
      isOlder: time1 < time2,
    };
  }

  private isDateNewer(date1: Date, date2: Date): boolean {
    const d1 = this.normalizeDate(date1);
    const d2 = this.normalizeDate(date2);
    return d1.getTime() > d2.getTime();
  }

  private normalizeDate(date: Date | string): Date {
    if (date instanceof Date) {
      if (isNaN(date.getTime())) {
        throw new Error(`Data inválida: ${date}`);
      }
      return date;
    }

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      throw new Error(`String de data inválida: ${date}`);
    }

    return dateObj;
  }

  private formatDate(date: Date | string): string {
    try {
      const dateObj = this.normalizeDate(date);
      return dateObj.toLocaleDateString('pt-BR');
    } catch (error) {
      return `Data inválida: ${date}`;
    }
  }

  private createRecordKey(cnpj: string, produto_id: string): string {
    const normalizedCnpj = cnpj.replace(/[^\d]/g, '');
    return `${normalizedCnpj}|${produto_id}`;
  }

  private async handleBatchError(
    batch: GasStation[],
    result: SaveResult,
    startIndex: number,
    error: any,
  ): Promise<void> {
    this.logger.error(`Erro no lote, processando individualmente:`, error);

    for (const [index, entity] of batch.entries()) {
      try {
        const processed = await this.processSingleRecord(entity);
        result.totalProcessed++;

        switch (processed.action) {
          case 'inserted':
            result.totalInserted!++;
            break;
          case 'updated':
            result.totalUpdated!++;
            break;
          case 'skipped':
            result.totalSkipped!++;
            break;
        }
      } catch (individualError) {
        result.totalErrors++;
        result.errors.push({
          row: startIndex + index + 1,
          data: {
            cnpj: entity.cnpj,
            municipio: entity.localizacao.municipio,
            produto: entity.produto.nome,
            data_coleta: entity.data_coleta,
          },
          error: individualError.message,
        });

        this.logger.warn(
          `❌ Falha no registro individual (CNPJ: ${entity.cnpj}, Produto: ${entity.produto.nome}): ${individualError.message}`,
        );
      }
    }
  }

  private async processSingleRecord(
    entity: GasStation,
  ): Promise<{ action: 'inserted' | 'updated' | 'skipped' }> {
    const existingRecord = await this.gasStationRepository
      .createQueryBuilder('gs')
      .leftJoinAndSelect('gs.produto', 'produto')
      .where('gs.cnpj = :cnpj', { cnpj: entity.cnpj })
      .andWhere('gs.produto_id = :produto_id', { produto_id: entity.produto_id })
      .orderBy('gs.data_coleta', 'DESC')
      .getOne();

    if (!existingRecord) {
      await this.gasStationRepository.save(entity);
      this.logger.debug(
        `➕ Inserido: ${entity.cnpj} - ${entity.produto.nome} - ${this.formatDate(entity.data_coleta)}`,
      );
      return { action: 'inserted' };
    }

    const comparison = this.compareDates(
      entity.data_coleta,
      existingRecord.data_coleta,
    );

    if (comparison.isNewer) {
      entity.id = existingRecord.id;
      entity.criadoEm = existingRecord.criadoEm;
      await this.gasStationRepository.save(entity);
      this.logger.debug(
        `🔄 Atualizado: ${entity.cnpj} - ${entity.produto.nome} - ` +
          `${this.formatDate(existingRecord.data_coleta)} -> ${this.formatDate(entity.data_coleta)}`,
      );
      return { action: 'updated' };
    } else {
      const reason = comparison.isSame ? 'mesma data' : 'data mais antiga';
      this.logger.debug(
        `⏭️ Ignorado: ${entity.cnpj} - ${entity.produto.nome} - ` +
          `${this.formatDate(entity.data_coleta)} (${reason})`,
      );
      return { action: 'skipped' };
    }
  }
}