import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsNumber, IsDateString, Min, Max } from 'class-validator';

@ApiSchema({ name: 'Historico de Preco' })
export class PriceHistoryDto {
  @ApiProperty()
  id: string;
  @ApiProperty()
  data_coleta: Date;
  @ApiProperty()
  preco_venda: number;
  @ApiProperty()
  ativo: boolean;
  @ApiProperty()
  atualizadoEm: Date;
  @ApiProperty()
  criadoEm: Date;
}

@ApiSchema({ name: 'Price History Query' })
export class PriceHistoryQueryDto {
  @ApiProperty({ 
    description: 'ID do produto (UUID ou nome do produto)',
    required: false 
  })
  @IsOptional()
  @IsString()
  produto_id?: string;

  @ApiProperty({ 
    description: 'Data de início para filtro (YYYY-MM-DD)',
    required: false 
  })
  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @ApiProperty({ 
    description: 'Data de fim para filtro (YYYY-MM-DD)',
    required: false 
  })
  @IsOptional()
  @IsDateString()
  dataFim?: string;

  @ApiProperty({ 
    description: 'Limite de registros retornados (1-1000)',
    default: 100,
    required: false 
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(1000)
  limite?: number;
}

@ApiSchema({ name: 'Gas Station Price History Query' })
export class GasStationPriceHistory {
  @ApiProperty({ 
    description: 'Nome do produto para filtrar (GLP, GASOLINA, DIESEL, etc.)',
    required: false 
  })
  @IsOptional()
  @IsString()
  produto?: string;

  @ApiProperty({ 
    description: 'Período para consulta',
    enum: ['semana', 'mes'],
    required: false 
  })
  @IsOptional()
  @IsString()
  periodo?: 'semana' | 'mes';

  @ApiProperty({ 
    description: 'Limite de registros',
    default: 50,
    required: false 
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(1000)
  limite?: number;
}

@ApiSchema({ name: 'Price History Response' })
export class PriceHistoryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  data_coleta: Date;

  @ApiProperty()
  preco_venda: number;

  @ApiProperty()
  ativo: boolean;

  @ApiProperty({ description: 'Informações do produto' })
  produto: {
    id: string;
    nome: string;
    categoria: string;
    unidade_medida: string;
  };

  // @ApiProperty({ description: 'Informações do posto' })
  // posto: {
  //   id: string;
  //   nome_razao: string;
  //   nome_fantasia?: string;
  //   bandeira?: string;
  //   cnpj: string;
  // };

  @ApiProperty()
  criadoEm: Date;

  @ApiProperty()
  atualizadoEm: Date;
}

@ApiSchema({ name: 'Latest Prices Response' })
export class LatestPricesResponseDto {
  @ApiProperty({ description: 'Último preço do GLP', nullable: true })
  glp: PriceHistoryResponseDto | null;

  @ApiProperty({ description: 'Último preço da Gasolina', nullable: true })
  gasolina: PriceHistoryResponseDto | null;

  @ApiProperty({ description: 'Último preço do Diesel', nullable: true })
  diesel: PriceHistoryResponseDto | null;

  @ApiProperty({ description: 'Data da última atualização' })
  updatedAt: string;
}


@ApiSchema({ name: 'Detailed Price History Response' })
export class DetailedPriceHistoryResponseDto {
  @ApiProperty({ type: [PriceHistoryResponseDto] })
  results: PriceHistoryResponseDto[];

  @ApiProperty({ description: 'Total de registros encontrados' })
  total: number;

  @ApiProperty({ description: 'Período consultado' })
  periodo: string;

  @ApiProperty({ description: 'Produto consultado' })
  produto: string;

}