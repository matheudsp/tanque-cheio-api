import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { PriceHistoryEntity } from './price-history.entity';

@Entity('product')
@Index(['name'], { unique: true })
export class ProductEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 50, default: 'COMBUSTÍVEL' })
  category: string;

  @Column({ type: 'varchar', length: 20, default: 'litro' })
  unit_of_measure: string;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => PriceHistoryEntity, (priceHistory) => priceHistory.product)
  price_history: PriceHistoryEntity[];

  // Métodos de negócio
  static normalizeName(nome: string): string {
    const normalized = nome?.trim().toUpperCase() || '';
    
    // Normalizar nomes de produtos similares
    const normalizations: Record<string, string> = {
      'GASOLINA COMUM': 'GASOLINA COMUM',
      'GASOLINA ADITIVADA': 'GASOLINA ADITIVADA',
      'GASOLINA PREMIUM': 'GASOLINA PREMIUM',
      'DIESEL S500': 'DIESEL S500',
      'DIESEL S10': 'DIESEL S10',
      'ETANOL': 'ETANOL',
      'ALCOOL': 'ETANOL',
      'ÁLCOOL': 'ETANOL',
      'GLP': 'GLP',
      'GAS LIQUEFEITO': 'GLP',
      'GÁS LIQUEFEITO': 'GLP',
      'GNV': 'GNV',
      'GAS NATURAL': 'GNV',
      'GÁS NATURAL': 'GNV',
      'OLEO DIESEL': 'DIESEL',
      'ÓLEO DIESEL': 'DIESEL',
    };

    return normalizations[normalized] || normalized;
  }

  static determineCategory(nome: string): string {
    const normalizedName = this.normalizeName(nome);
    
    if (normalizedName.includes('GLP') || normalizedName.includes('GÁS')) {
      return 'GLP';
    }
    
    if (normalizedName.includes('GNV')) {
      return 'GNV';
    }
    
    if (normalizedName.includes('LUBRIFICANTE') || normalizedName.includes('ÓLEO')) {
      return 'LUBRIFICANTE';
    }
    
    return 'COMBUSTÍVEL';
  }

  static determineUnit(nome: string): string {
    const normalizedName = this.normalizeName(nome);
    
    if (normalizedName.includes('GLP')) {
      return '13 kg'; // Unidade padrão para GLP
    }
    
    if (normalizedName.includes('GNV')) {
      return 'm³';
    }
    
    return 'litro'; // Padrão para combustíveis líquidos
  }

  getDisplayName(): string {
    return `${this.name} (${this.unit_of_measure})`;
  }

  isLiquid(): boolean {
    return this.unit_of_measure.toLowerCase().includes('litro');
  }

  isGas(): boolean {
    return this.unit_of_measure.includes('m³') || this.unit_of_measure.includes('kg');
  }

  isValid(): boolean {
    return !!(
      this.name?.trim() && 
      this.category?.trim() && 
      this.unit_of_measure?.trim()
    );
  }
}