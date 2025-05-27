import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GasStation } from '@/database/entity/gas-station.entity';
import { Localization } from '@/database/entity/localization.entity';
import { Product } from '@/database/entity/product.entity';
import { PriceHistory } from '@/database/entity/price-history.entity';
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
    @InjectRepository(Localization)
    private readonly localizationRepository: Repository<Localization>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(PriceHistory)
    private readonly priceHistoryRepository: Repository<PriceHistory>,
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
          `${result.totalProcessed} processados, ${result.totalErrors} erros`,
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

  private async processCsvContent(
    csvContent: string,
  ): Promise<ProcessingResult> {
    const result: ProcessingResult = {
      totalProcessed: 0,
      totalErrors: 0,
      totalInserted: 0,
      totalUpdated: 0,
      totalSkipped: 0,
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
              this.logger.log(
                `Parse concluído. Linhas encontradas: ${parseResult.data.length}`,
              );

              if (parseResult.errors?.length > 0) {
                this.logger.warn(`Avisos do parser:`, parseResult.errors);
              }

              // Filtrar e validar linhas
              const validRows = this.filterAndValidateRows(
                parseResult.data,
                result,
              );
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

              // Processar as linhas em lotes
              await this.processRowsInBatches(validRows, result);

              this.logger.log(
                `Processamento final: ${result.totalProcessed} processados, ` +
                  `${result.totalInserted} inseridos, ` +
                  `${result.totalUpdated} atualizados, ` +
                  `${result.totalSkipped} ignorados, ` +
                  `${result.totalErrors} erros`,
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

  private async processRowsInBatches(
    rows: CsvRow[],
    result: ProcessingResult,
    batchSize: number = 100,
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
    const queryRunner = this.gasStationRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (let i = 0; i < batch.length; i++) {
        const row = batch[i];
        const rowIndex = startIndex + i + 1;

        try {
          await this.processRow(row, queryRunner, result);
          result.totalProcessed++;
        } catch (error) {
          result.totalErrors++;
          result.errors.push({
            row: rowIndex,
            data: row,
            error: error.message,
          });
          this.logger.warn(`Erro ao processar linha ${rowIndex}: ${error.message}`);
        }
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Erro ao processar lote:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async processRow(row: CsvRow, queryRunner: any, result: ProcessingResult): Promise<void> {
    // 1. Processar/criar localização
    const localization = await this.findOrCreateLocalization(row, queryRunner);

    // 2. Processar/criar produto
    const product = await this.findOrCreateProduct(row, queryRunner);

    // 3. Processar/criar posto de gasolina
    const gasStation = await this.findOrCreateGasStation(row, localization, queryRunner);

    // 4. Processar histórico de preços
    await this.createOrUpdatePriceHistory(row, gasStation, product, queryRunner, result);
  }

  private async findOrCreateLocalization(row: CsvRow, queryRunner: any): Promise<Localization> {
    const localizationData = {
      uf: row.ESTADO?.trim().toUpperCase(),
      municipio: row.MUNICÍPIO?.trim(),
      endereco: row.ENDEREÇO?.trim() || null,
      numero: row.NÚMERO?.trim() || null,
      complemento: row.COMPLEMENTO?.trim() || null,
      bairro: row.BAIRRO?.trim() || null,
      cep: this.formatCep(row.CEP),
    };

    // Buscar localização existente usando a chave única
    const tempLocalization = new Localization();
    Object.assign(tempLocalization, localizationData);
    const locationKey = tempLocalization.getLocationKey();

    let existingLocalization = await queryRunner.manager
      .createQueryBuilder(Localization, 'loc')
      .where('loc.uf = :uf AND loc.municipio = :municipio', {
        uf: localizationData.uf,
        municipio: localizationData.municipio,
      })
      .andWhere(
        '(loc.endereco = :endereco OR (loc.endereco IS NULL AND :endereco IS NULL))',
        { endereco: localizationData.endereco },
      )
      .andWhere(
        '(loc.numero = :numero OR (loc.numero IS NULL AND :numero IS NULL))',
        { numero: localizationData.numero },
      )
      .getOne();

    if (!existingLocalization) {
      const newLocalization = queryRunner.manager.create(Localization, localizationData);
      if (!newLocalization.isValid()) {
        throw new Error(`Dados de localização inválidos: ${JSON.stringify(localizationData)}`);
      }
      existingLocalization = await queryRunner.manager.save(newLocalization);
    }

    return existingLocalization;
  }

  private async findOrCreateProduct(row: CsvRow, queryRunner: any): Promise<Product> {
    const normalizedName = Product.normalizeName(row.PRODUTO?.trim() || '');
    
    if (!normalizedName) {
      throw new Error('Nome do produto é obrigatório');
    }

    let existingProduct = await queryRunner.manager.findOne(Product, {
      where: { nome: normalizedName },
    });

    if (!existingProduct) {
      const productData = {
        nome: normalizedName,
        categoria: Product.determineCategory(normalizedName),
        unidade_medida: Product.determineUnit(normalizedName),
        descricao: null,
        ativo: true,
      };

      const newProduct = queryRunner.manager.create(Product, productData);
      if (!newProduct.isValid()) {
        throw new Error(`Dados do produto inválidos: ${JSON.stringify(productData)}`);
      }
      existingProduct = await queryRunner.manager.save(newProduct);
    }

    return existingProduct;
  }

  private async findOrCreateGasStation(
    row: CsvRow,
    localization: Localization,
    queryRunner: any,
  ): Promise<GasStation> {
    const normalizedCnpj = this.normalizeCnpj(row.CNPJ);
    
    if (!GasStation.validateCnpj(normalizedCnpj)) {
      throw new Error(`CNPJ inválido: ${row.CNPJ}`);
    }

    let existingGasStation = await queryRunner.manager.findOne(GasStation, {
      where: { cnpj: normalizedCnpj },
    });

    if (!existingGasStation) {
      const gasStationData = {
        nome: GasStation.normalizeName(row.RAZÃO?.trim() || ''),
        nome_fantasia: row.FANTASIA?.trim() || null,
        bandeira: row.BANDEIRA?.trim() || null,
        cnpj: normalizedCnpj,
        ativo: true,
        localizacao: localization,
        localizacao_id: localization.id,
        bandeira_id: null,
      };

      const newGasStation = queryRunner.manager.create(GasStation, gasStationData);
      if (!newGasStation.isValid()) {
        throw new Error(`Dados do posto inválidos: ${JSON.stringify(gasStationData)}`);
      }
      existingGasStation = await queryRunner.manager.save(newGasStation);
    }

    return existingGasStation;
  }

  private async createOrUpdatePriceHistory(
    row: CsvRow,
    gasStation: GasStation,
    product: Product,
    queryRunner: any,
    result: ProcessingResult,
  ): Promise<void> {
    const dataColeta = this.parseDate(row['DATA DA COLETA']);
    const precoVenda = this.parsePrice(row['PREÇO DE REVENDA']);

    if (!dataColeta) {
      throw new Error(`Data de coleta inválida: ${row['DATA DA COLETA']}`);
    }

    const upsertKey = PriceHistory.createUpsertKey(
      gasStation.id,
      product.id,
      dataColeta,
    );

    // Verificar se já existe registro para esta data
    const existingPriceHistory = await queryRunner.manager.findOne(PriceHistory, {
      where: {
        posto_id: gasStation.id,
        produto_id: product.id,
        data_coleta: dataColeta,
      },
    });

    if (existingPriceHistory) {
      // Verificar se os dados são diferentes
      const needsUpdate = existingPriceHistory.preco_venda !== precoVenda;

      if (needsUpdate) {
        existingPriceHistory.preco_venda = precoVenda;
        existingPriceHistory.ativo = true;
        await queryRunner.manager.save(existingPriceHistory);
        result.totalUpdated++;
      } else {
        result.totalSkipped++;
      }
    } else {
      // Criar novo registro
      const priceHistoryData = {
        data_coleta: dataColeta,
        preco_venda: precoVenda,
        ativo: true,
        posto: gasStation,
        posto_id: gasStation.id,
        produto: product,
        produto_id: product.id,
      };

      const newPriceHistory = queryRunner.manager.create(PriceHistory, priceHistoryData);
      if (!newPriceHistory.isValid()) {
        throw new Error(`Dados do histórico de preços inválidos: ${JSON.stringify(priceHistoryData)}`);
      }
      await queryRunner.manager.save(newPriceHistory);
      result.totalInserted++;
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

  private filterAndValidateRows(
    rows: CsvRow[],
    result: ProcessingResult,
  ): CsvRow[] {
    const validRows: CsvRow[] = [];

    rows.forEach((row, index) => {
      try {
        // Validações básicas
        const hasValidCnpj = this.isValidCnpj(row.CNPJ);
        const hasValidMunicipio = this.isValidString(row.MUNICÍPIO, 'MUNICÍPIO');
        const hasValidProduto = this.isValidString(row.PRODUTO, 'PRODUTO');
        const hasValidEstado = this.isValidString(row.ESTADO, 'ESTADO');
        const hasValidDataColeta = this.isValidString(
          row['DATA DA COLETA'],
          'DATA DA COLETA',
        );
        const hasValidRazao = this.isValidString(row.RAZÃO, 'RAZÃO');

        if (
          hasValidCnpj &&
          hasValidMunicipio &&
          hasValidProduto &&
          hasValidEstado &&
          hasValidDataColeta &&
          hasValidRazao
        ) {
          validRows.push(row);
        } else {
          this.logger.debug(
            `Linha ${index + 1} inválida - CNPJ: "${row.CNPJ}", ` +
              `MUNICÍPIO: "${row.MUNICÍPIO}", PRODUTO: "${row.PRODUTO}", ` +
              `ESTADO: "${row.ESTADO}", DATA: "${row['DATA DA COLETA']}", ` +
              `RAZÃO: "${row.RAZÃO}"`,
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

  private isValidCnpj(cnpj: string): boolean {
    if (!cnpj || typeof cnpj !== 'string') return false;

    const trimmed = cnpj.trim();
    return (
      trimmed.length > 0 &&
      trimmed !== 'CNPJ' &&
      !trimmed.includes('AGÊNCIA NACIONAL') &&
      !trimmed.includes('SUPERINTENDÊNCIA') &&
      !trimmed.includes('SISTEMA DE') &&
      GasStation.validateCnpj(trimmed)
    );
  }

  private isValidString(value: string, fieldName: string): boolean {
    if (!value || typeof value !== 'string') return false;

    const trimmed = value.trim();
    return (
      trimmed.length > 0 && trimmed.toUpperCase() !== fieldName.toUpperCase()
    );
  }

  private normalizeCnpj(cnpj: string): string {
    return cnpj?.replace(/[^\d]/g, '') || '';
  }

  private formatCep(cep: string): string | null {
    if (!cep) return null;
    const cleaned = cep.replace(/[^\d]/g, '');
    if (cleaned.length === 8) {
      return `${cleaned.substr(0, 5)}-${cleaned.substr(5)}`;
    }
    return cleaned.length > 0 ? cleaned : null;
  }

  private parseDate(dateString: string): Date | null {
    if (!dateString) return null;

    try {
      // Assumindo formato DD/MM/YYYY ou DD-MM-YYYY
      const cleaned = dateString.trim();
      const parts = cleaned.split(/[\/\-]/);
      
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
        const year = parseInt(parts[2], 10);
        
        if (year > 1900 && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
          return new Date(year, month, day);
        }
      }

      // Tentar parse direto
      const parsed = new Date(cleaned);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private parsePrice(priceString: string): number | null {
    if (!priceString) return null;

    try {
      // Remover símbolos de moeda e espaços
      const cleaned = priceString
        .replace(/[R$\s]/g, '')
        .replace(',', '.');
      
      const parsed = parseFloat(cleaned);
      return !isNaN(parsed) && parsed >= 0 ? parsed : null;
    } catch (error) {
      return null;
    }
  }
}