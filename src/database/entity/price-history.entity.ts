import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { GasStationEntity } from './gas-station.entity';
import { ProductEntity } from './product.entity';

@Entity('price_history')
@Index(['gas_station_id', 'product_id', 'collection_date']) // Índice composto principal
@Index(['collection_date']) // Para consultas por período
@Index(['gas_station_id']) // Para consultas por posto
@Index(['product_id']) // Para consultas por produto
@Index(['gas_station_id', 'product_id'], { unique: false }) // Para consultas de posto+produto
@Index(['price']) // Para consultas de preço
@Index(['collection_date', 'product_id']) // Para relatórios por período e produto
export class PriceHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date', nullable: false })
  collection_date: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relacionamentos
  @ManyToOne(() => GasStationEntity, (gasStation) => gasStation.priceHistory, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'gas_station_id' })
  gas_station: GasStationEntity;
  @Column({ type: 'uuid', nullable: false })
  gas_station_id: string;

  @ManyToOne(() => ProductEntity, (produto) => produto.priceHistory, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'product_id' })
  product: ProductEntity;
  @Column({ type: 'uuid', nullable: false })
  product_id: string;

  getUpsertKey(): string {
    // Garantir que data_coleta é uma instância de Date
    const date =
      this.collection_date instanceof Date
        ? this.collection_date
        : new Date(this.collection_date);

    const dataStr = date.toISOString().split('T')[0];
    return `${this.gas_station_id}|${this.product_id}|${dataStr}`;
  }

  static createUpsertKey(
    gas_station_id: string,
    product_id: string,
    collection_date: Date,
  ): string {
    // Garantir que dataColeta é uma instância de Date
    const date =
      collection_date instanceof Date
        ? collection_date
        : new Date(collection_date);

    const dataStr = date.toISOString().split('T')[0];
    return `${gas_station_id}|${product_id}|${dataStr}`;
  }

  isValid(): boolean {
    return !!(
      this.gas_station_id &&
      this.product_id &&
      this.collection_date &&
      this.price // Pelo menos um preço deve existir
    );
  }

  hasCompleteData(): boolean {
    return !!this.price;
  }

  isSameDay(other: PriceHistoryEntity): boolean {
    return (
      this.collection_date.toDateString() ===
      other.collection_date.toDateString()
    );
  }

  isMoreRecentThan(other: PriceHistoryEntity): boolean {
    return this.collection_date.getTime() > other.collection_date.getTime();
  }

  // Métodos para comparação de preços
  getPriceVariation(previousPrice?: PriceHistoryEntity): number | null {
    if (!previousPrice || !this.price || !previousPrice.price) {
      return null;
    }

    return Number((this.price - previousPrice.price).toFixed(3));
  }

  getPriceVariationPercentage(
    previousPrice?: PriceHistoryEntity,
  ): number | null {
    if (
      !previousPrice ||
      !this.price ||
      !previousPrice.price ||
      previousPrice.price === 0
    ) {
      return null;
    }

    const variation = this.getPriceVariation(previousPrice);
    if (variation === null) return null;

    return Number(((variation / previousPrice.price) * 100).toFixed(2));
  }

  getTrend(
    previousPrice?: PriceHistoryEntity,
  ): 'UP' | 'DOWN' | 'STABLE' | null {
    const variation = this.getPriceVariation(previousPrice);
    if (variation === null) {
      return null;
    }

    if (variation > 0) {
      return 'UP';
    }

    if (variation < 0) {
      return 'DOWN';
    }

    return 'STABLE';
  }

  getFormattedPrice(type: 'venda' | 'compra' = 'venda'): string {
    const price = type === 'venda' && this.price;
    if (!price) return 'N/A';

    return `R$ ${price.toFixed(3).replace('.', ',')}`;
  }

  getFormattedDate(): string {
    return this.collection_date.toLocaleDateString('pt-BR');
  }
}
