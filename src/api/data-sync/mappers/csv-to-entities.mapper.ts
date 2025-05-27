import { Injectable, Logger } from '@nestjs/common';
import { CsvRow } from '../interfaces/base.interface';
import { GasStation } from '@/database/entity/gas-station.entity';
import { Localization } from '@/database/entity/localization.entity';
import { Product } from '@/database/entity/product.entity';
import { PriceHistory } from '@/database/entity/price-history.entity';

export interface MappedEntities {
  gasStations: GasStation[];
  localizations: Localization[];
  products: Product[];
  priceHistories: PriceHistory[];
}

@Injectable()
export class CsvToEntitiesMapper {
  private readonly logger = new Logger(CsvToEntitiesMapper.name);

  mapRows(rows: CsvRow[]): MappedEntities {
    const gasStations: GasStation[] = [];
    const localizations: Localization[] = [];
    const products: Product[] = [];
    const priceHistories: PriceHistory[] = [];

    // Maps para evitar duplicatas
    const localizationMap = new Map<string, Localization>();
    const productMap = new Map<string, Product>();
    const gasStationMap = new Map<string, GasStation>();

    for (const row of rows) {
      try {
        // 1. Criar/obter localização
        const localization = this.createLocalization(row);
        const locKey = localization.getLocationKey();
        
        if (!localizationMap.has(locKey)) {
          localizationMap.set(locKey, localization);
          localizations.push(localization);
        }

        // 2. Criar/obter produto
        const product = this.createProduct(row);
        const prodKey = Product.normalizeName(product.nome);
        
        if (!productMap.has(prodKey)) {
          productMap.set(prodKey, product);
          products.push(product);
        }

        // 3. Criar/obter posto de gasolina
        const gasStation = this.createGasStation(row, localizationMap.get(locKey)!);
        const gasStationKey = gasStation.normalizeCnpj();
        
        if (!gasStationMap.has(gasStationKey)) {
          gasStationMap.set(gasStationKey, gasStation);
          gasStations.push(gasStation);
        }

        // 4. Criar histórico de preços
        const priceHistory = this.createPriceHistory(
          row, 
          gasStationMap.get(gasStationKey)!, 
          productMap.get(prodKey)!
        );
        priceHistories.push(priceHistory);

      } catch (error) {
        this.logger.warn(`Erro ao mapear linha:`, error);
        continue;
      }
    }

    this.logger.log(
      `Mapeamento concluído: ${gasStations.length} postos, ${localizations.length} localizações, ` +
      `${products.length} produtos, ${priceHistories.length} históricos de preços`
    );

    return {
      gasStations,
      localizations,
      products,
      priceHistories
    };
  }

  private createLocalization(row: CsvRow): Localization {
    const localization = new Localization();
    
    localization.uf = this.cleanString(row.ESTADO);
    localization.municipio = this.cleanString(row.MUNICÍPIO);
    localization.endereco = this.cleanString(row.ENDEREÇO) || null;
    localization.numero = this.cleanString(row.NÚMERO) || null;
    localization.complemento = this.cleanString(row.COMPLEMENTO) || null;
    localization.bairro = this.cleanString(row.BAIRRO) || null;
    localization.cep = this.normalizeCep(row.CEP) || null;

    return localization;
  }

  private createProduct(row: CsvRow): Product {
    const product = new Product();
    
    const produtoNome = this.cleanString(row.PRODUTO);
    product.nome = Product.normalizeName(produtoNome);
    product.categoria = Product.determineCategory(produtoNome);
    product.unidade_medida = this.cleanString(row['UNIDADE DE MEDIDA']) || Product.determineUnit(produtoNome);
    product.ativo = true;

    return product;
  }

  private createGasStation(row: CsvRow, localization: Localization): GasStation {
    const gasStation = new GasStation();
    
    gasStation.nome = this.cleanString(row.RAZÃO);
    gasStation.nome_fantasia = this.cleanString(row.FANTASIA) || null;
    gasStation.bandeira = this.cleanString(row.BANDEIRA) || null;
    gasStation.cnpj = this.normalizeCnpj(row.CNPJ);
    gasStation.ativo = true;
    gasStation.localizacao = localization;

    return gasStation;
  }

  private createPriceHistory(row: CsvRow, gasStation: GasStation, product: Product): PriceHistory {
    const priceHistory = new PriceHistory();
    
    priceHistory.posto = gasStation;
    priceHistory.produto = product;
    priceHistory.data_coleta = this.parseDate(row['DATA DA COLETA']);
    priceHistory.preco_venda = this.parsePrice(row['PREÇO DE REVENDA']);
    priceHistory.ativo = true;

    return priceHistory;
  }

  private cleanString(value: any): string {
    if (!value || typeof value !== 'string') return '';
    return value.trim();
  }

  private normalizeCnpj(cnpj: string): string {
    if (!cnpj) throw new Error('CNPJ é obrigatório');
    
    const cleaned = cnpj.replace(/[^\d]/g, '');
    if (cleaned.length !== 14) {
      throw new Error(`CNPJ inválido: ${cnpj}`);
    }
    
    // Formatar: 12.345.678/0001-90
    return `${cleaned.substr(0, 2)}.${cleaned.substr(2, 3)}.${cleaned.substr(5, 3)}/${cleaned.substr(8, 4)}-${cleaned.substr(12)}`;
  }

  private normalizeCep(cep: string): string | null {
    if (!cep) return null;
    
    const cleaned = cep.replace(/[^\d]/g, '');
    if (cleaned.length !== 8) return null;
    
    // Formatar: 12345-678
    return `${cleaned.substr(0, 5)}-${cleaned.substr(5)}`;
  }

  private parseDate(dateStr: string): Date {
    if (!dateStr) throw new Error('Data da coleta é obrigatória');
    
    // Tentar diferentes formatos de data
    const formats = [
      /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
      /^(\d{4})-(\d{2})-(\d{2})$/,   // YYYY-MM-DD
      /^(\d{2})-(\d{2})-(\d{4})$/,   // DD-MM-YYYY
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        if (format === formats[0] || format === formats[2]) {
          // DD/MM/YYYY ou DD-MM-YYYY
          const [, day, month, year] = match;
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        } else {
          // YYYY-MM-DD
          const [, year, month, day] = match;
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
      }
    }

    // Tentar parse direto
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new Error(`Data inválida: ${dateStr}`);
    }
    
    return date;
  }

  private parsePrice(priceStr: string): number | null {
    if (!priceStr) return null;
    
    // Remover símbolos de moeda e normalizar
    const cleaned = priceStr
      .replace(/[R$\s]/g, '')
      .replace(',', '.');
    
    const price = parseFloat(cleaned);
    
    if (isNaN(price) || price < 0) {
      return null;
    }
    
    return price;
  }
}