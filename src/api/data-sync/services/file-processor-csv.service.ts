import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GasStation } from '@/database/entity/gas-station.entity';
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
    private readonly gasStationRepository: Repository<GasStation>,
  ) {}

  async processCsvFile(filePath: string) {
    try {
      const fullPath = path.join(process.cwd(), 'public', filePath);

      if (!fs.existsSync(fullPath)) {
        this.logger.error(`Arquivo não encontrado: ${fullPath}`);
        return responseBadRequest({
          error: 'Arquivo CSV não encontrado',
        });
      }

      const fileContent = fs.readFileSync(fullPath, 'utf8');
      const result = await this.processCsvContent(fileContent);

      return responseOk({
        message: `${result.totalProcessed} registros processados com sucesso`,
        data: result,
      });
    } catch (error) {
      this.logger.error('Erro ao processar arquivo CSV:', error);
      return responseInternalServerError({
        message: 'Erro interno do servidor ao processar CSV',
      });
    }
  }

  private async processCsvContent(
    csvContent: string,
  ): Promise<ProcessingResult> {
    const result: ProcessingResult = {
      totalProcessed: 0,
      totalErrors: 0,
      errors: [],
    };

    try {
      // Pré-processar o CSV para remover linhas de cabeçalho e metadados
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
              this.logger.log(
                `Parse concluído. Linhas encontradas: ${parseResult.data.length}`,
              );

              if (parseResult.errors && parseResult.errors.length > 0) {
                this.logger.warn(`Avisos do parser: `, parseResult.errors);
              }

              const validRows = this.filterValidRows(parseResult.data);
              this.logger.log(
                `Linhas válidas após filtro: ${validRows.length}`,
              );

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

              const gasStations = this.mapCsvToEntities(validRows, result);
              this.logger.log(`Entidades criadas: ${gasStations.length}`);

              if (gasStations.length > 0) {
                await this.saveGasStations(gasStations, result);
              }

              this.logger.log(
                `Processamento concluído: ${result.totalProcessed} sucessos, ${result.totalErrors} erros`,
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

      // Encontrar a linha que contém os cabeçalhos reais dos dados
      let headerLineIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Procurar pela linha que contém CNPJ,RAZÃO,FANTASIA...
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

      // Extrair apenas as linhas de dados (cabeçalho + dados)
      const dataLines = lines.slice(headerLineIndex);

      // Filtrar linhas vazias ou que contenham apenas vírgulas
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

  private filterValidRows(rows: CsvRow[]): CsvRow[] {
    return rows.filter((row, index) => {
      try {
        // Verificar se é uma linha válida com dados reais
        const hasValidCnpj =
          row.CNPJ &&
          row.CNPJ.trim() !== '' &&
          row.CNPJ.trim() !== 'CNPJ' &&
          !row.CNPJ.includes('AGÊNCIA NACIONAL') &&
          !row.CNPJ.includes('SUPERINTENDÊNCIA') &&
          !row.CNPJ.includes('SISTEMA DE');

        const hasValidMunicipio =
          row.MUNICÍPIO &&
          row.MUNICÍPIO.trim() !== '' &&
          row.MUNICÍPIO.trim() !== 'MUNICÍPIO';

        const hasValidProduto =
          row.PRODUTO &&
          row.PRODUTO.trim() !== '' &&
          row.PRODUTO.trim() !== 'PRODUTO';

        const isValid = hasValidCnpj && hasValidMunicipio && hasValidProduto;

        if (!isValid) {
          this.logger.debug(
            `Linha ${index + 1} filtrada - CNPJ: "${row.CNPJ}", MUNICÍPIO: "${row.MUNICÍPIO}", PRODUTO: "${row.PRODUTO}"`,
          );
        }

        return isValid;
      } catch (error) {
        this.logger.warn(`Erro ao filtrar linha ${index + 1}:`, error);
        return false;
      }
    });
  }

  private mapCsvToEntities(
    rows: CsvRow[],
    result: ProcessingResult,
  ): GasStation[] {
    const gasStations: GasStation[] = [];

    rows.forEach((row, index) => {
      try {
        const gasStation = this.createGasStationFromRow(row);
        if (gasStation) {
          gasStations.push(gasStation);
        }
      } catch (error) {
        result.totalErrors++;
        result.errors.push({
          row: index + 1,
          data: row,
          error: error.message,
        });
        this.logger.warn(
          `Erro ao processar linha ${index + 1}: ${error.message}`,
        );
      }
    });

    return gasStations;
  }

  private createGasStationFromRow(row: CsvRow): GasStation | null {
    try {
      const gasStation = new GasStation();

      // Limpa e valida CNPJ
      const cleanedCnpj = this.cleanCnpj(row.CNPJ);
      if (!cleanedCnpj) {
        throw new Error(`CNPJ inválido: "${row.CNPJ}"`);
      }
      gasStation.cnpj = cleanedCnpj;

      // Campos obrigatórios - validar antes de atribuir
      const cleanedUf = this.cleanString(row.ESTADO)?.toUpperCase();
      if (!cleanedUf) {
        throw new Error(`Estado inválido: "${row.ESTADO}"`);
      }
      gasStation.uf = cleanedUf;

      const cleanedMunicipio = this.cleanString(row.MUNICÍPIO);
      if (!cleanedMunicipio) {
        throw new Error(`Município inválido: "${row.MUNICÍPIO}"`);
      }
      gasStation.municipio = cleanedMunicipio;

      const cleanedFantasia = this.cleanString(row.FANTASIA);
      const cleanedRazao = this.cleanString(row.RAZÃO);

      const nomePosto = cleanedFantasia ?? cleanedRazao;

      if (!nomePosto) {
        throw new Error(
          `Revenda inválida: FANTASIA="${row.FANTASIA}", RAZÃO="${row.RAZÃO}"`,
        );
      }
      gasStation.nome = nomePosto;

      const cleanedProduto = this.cleanString(row.PRODUTO);
      if (!cleanedProduto) {
        throw new Error(`Produto inválido: "${row.PRODUTO}"`);
      }
      gasStation.produto = cleanedProduto;

      // Data da coleta
      const parsedDate = this.parseDate(row['DATA DA COLETA']);
      if (!parsedDate) {
        throw new Error(`Data de coleta inválida: "${row['DATA DA COLETA']}"`);
      }
      gasStation.data_coleta = parsedDate;

      // Preço de venda
      const precoRevenda = this.parsePrice(row['PREÇO DE REVENDA']);
      if (precoRevenda !== null && precoRevenda > 0) {
        gasStation.preco_venda = precoRevenda;
      }

      // Campos opcionais
      gasStation.bandeira = this.cleanString(row.BANDEIRA);
      gasStation.unidade_medida = this.cleanString(row['UNIDADE DE MEDIDA']);
      gasStation.endereco = this.buildAddress(row);
      gasStation.bairro = this.cleanString(row.BAIRRO);
      gasStation.cep = this.cleanString(row.CEP);

      return gasStation;
    } catch (error) {
      throw new Error(`Erro ao criar entidade: ${error.message}`);
    }
  }

  private cleanCnpj(cnpj: string): string | null {
    if (!cnpj || typeof cnpj !== 'string') return null;

    // Remove espaços extras no início/fim
    const trimmed = cnpj.trim();
    if (!trimmed) return null;

    // Se já está formatado, valida e retorna
    if (
      trimmed.includes('.') ||
      trimmed.includes('/') ||
      trimmed.includes('-')
    ) {
      // Remove formatação para validar
      const cleaned = trimmed.replace(/[^\d]/g, '');
      if (cleaned.length === 14) {
        return trimmed; // Retorna com a formatação original
      }
      return null;
    }

    // Se são apenas números, valida e formata
    const cleaned = trimmed.replace(/[^\d]/g, '');
    if (cleaned.length === 14) {
      return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12)}`;
    }

    return null;
  }

  private cleanString(value: string): string | null {
    if (!value || typeof value !== 'string') return null;
    const cleaned = value.trim();
    return cleaned.length > 0 ? cleaned : null;
  }

  private parseDate(dateString: string): Date | null {
    if (!dateString || typeof dateString !== 'string') return null;

    try {
      const trimmed = dateString.trim();

      // Formato M/D/YYYY (como 5/20/2025)
      const mdyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (mdyMatch) {
        const [, month, day, year] = mdyMatch;
        const date = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
        );
        if (!isNaN(date.getTime())) {
          return date;
        }
      }

      // Formato DD/MM/YYYY
      const dmyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (dmyMatch) {
        const [, day, month, year] = dmyMatch;
        const date = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
        );
        if (!isNaN(date.getTime())) {
          return date;
        }
      }

      // Formato YYYY-MM-DD
      const ymdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (ymdMatch) {
        const [, year, month, day] = ymdMatch;
        const date = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
        );
        if (!isNaN(date.getTime())) {
          return date;
        }
      }

      // Fallback para Date.parse
      const parsed = new Date(trimmed);
      return isNaN(parsed.getTime()) ? null : parsed;
    } catch (error) {
      this.logger.warn(`Erro ao fazer parse da data "${dateString}":`, error);
      return null;
    }
  }

  private parsePrice(priceString: string): number | null {
    if (!priceString || typeof priceString !== 'string') return null;

    try {
      let cleaned = priceString.trim();

      // Remove símbolos de moeda e outros caracteres não numéricos, mantendo vírgula e ponto
      cleaned = cleaned
        .replace(/[R$\s]/g, '') // Remove R$, espaços
        .replace(/[^\d,.-]/g, '') // Mantém apenas dígitos, vírgula, ponto e hífen
        .replace(/,(\d{2})$/, '.$1') // Converte vírgula decimal para ponto (ex: "115,00" -> "115.00")
        .replace(/,/g, ''); // Remove vírgulas restantes (milhares)

      const parsed = parseFloat(cleaned);
      return isNaN(parsed) || parsed < 0 ? null : parsed;
    } catch (error) {
      this.logger.warn(`Erro ao fazer parse do preço "${priceString}":`, error);
      return null;
    }
  }

  private buildAddress(row: CsvRow): string | null {
    const parts = [
      this.cleanString(row.ENDEREÇO),
      this.cleanString(row.NÚMERO),
      this.cleanString(row.COMPLEMENTO),
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(', ') : null;
  }

  private async saveGasStations(
    gasStations: GasStation[],
    result: ProcessingResult,
  ): Promise<void> {
    const batchSize = 500; // Reduzido para melhor controle

    for (let i = 0; i < gasStations.length; i += batchSize) {
      const batch = gasStations.slice(i, i + batchSize);

      try {
        // Usar upsert para evitar duplicatas baseado em CNPJ + produto + data
        await this.gasStationRepository.save(batch, {
          chunk: 100,
          reload: false, // Não recarrega os dados após salvar
        });

        result.totalProcessed += batch.length;

        this.logger.log(
          `Processado lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(gasStations.length / batchSize)}: ${batch.length} registros`,
        );
      } catch (error) {
        this.logger.error(
          `Erro ao salvar lote ${Math.floor(i / batchSize) + 1}:`,
          error,
        );

        // Tenta salvar individualmente para identificar registros problemáticos
        for (const [index, gasStation] of batch.entries()) {
          try {
            await this.gasStationRepository.save(gasStation);
            result.totalProcessed++;
          } catch (individualError) {
            result.totalErrors++;
            result.errors.push({
              row: i + index + 1,
              data: {
                cnpj: gasStation.cnpj,
                municipio: gasStation.municipio,
                produto: gasStation.produto,
              },
              error: individualError.message,
            });
            this.logger.warn(
              `Erro ao salvar registro individual (CNPJ: ${gasStation.cnpj}):`,
              individualError.message,
            );
          }
        }
      }
    }
  }
}
