import { GasStation } from "@/database/entity/gas-station.entity";
import { Localization } from "@/database/entity/localization.entity";
import { PriceHistory } from "@/database/entity/price-history.entity";
import { Product } from "@/database/entity/product.entity";
import type { CsvRow } from "../interfaces/csv-row.interface";
import { DataUtils } from "../utils/utils";

export class EntityFactory {
  static createLocalization(row: CsvRow): Localization {
    const localization = new Localization();
    localization.uf = DataUtils.cleanString(row.ESTADO);
    localization.municipio = DataUtils.cleanString(row.MUNICÍPIO);
    localization.endereco = DataUtils.cleanString(row.ENDEREÇO) || null;
    localization.numero = DataUtils.cleanString(row.NÚMERO) || null;
    localization.complemento = DataUtils.cleanString(row.COMPLEMENTO) || null;
    localization.bairro = DataUtils.cleanString(row.BAIRRO) || null;
    localization.cep = DataUtils.normalizeCep(row.CEP);
    return localization;
  }

  static createProduct(row: CsvRow): Product {
    const product = new Product();
    const produtoNome = DataUtils.cleanString(row.PRODUTO);
    product.nome = Product.normalizeName(produtoNome);
    product.categoria = Product.determineCategory(produtoNome);
    product.unidade_medida = DataUtils.cleanString(row['UNIDADE DE MEDIDA']) || Product.determineUnit(produtoNome);
    product.ativo = true;
    return product;
  }

  static createGasStation(row: CsvRow, localization: Localization): GasStation {
    const gasStation = new GasStation();
    gasStation.nome = DataUtils.cleanString(row.RAZÃO);
    gasStation.nome_fantasia = DataUtils.cleanString(row.FANTASIA) || null;
    gasStation.bandeira = DataUtils.cleanString(row.BANDEIRA) || null;
    gasStation.cnpj = DataUtils.normalizeCnpj(row.CNPJ);
    gasStation.ativo = true;
    gasStation.localizacao = localization;
    gasStation.localizacao_id = localization.id;
    return gasStation;
  }

  static createPriceHistory(row: CsvRow, gasStation: GasStation, product: Product): PriceHistory {
    const priceHistory = new PriceHistory();
    priceHistory.posto = gasStation;
    priceHistory.produto = product;
    priceHistory.posto_id = gasStation.id;
    priceHistory.produto_id = product.id;
    priceHistory.data_coleta = DataUtils.parseDate(row['DATA DA COLETA']);
    priceHistory.preco_venda = DataUtils.parsePrice(row['PREÇO DE REVENDA']);
    priceHistory.ativo = true;
    return priceHistory;
  }
}