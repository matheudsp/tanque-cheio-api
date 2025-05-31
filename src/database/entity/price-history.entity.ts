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

@Entity('historico_precos')
@Index(['posto_id', 'produto_id', 'data_coleta']) // Índice composto principal
@Index(['data_coleta']) // Para consultas por período
@Index(['posto_id']) // Para consultas por posto
@Index(['produto_id']) // Para consultas por produto
@Index(['posto_id', 'produto_id'], { unique: false }) // Para consultas de posto+produto
@Index(['preco_venda']) // Para consultas de preço
@Index(['data_coleta', 'produto_id']) // Para relatórios por período e produto
export class PriceHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date', nullable: false })
  data_coleta: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  preco_venda: number | null;

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @CreateDateColumn()
  criadoEm: Date;

  @UpdateDateColumn()
  atualizadoEm: Date;

  // Relacionamentos
  @ManyToOne(
    () => GasStationEntity,
    (gasStation) => gasStation.historicoPrecos,
    {
      nullable: false,
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'posto_id' })
  posto: GasStationEntity;
  @Column({ type: 'uuid', nullable: false })
  posto_id: string;

  @ManyToOne(() => ProductEntity, (produto) => produto.historicoPrecos, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'produto_id' })
  produto: ProductEntity;
  @Column({ type: 'uuid', nullable: false })
  produto_id: string;

  getUpsertKey(): string {
    // Garantir que data_coleta é uma instância de Date
    const date =
      this.data_coleta instanceof Date
        ? this.data_coleta
        : new Date(this.data_coleta);

    const dataStr = date.toISOString().split('T')[0];
    return `${this.posto_id}|${this.produto_id}|${dataStr}`;
  }

  static createUpsertKey(
    postoId: string,
    produtoId: string,
    dataColeta: Date,
  ): string {
    // Garantir que dataColeta é uma instância de Date
    const date = dataColeta instanceof Date ? dataColeta : new Date(dataColeta);

    const dataStr = date.toISOString().split('T')[0];
    return `${postoId}|${produtoId}|${dataStr}`;
  }

  isValid(): boolean {
    return !!(
      this.posto_id &&
      this.produto_id &&
      this.data_coleta &&
      this.preco_venda // Pelo menos um preço deve existir
    );
  }

  hasCompleteData(): boolean {
    return !!this.preco_venda;
  }

  isSameDay(other: PriceHistoryEntity): boolean {
    return this.data_coleta.toDateString() === other.data_coleta.toDateString();
  }

  isMoreRecentThan(other: PriceHistoryEntity): boolean {
    return this.data_coleta.getTime() > other.data_coleta.getTime();
  }

  // Métodos para comparação de preços
  getPriceVariation(previousPrice?: PriceHistoryEntity): number | null {
    if (!previousPrice || !this.preco_venda || !previousPrice.preco_venda) {
      return null;
    }

    return Number((this.preco_venda - previousPrice.preco_venda).toFixed(3));
  }

  getPriceVariationPercentage(
    previousPrice?: PriceHistoryEntity,
  ): number | null {
    if (
      !previousPrice ||
      !this.preco_venda ||
      !previousPrice.preco_venda ||
      previousPrice.preco_venda === 0
    ) {
      return null;
    }

    const variation = this.getPriceVariation(previousPrice);
    if (variation === null) return null;

    return Number(((variation / previousPrice.preco_venda) * 100).toFixed(2));
  }

  getFormattedPrice(type: 'venda' | 'compra' = 'venda'): string {
    const price = type === 'venda' && this.preco_venda;
    if (!price) return 'N/A';

    return `R$ ${price.toFixed(3).replace('.', ',')}`;
  }

  getFormattedDate(): string {
    return this.data_coleta.toLocaleDateString('pt-BR');
  }
}
