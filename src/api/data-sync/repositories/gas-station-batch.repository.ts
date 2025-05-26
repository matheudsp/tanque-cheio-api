import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GasStation } from '@/database/entity/gas-station.entity';
import {
  IDataRepository,
  type SaveResult,
} from '../interfaces/file-processor.interface';

@Injectable()
export class GasStationBatchRepository implements IDataRepository<GasStation> {
  private readonly logger = new Logger(GasStationBatchRepository.name);

  constructor(
    @InjectRepository(GasStation)
    private readonly repository: Repository<GasStation>,
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

    // Log inicial
    this.logger.log(`Iniciando processamento de ${entities.length} registros em lotes de ${batchSize}`);

    for (let i = 0; i < entities.length; i += batchSize) {
      const batch = entities.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(entities.length / batchSize);
      
      this.logger.log(`Processando lote ${batchNumber}/${totalBatches} (${batch.length} registros)`);
      
      await this.processBatchWithUpsert(batch, result, i);
    }

    // Log final
    this.logger.log(
      `Processamento concluído: ${result.totalInserted} inseridos, ` +
      `${result.totalUpdated} atualizados, ${result.totalSkipped} ignorados, ` +
      `${result.totalErrors} erros`
    );

    return result;
  }

  private async processBatchWithUpsert(
    batch: GasStation[],
    result: SaveResult,
    startIndex: number,
  ): Promise<void> {
    try {
      // Buscar registros existentes para comparação
      const existingRecords = await this.findExistingRecords(batch);
      const recordsToProcess = await this.categorizeRecords(batch, existingRecords);

      // Processar inserções
      if (recordsToProcess.toInsert.length > 0) {
        await this.insertRecords(recordsToProcess.toInsert, result);
      }

      // Processar atualizações
      if (recordsToProcess.toUpdate.length > 0) {
        await this.updateRecords(recordsToProcess.toUpdate, result);
      }

      // Contabilizar registros ignorados
      if (recordsToProcess.skipped.length > 0) {
        result.totalSkipped! += recordsToProcess.skipped.length;
        this.logger.debug(
          `Ignorados ${recordsToProcess.skipped.length} registros (data_coleta não é mais recente)`
        );
      }

    } catch (error) {
      this.logger.error(`Erro no processamento do lote:`, error);
      await this.handleBatchError(batch, result, startIndex, error);
    }
  }

  private async findExistingRecords(batch: GasStation[]): Promise<Map<string, GasStation>> {
    if (batch.length === 0) return new Map();

    // Extrair combinações únicas de CNPJ + PRODUTO
    const uniqueKeys = new Set(batch.map(entity => 
      this.createRecordKey(entity.cnpj, entity.produto)
    ));

    const cnpjs = [...new Set(batch.map(entity => entity.cnpj))];
    const produtos = [...new Set(batch.map(entity => entity.produto))];

    this.logger.debug(
      `Buscando registros existentes para ${cnpjs.length} CNPJs únicos e ${produtos.length} produtos únicos`
    );

    // Buscar todos os registros existentes para os CNPJs e produtos do lote
    const existingRecords = await this.repository
      .createQueryBuilder('gs')
      .where('gs.cnpj IN (:...cnpjs)', { cnpjs })
      .andWhere('gs.produto IN (:...produtos)', { produtos })
      .orderBy('gs.data_coleta', 'DESC') // Ordenar por data mais recente primeiro
      .getMany();

    this.logger.debug(`Encontrados ${existingRecords.length} registros existentes no banco`);

    // Criar mapa mantendo apenas o registro mais recente por CNPJ + PRODUTO
    const recordMap = new Map<string, GasStation>();
    
    existingRecords.forEach((record) => {
      const key = this.createRecordKey(record.cnpj, record.produto);
      
      // Se ainda não existe entrada para esta chave, ou se este registro é mais recente
      const existing = recordMap.get(key);
      if (!existing || this.isDateNewer(record.data_coleta, existing.data_coleta)) {
        recordMap.set(key, record);
      }
    });

    this.logger.debug(
      `Mapa criado com ${recordMap.size} combinações únicas de CNPJ+Produto`
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
      const key = this.createRecordKey(newRecord.cnpj, newRecord.produto);
      const existingRecord = existingRecords.get(key);

      if (!existingRecord) {
        // Não existe registro para este CNPJ + PRODUTO
        toInsert.push(newRecord);
        this.logger.debug(
          `[INSERIR] CNPJ: ${newRecord.cnpj}, Produto: ${newRecord.produto}, ` +
          `Data: ${this.formatDate(newRecord.data_coleta)}`
        );
      } else {
        // Existe registro, verificar datas
        const comparison = this.compareDates(newRecord.data_coleta, existingRecord.data_coleta);
        
        if (comparison.isNewer) {
          // CSV tem data mais recente - atualizar
          newRecord.id = existingRecord.id;
          newRecord.criadoEm = existingRecord.criadoEm;
          toUpdate.push(newRecord);
          this.logger.debug(
            `[ATUALIZAR] CNPJ: ${newRecord.cnpj}, Produto: ${newRecord.produto}, ` +
            `Data BD: ${this.formatDate(existingRecord.data_coleta)} -> ` +
            `Data CSV: ${this.formatDate(newRecord.data_coleta)}`
          );
        } else if (comparison.isSame) {
          // Mesma data - ignorar
          skipped.push(newRecord);
          this.logger.debug(
            `[IGNORAR] CNPJ: ${newRecord.cnpj}, Produto: ${newRecord.produto}, ` +
            `Data: ${this.formatDate(newRecord.data_coleta)} (mesma data)`
          );
        } else {
          // CSV tem data mais antiga - ignorar
          skipped.push(newRecord);
          this.logger.debug(
            `[IGNORAR] CNPJ: ${newRecord.cnpj}, Produto: ${newRecord.produto}, ` +
            `Data CSV: ${this.formatDate(newRecord.data_coleta)} é anterior à ` +
            `Data BD: ${this.formatDate(existingRecord.data_coleta)}`
          );
        }
      }
    }

    this.logger.debug(
      `Categorização: ${toInsert.length} inserções, ${toUpdate.length} atualizações, ${skipped.length} ignorados`
    );

    return { toInsert, toUpdate, skipped };
  }

  private async insertRecords(records: GasStation[], result: SaveResult): Promise<void> {
    try {
      await this.repository.save(records, {
        chunk: 100,
        reload: false,
      });
      
      result.totalProcessed += records.length;
      result.totalInserted! += records.length;
      
      this.logger.log(`✅ ${records.length} novos registros inseridos`);
    } catch (error) {
      this.logger.error(`Erro ao inserir registros em lote:`, error);
      
      // Tentar inserção individual
      for (const record of records) {
        try {
          await this.repository.save(record);
          result.totalProcessed++;
          result.totalInserted!++;
        } catch (individualError) {
          result.totalErrors++;
          result.errors.push({
            row: -1,
            data: {
              cnpj: record.cnpj,
              produto: record.produto,
              data_coleta: record.data_coleta,
            },
            error: `Erro na inserção: ${individualError.message}`,
          });
        }
      }
    }
  }

  private async updateRecords(records: GasStation[], result: SaveResult): Promise<void> {
    try {
      await this.repository.save(records, {
        chunk: 100,
        reload: false,
      });
      
      result.totalProcessed += records.length;
      result.totalUpdated! += records.length;
      
      this.logger.log(`🔄 ${records.length} registros atualizados`);
    } catch (error) {
      this.logger.error(`Erro ao atualizar registros em lote:`, error);
      
      // Tentar atualização individual
      for (const record of records) {
        try {
          await this.repository.save(record);
          result.totalProcessed++;
          result.totalUpdated!++;
        } catch (individualError) {
          result.totalErrors++;
          result.errors.push({
            row: -1,
            data: {
              cnpj: record.cnpj,
              produto: record.produto,
              data_coleta: record.data_coleta,
            },
            error: `Erro na atualização: ${individualError.message}`,
          });
        }
      }
    }
  }

  private compareDates(date1: Date, date2: Date): {
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
      // Verificar se a data é válida
      if (isNaN(date.getTime())) {
        throw new Error(`Data inválida: ${date}`);
      }
      return date;
    }
    
    // Se for string, tentar converter
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

  private createRecordKey(cnpj: string, produto: string): string {
    // Chave única baseada em CNPJ + PRODUTO
    // Normalizar CNPJ removendo formatação para garantir consistência
    const normalizedCnpj = cnpj.replace(/[^\d]/g, '');
    return `${normalizedCnpj}|${produto.trim().toUpperCase()}`;
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
            municipio: entity.municipio,
            produto: entity.produto,
            data_coleta: entity.data_coleta,
          },
          error: individualError.message,
        });
        
        this.logger.warn(
          `❌ Falha no registro individual (CNPJ: ${entity.cnpj}, Produto: ${entity.produto}): ${individualError.message}`,
        );
      }
    }
  }

  private async processSingleRecord(
    entity: GasStation
  ): Promise<{ action: 'inserted' | 'updated' | 'skipped' }> {
    // Buscar o registro mais recente para este CNPJ + PRODUTO
    const existingRecord = await this.repository
      .createQueryBuilder('gs')
      .where('gs.cnpj = :cnpj', { cnpj: entity.cnpj })
      .andWhere('gs.produto = :produto', { produto: entity.produto })
      .orderBy('gs.data_coleta', 'DESC')
      .getOne();

    if (!existingRecord) {
      // Inserir novo registro
      await this.repository.save(entity);
      this.logger.debug(
        `➕ Inserido: ${entity.cnpj} - ${entity.produto} - ${this.formatDate(entity.data_coleta)}`,
      );
      return { action: 'inserted' };
    }

    // Comparar datas
    const comparison = this.compareDates(entity.data_coleta, existingRecord.data_coleta);
    
    if (comparison.isNewer) {
      // Atualizar registro existente
      entity.id = existingRecord.id;
      entity.criadoEm = existingRecord.criadoEm;
      await this.repository.save(entity);
      this.logger.debug(
        `🔄 Atualizado: ${entity.cnpj} - ${entity.produto} - ` +
        `${this.formatDate(existingRecord.data_coleta)} -> ${this.formatDate(entity.data_coleta)}`,
      );
      return { action: 'updated' };
    } else {
      // Pular registro (data não é mais recente)
      const reason = comparison.isSame ? 'mesma data' : 'data mais antiga';
      this.logger.debug(
        `⏭️ Ignorado: ${entity.cnpj} - ${entity.produto} - ` +
        `${this.formatDate(entity.data_coleta)} (${reason})`,
      );
      return { action: 'skipped' };
    }
  }
}