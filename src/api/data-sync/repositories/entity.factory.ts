import { GasStationEntity } from '@/database/entity/gas-station.entity';
import { LocalizationEntity } from '@/database/entity/localization.entity';
import { PriceHistoryEntity } from '@/database/entity/price-history.entity';
import { ProductEntity } from '@/database/entity/product.entity';
import type { CsvRow } from '../interfaces/csv-row.interface';
import { DataUtils } from '../utils/data-utils';

export class EntityFactory {
  static createLocalization(row: CsvRow): LocalizationEntity {
    const localization = new LocalizationEntity();
    localization.state = DataUtils.cleanString(row.ESTADO);
    localization.city = DataUtils.cleanString(row.MUNICÍPIO);
    localization.address = DataUtils.cleanString(row.ENDEREÇO) || null;
    localization.number = DataUtils.cleanString(row.NÚMERO) || null;
    localization.complement = DataUtils.cleanString(row.COMPLEMENTO) || null;
    localization.neighborhood = DataUtils.cleanString(row.BAIRRO) || null;
    localization.zipCode = DataUtils.normalizeCep(row.CEP);
    return localization;
  }

  static createProduct(row: CsvRow): ProductEntity {
    const product = new ProductEntity();
    const produtoNome = DataUtils.cleanString(row.PRODUTO);
    product.name = ProductEntity.normalizeName(produtoNome);
    product.category = ProductEntity.determineCategory(produtoNome);
    product.unitOfMeasure =
      DataUtils.cleanString(row['UNIDADE DE MEDIDA']) ||
      ProductEntity.determineUnit(produtoNome);
    product.isActive = true;
    return product;
  }

  static createGasStation(
    row: CsvRow,
    localization: LocalizationEntity,
  ): GasStationEntity {
    const gasStation = new GasStationEntity();
    gasStation.legal_name = DataUtils.cleanString(row.RAZÃO);
    gasStation.trade_name = DataUtils.cleanString(row.FANTASIA) || null;
    gasStation.brand= DataUtils.cleanString(row.BANDEIRA) || null;
    gasStation.taxId = DataUtils.normalizeCnpj(row.CNPJ);
    gasStation.isActive = true;
    gasStation.localization = localization;
    gasStation.localization_id = localization.id;
    return gasStation;
  }

  static createPriceHistory(
    row: CsvRow,
    gasStation: GasStationEntity,
    product: ProductEntity,
  ): PriceHistoryEntity {
    const priceHistory = new PriceHistoryEntity();
    priceHistory.gas_station = gasStation;
    priceHistory.product = product;
    priceHistory.gas_station_id = gasStation.id;
    priceHistory.product_id = product.id;
    priceHistory.collection_date = DataUtils.parseDate(row['DATA DA COLETA']);
    priceHistory.price = DataUtils.parsePrice(row['PREÇO DE REVENDA']);
    priceHistory.isActive = true;
    return priceHistory;
  }
}
