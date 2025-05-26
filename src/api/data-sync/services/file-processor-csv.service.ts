import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GasStation } from '@/database/entity/gas-station.entity';
import { GasStationBatchRepository } from '../repositories/gas-station-batch.repository';
import { CsvToGasStationMapper } from '../mappers/csv-to-gas-station.mapper';
import {
  responseOk,
  responseInternalServerError,
  responseBadRequest,
} from '@/common/utils/response-api';
import * as Papa from 'papaparse';
import * as fs from 'fs';
import * as path from 'path';
import {
  CsvRow,
  ProcessingResult,
} from '@/api/data-sync/interfaces/file-processor.interface';

@Injectable()
export class FileProcessorCsvService {
  private readonly logger = new Logger(FileProcessorCsvService.name);

  constructor(
    @InjectRepository(GasStation)
    private readonly batchRepository: GasStationBatchRepository,
    private readonly csvMapper: CsvToGasStationMapper,
  ) {}

  async processCsvFile(filePath: string) {
    const startTime = Date.now();
    
    try {
      const fullPath = path.resolve(process.cwd(), 'public', filePath);

      if (!fs.existsSync(fullPath)) {
        this.logger.error(`Arquivo não encontrado: ${fullPath}`);
        return responseBadRequest({
          error: 'Arquivo CSV não encontrado',
        });
      }

      this.logger.log(`Iniciando processamento do arquivo: ${filePath}`);
      
      const fileContent = fs.readFileSync(fullPath, 'utf8');
      const result = await this.processCsvContent(fileContent);

      const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
      
      this.logger.log(
        `Processamento concluído em ${processingTime}s: ` +
        `${result.totalProcessed} processados, ${result.totalErrors} erros`
      );

      return responseOk({
        message: `Processamento concluído: ${result.totalProcessed} registros processados`,
        data: {
          ...result,
          processingTimeSeconds: parseFloat(processingTime),
        },
      });
    } catch (error) {
      this.logger.error('Erro ao processar arquivo CSV:', error);
      return responseInternalServerError({
        message: 'Erro interno do servidor ao processar CSV',
        error: error.message,
      });
    }
  }

  private async processCsvContent(csvContent: string): Promise<ProcessingResult> {
    const result: ProcessingResult = {
      totalProcessed: 0,
      totalErrors: 0,
      errors: [],
    };

    try {
      // Pré-processar o CSV
      const cleanedCsvContent = this.preprocessCsvContent(csvContent);

      if (!cleanedCsvContent) {
        result.totalErrors++;
        result.errors.push({
          row: -1,
          data: null,
          error: 'Nenhum dado válido encontrado no arquivo CSV',
        });
        return result;
      }

      return new Promise((resolve) => {
        Papa.parse<CsvRow>(cleanedCsvContent, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: false,
          delimiter: ',',
          transformHeader: (header: string) => header.trim(),
          complete: async (parseResult) => {
            try {
              this.logger.log(`Parse concluído. Linhas encontradas: ${parseResult.data.length}`);

              if (parseResult.errors?.length > 0) {
                this.logger.warn(`Avisos do parser:`, parseResult.errors);
              }

              // Filtrar e validar linhas
              const validRows = this.filterAndValidateRows(parseResult.data, result);
              this.logger.log(`Linhas válidas após filtro: ${validRows.length}`);

              if (validRows.length === 0) {
                result.totalErrors++;
                result.errors.push({
                  row: -1,
                  data: null,
                  error: 'Nenhuma linha válida encontrada após filtragem',
                });
                resolve(result);
                return;
              }

              // Mapear para entidades
              const gasStations = this.mapAndValidateEntities(validRows, result);
              this.logger.log(`Entidades válidas criadas: ${gasStations.length}`);

              if (gasStations.length > 0) {
                // Usar o repository de lote aprimorado
                const saveResult = await this.batchRepository.saveInBatches(gasStations);
                
                // Consolidar resultados
                result.totalProcessed = saveResult.totalProcessed;
                result.totalErrors += saveResult.totalErrors;
                result.errors.push(...saveResult.errors);

                // Adicionar informações detalhadas do processamento
                (result as any).totalInserted = saveResult.totalInserted;
                (result as any).totalUpdated = saveResult.totalUpdated;
                (result as any).totalSkipped = saveResult.totalSkipped;
              }

              this.logger.log(
                `Processamento final: ${result.totalProcessed} processados, ` +
                `${(result as any).totalInserted || 0} inseridos, ` +
                `${(result as any).totalUpdated || 0} atualizados, ` +
                `${(result as any).totalSkipped || 0} ignorados, ` +
                `${result.totalErrors} erros`
              );

              resolve(result);
            } catch (error) {
              this.logger.error('Erro durante o processamento:', error);
              result.totalErrors++;
              result.errors.push({
                row: -1,
                data: null,
                error: `Erro geral: ${error.message}`,
              });
              resolve(result);
            }
          },
          error: (error) => {
            this.logger.error('Erro ao fazer parse do CSV:', error);
            result.totalErrors++;
            result.errors.push({
              row: -1,
              data: null,
              error: `Erro de parse: ${error.message}`,
            });
            resolve(result);
          },
        });
      });
    } catch (error) {
      this.logger.error('Erro no pré-processamento:', error);
      result.totalErrors++;
      result.errors.push({
        row: -1,
        data: null,
        error: `Erro no pré-processamento: ${error.message}`,
      });
      return result;
    }
  }

  private preprocessCsvContent(csvContent: string): string | null {
    try {
      const lines = csvContent.split('\n');
      this.logger.log(`Total de linhas no arquivo: ${lines.length}`);

      // Encontrar a linha que contém os cabeçalhos
      let headerLineIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (
          line.includes('CNPJ') &&
          line.includes('RAZÃO') &&
          line.includes('FANTASIA')
        ) {
          headerLineIndex = i;
          break;
        }
      }

      if (headerLineIndex === -1) {
        this.logger.error('Cabeçalho dos dados não encontrado');
        return null;
      }

      this.logger.log(`Cabeçalho encontrado na linha: ${headerLineIndex + 1}`);

      // Extrair linhas de dados
      const dataLines = lines.slice(headerLineIndex);
      const validLines = dataLines.filter((line) => {
        const trimmed = line.trim();
        return trimmed.length > 0 && trimmed !== ',' && !trimmed.match(/^,+$/);
      });

      this.logger.log(`Linhas válidas extraídas: ${validLines.length}`);

      if (validLines.length <= 1) {
        this.logger.error('Nenhuma linha de dados encontrada após o cabeçalho');
        return null;
      }

      return validLines.join('\n');
    } catch (error) {
      this.logger.error('Erro no pré-processamento do CSV:', error);
      return null;
    }
  }

  private filterAndValidateRows(rows: CsvRow[], result: ProcessingResult): CsvRow[] {
    const validRows: CsvRow[] = [];

    rows.forEach((row, index) => {
      try {
        // Validações básicas
        const hasValidCnpj = this.isValidCnpj(row.CNPJ);
        const hasValidMunicipio = this.isValidString(row.MUNICÍPIO, 'MUNICÍPIO');
        const hasValidProduto = this.isValidString(row.PRODUTO, 'PRODUTO');
        const hasValidEstado = this.isValidString(row.ESTADO, 'ESTADO');
        const hasValidDataColeta = this.isValidString(row['DATA DA COLETA'], 'DATA DA COLETA');

        if (hasValidCnpj && hasValidMunicipio && hasValidProduto && hasValidEstado && hasValidDataColeta) {
          validRows.push(row);
        } else {
          this.logger.debug(
            `Linha ${index + 1} inválida - CNPJ: "${row.CNPJ}", ` +
            `MUNICÍPIO: "${row.MUNICÍPIO}", PRODUTO: "${row.PRODUTO}", ` +
            `ESTADO: "${row.ESTADO}", DATA: "${row['DATA DA COLETA']}"`
          );
        }
      } catch (error) {
        this.logger.warn(`Erro ao validar linha ${index + 1}:`, error);
        result.totalErrors++;
        result.errors.push({
          row: index + 1,
          data: row,
          error: `Erro na validação: ${error.message}`,
        });
      }
    });

    return validRows;
  }

  private mapAndValidateEntities(rows: CsvRow[], result: ProcessingResult): GasStation[] {
    const gasStations: GasStation[] = [];

    rows.forEach((row, index) => {
      try {
        const gasStation = this.csvMapper.map(row);
        
        // Validação adicional da entidade mapeada
        if (this.validateEntity(gasStation)) {
          gasStations.push(gasStation);
        } else {
          throw new Error('Entidade inválida após mapeamento');
        }
      } catch (error) {
        result.totalErrors++;
        result.errors.push({
          row: index + 1,
          data: row,
          error: `Erro no mapeamento: ${error.message}`,
        });
        this.logger.warn(`Erro ao mapear linha ${index + 1}: ${error.message}`);
      }
    });

    return gasStations;
  }

  private isValidCnpj(cnpj: string): boolean {
    if (!cnpj || typeof cnpj !== 'string') return false;
    
    const trimmed = cnpj.trim();
    return trimmed.length > 0 && 
           trimmed !== 'CNPJ' &&
           !trimmed.includes('AGÊNCIA NACIONAL') &&
           !trimmed.includes('SUPERINTENDÊNCIA') &&
           !trimmed.includes('SISTEMA DE');
  }

  private isValidString(value: string, fieldName: string): boolean {
    if (!value || typeof value !== 'string') return false;
    
    const trimmed = value.trim();
    return trimmed.length > 0 && 
           trimmed.toUpperCase() !== fieldName.toUpperCase();
  }

  private validateEntity(entity: GasStation): boolean {
    return !!(
      entity.cnpj &&
      entity.uf &&
      entity.municipio &&
      entity.nome &&
      entity.produto &&
      entity.data_coleta
    );
  }
}