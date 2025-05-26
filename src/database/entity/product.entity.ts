import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { GasStation } from './gas-station.entity';

@Entity('produto')
@Index(['nome'])

export class Produto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, nullable: false, unique: true })
  nome: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  unidade_medida?: string | null;

  @Column({ type: 'text', nullable: true })
  descricao?: string | null;

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @CreateDateColumn()
  criadoEm: Date;

  @UpdateDateColumn()
  atualizadoEm: Date;

  // Relacionamento: Um produto pode estar em vários postos
  @OneToMany(() => GasStation, (gasStation) => gasStation.produto)
  postos: GasStation[];

  // Método para normalizar o nome do produto
  static normalizeName(nome: string): string {
    return nome?.trim().toUpperCase() || '';
  }

 

  // Método para determinar unidade de medida padrão
  static determineUnit(nome: string): string {
    const normalizedName = this.normalizeName(nome);
    
    if (normalizedName.includes('GNV') || normalizedName.includes('GAS NATURAL')) {
      return 'm³';
    }
    
    return 'litro'; // Padrão para combustíveis líquidos
  }
}