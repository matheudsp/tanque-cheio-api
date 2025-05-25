import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('posto_gasolina')
@Index(['cnpj'])
@Index(['uf', 'municipio'])
@Index(['data_coleta'])
export class GasStation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  regiao_sigla?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: false })
  uf: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  municipio: string;

  @Column({ type: 'varchar', length: 200, nullable: false })
  nome: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  cnpj: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  produto: string;

  @Column({ type: 'date', nullable: false })
  data_coleta: Date;

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  preco_venda?: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  preco_compra?: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  unidade_medida?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  bandeira?: string | null;

  @Column({ type: 'text', nullable: true })
  endereco?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  bairro?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  cep?: string | null;

  @Column({ type: 'decimal', precision: 50, scale: 8, nullable: true })
  latitude?: number | null;

  @Column({ type: 'decimal', precision: 50, scale: 8, nullable: true })
  longitude?: number | null;

  @CreateDateColumn()
  criadoEm: Date;

  @UpdateDateColumn()
  atualizadoEm: Date;

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
}