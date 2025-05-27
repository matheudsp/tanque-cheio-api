import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Localization } from './localization.entity';

import { PriceHistory } from './price-history.entity';

@Entity('posto_gasolina')
@Index(['cnpj'], { unique: true })
@Index(['localizacao_id'])
@Index(['nome', 'cnpj']) // Para busca por nome e CNPJ
@Index(['ativo'])
export class GasStation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200, nullable: false })
  nome: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  nome_fantasia?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  bandeira?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: false, unique: true })
  cnpj: string; // Formato: 12.345.678/0001-90

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @CreateDateColumn()
  criadoEm: Date;

  @UpdateDateColumn()
  atualizadoEm: Date;

  // Relacionamentos
  @ManyToOne(() => Localization, (localizacao) => localizacao.postos, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'localizacao_id' })
  localizacao: Localization;  

  @Column({ type: 'uuid', nullable: false })
  localizacao_id: string;

  @OneToMany(() => PriceHistory, (priceHistory) => priceHistory.posto)
  historicoPrecos: PriceHistory[];

  // Métodos de negócio
  getDisplayName(): string {
    if (this.nome_fantasia && this.nome_fantasia !== this.nome) {
      return `${this.nome_fantasia} (${this.nome})`;
    }
    return this.nome;
  }

  normalizeCnpj(): string {
    return this.cnpj?.replace(/[^\d]/g, '') || '';
  }

  formatCnpj(): string {
    const cleaned = this.normalizeCnpj();
    if (cleaned.length === 14) {
      return `${cleaned.substr(0, 2)}.${cleaned.substr(2, 3)}.${cleaned.substr(5, 3)}/${cleaned.substr(8, 4)}-${cleaned.substr(12)}`;
    }
    return cleaned;
  }

  getUpsertKey(): string {
    return this.normalizeCnpj();
  }

  static normalizeName(nome: string): string {
    return nome?.trim().toUpperCase() || '';
  }

  static validateCnpj(cnpj: string): boolean {
    const cleaned = cnpj.replace(/[^\d]/g, '');

    if (cleaned.length !== 14) return false;
    if (/^(\d)\1+$/.test(cleaned)) return false; // Todos os dígitos iguais

    // Validação dos dígitos verificadores
    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    const sum1 = cleaned
      .slice(0, 12)
      .split('')
      .reduce((sum, digit, index) => {
        return sum + parseInt(digit) * weights1[index];
      }, 0);

    const remainder1 = sum1 % 11;
    const digit1 = remainder1 < 2 ? 0 : 11 - remainder1;

    if (digit1 !== parseInt(cleaned[12])) return false;

    const sum2 = cleaned
      .slice(0, 13)
      .split('')
      .reduce((sum, digit, index) => {
        return sum + parseInt(digit) * weights2[index];
      }, 0);

    const remainder2 = sum2 % 11;
    const digit2 = remainder2 < 2 ? 0 : 11 - remainder2;

    return digit2 === parseInt(cleaned[13]);
  }

  isValid(): boolean {
    return !!(
      this.nome?.trim() &&
      this.cnpj?.trim() &&
      this.localizacao_id &&
      GasStation.validateCnpj(this.cnpj)
    );
  }

  getFullInfo(): string {
    const parts = [
      this.getDisplayName(),
      this.formatCnpj(),
      this.bandeira,
      this.localizacao?.getFullAddress(),
    ].filter(Boolean);

    return parts.join(' - ');
  }
}
