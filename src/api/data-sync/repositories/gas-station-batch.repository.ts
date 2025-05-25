import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GasStation } from '@/database/entity/gas-station.entity';
import { IDataRepository, type SaveResult } from '../interfaces/file-processor.interface';

@Injectable()
export class GasStationBatchRepository implements IDataRepository<GasStation> {
  private readonly logger = new Logger(GasStationBatchRepository.name);

  constructor(
    @InjectRepository(GasStation)
    private readonly repository: Repository<GasStation>
  ) {}

  async saveInBatches(entities: GasStation[], batchSize = 500): Promise<SaveResult> {
    const result: SaveResult = {
      totalProcessed: 0,
      totalErrors: 0,
      errors: []
    };

    for (let i = 0; i < entities.length; i += batchSize) {
      const batch = entities.slice(i, i + batchSize);
      await this.processBatch(batch, result, i);
    }

    return result;
  }

  private async processBatch(
    batch: GasStation[], 
    result: SaveResult, 
    startIndex: number
  ): Promise<void> {
    try {
      await this.repository.save(batch, { chunk: 100, reload: false });
      result.totalProcessed += batch.length;
      
      this.logger.log(`Processed batch: ${batch.length} records`);
    } catch (error) {
      await this.handleBatchError(batch, result, startIndex, error);
    }
  }

  private async handleBatchError(
    batch: GasStation[], 
    result: SaveResult, 
    startIndex: number, 
    error: any
  ): Promise<void> {
    // Individual save fallback
    for (const [index, entity] of batch.entries()) {
      try {
        await this.repository.save(entity);
        result.totalProcessed++;
      } catch (individualError) {
        result.totalErrors++;
        result.errors.push({
          row: startIndex + index + 1,
          data: { cnpj: entity.cnpj, municipio: entity.municipio },
          error: individualError.message
        });
      }
    }
  }
}