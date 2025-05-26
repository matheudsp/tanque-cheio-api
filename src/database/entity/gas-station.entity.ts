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
import { Localizacao } from './location.entity';
import { Produto } from './product.entity';

@Entity('posto_gasolina')
@Index(['cnpj'])
@Index(['data_coleta'])
@Index(['localizacao_id'])
@Index(['produto_id'])
@Index(['cnpj', 'produto_id', 'data_coleta']) // Índice composto para consultas de upsert
export class GasStation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200, nullable: false })
  nome: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  cnpj: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  bandeira?: string | null;

  @Column({ type: 'date', nullable: false })
  data_coleta: Date;

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  preco_venda?: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  preco_compra?: number | null;

  @CreateDateColumn()
  criadoEm: Date;

  @UpdateDateColumn()
  atualizadoEm: Date;

  // Relacionamentos
  @ManyToOne(() => Localizacao, (localizacao) => localizacao.postos, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'localizacao_id' })
  localizacao: Localizacao;

  @Column({ type: 'uuid', nullable: false })
  localizacao_id: string;

  @ManyToOne(() => Produto, (produto) => produto.postos, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'produto_id' })
  produto: Produto;

  @Column({ type: 'uuid', nullable: false })
  produto_id: string;

  // Métodos de negócio
  calculateMargin(): number | null {
    if (this.preco_venda && this.preco_compra) {
      return Number((this.preco_venda - this.preco_compra).toFixed(3));
    }
    return null;
  }

  calculateMarginPercentage(): number | null {
    if (this.preco_venda && this.preco_compra && this.preco_compra > 0) {
      const margin = this.calculateMargin();
      if (margin !== null) {
        return Number(((margin / this.preco_compra) * 100).toFixed(2));
      }
    }
    return null;
  }

  // Método para criar chave única para upsert
  getUpsertKey(): string {
    return `${this.cnpj}|${this.produto_id}`;
  }

  // Método para validar se o posto tem dados mínimos necessários
  isValid(): boolean {
    return !!(
      this.nome?.trim() &&
      this.cnpj?.trim() &&
      this.data_coleta &&
      this.localizacao_id &&
      this.produto_id
    );
  }
}