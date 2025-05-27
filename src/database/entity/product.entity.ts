import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { PriceHistory } from './price-history.entity';

@Entity('produto')
@Index(['nome'], { unique: true })
@Index(['categoria'])
@Index(['ativo'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, nullable: false, unique: true })
  nome: string;

  @Column({ type: 'varchar', length: 50, nullable: false, default: 'COMBUSTÍVEL' })
  categoria: string; // COMBUSTÍVEL, GLP, LUBRIFICANTE, etc.

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'litro' })
  unidade_medida: string;

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @CreateDateColumn()
  criadoEm: Date;

  @UpdateDateColumn()
  atualizadoEm: Date;

  // Relacionamentos
  @OneToMany(() => PriceHistory, (priceHistory) => priceHistory.produto)
  historicoPrecos: PriceHistory[];

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
    return `${this.nome} (${this.unidade_medida})`;
  }

  isLiquid(): boolean {
    return this.unidade_medida.toLowerCase().includes('litro');
  }

  isGas(): boolean {
    return this.unidade_medida.includes('m³') || this.unidade_medida.includes('kg');
  }

  isValid(): boolean {
    return !!(
      this.nome?.trim() && 
      this.categoria?.trim() && 
      this.unidade_medida?.trim()
    );
  }
}