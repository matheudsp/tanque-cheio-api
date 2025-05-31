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
import { LocalizationEntity } from './localization.entity';

import { PriceHistoryEntity } from './price-history.entity';

@Entity('gas_station')
@Index(['taxId'], { unique: true })
@Index(['localization_id'])
@Index(['legal_name', 'taxId']) // Para busca por RAZAO e CNPJ
@Index(['isActive'])
export class GasStationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200, nullable: false })
  legal_name: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  trade_name?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  brand?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: false, unique: true })
  taxId: string; // Formato: 12.345.678/0001-90

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relacionamentos
  @ManyToOne(() => LocalizationEntity, (localization) => localization.gas_station, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'localization_id' })
  localization: LocalizationEntity;  

  @Column({ type: 'uuid', nullable: false })
  localization_id: string;

  @OneToMany(() => PriceHistoryEntity, (priceHistory) => priceHistory.gas_station)
  priceHistory: PriceHistoryEntity[];

  // Métodos de negócio
  getDisplayName(): string {
    if (this.trade_name && this.trade_name !== this.legal_name) {
      return `${this.trade_name} (${this.legal_name})`;
    }
    return this.legal_name;
  }

  normalizeCnpj(): string {
    return this.taxId?.replace(/[^\d]/g, '') || '';
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
      this.legal_name?.trim() &&
      this.taxId?.trim() &&
      this.localization_id &&
      GasStationEntity.validateCnpj(this.taxId)
    );
  }

 
}
