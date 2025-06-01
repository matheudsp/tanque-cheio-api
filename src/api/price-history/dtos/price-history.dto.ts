import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString } from 'class-validator';

// ================ QUERY DTOs ================

export class PeriodQueryDto {
  @ApiProperty({ 
    description: 'Data de início (YYYY-MM-DD)',
    example: '2025-01-01',
    required: true 
  })
  @IsDateString({}, { message: 'Data de início deve estar no formato YYYY-MM-DD' })
  startDate: string;

  @ApiProperty({ 
    description: 'Data de fim (YYYY-MM-DD)',
    example: '2025-01-31',
    required: true 
  })
  @IsDateString({}, { message: 'Data de fim deve estar no formato YYYY-MM-DD' })
  endDate: string;

  @ApiProperty({ 
    description: 'Nome do produto para filtrar (opcional)',
    example: 'GASOLINA',
    required: false 
  })
  @IsOptional()
  @IsString()
  product?: string;
}

// ================ RESPONSE DTOs ================

export class PriceItemDto {
  @ApiProperty({ description: 'ID do registro', example: 'uuid-price-id' })
  id: string;

  @ApiProperty({ description: 'ID do produto', example: 'uuid-product-id' })
  productId: string;

  @ApiProperty({ description: 'Nome do produto', example: 'GASOLINA COMUM' })
  productName: string;

  @ApiProperty({ description: 'Preço do combustível', example: 5.89 })
  price: number;

  @ApiProperty({ description: 'Data da coleta (ISO string)', example: '2025-01-31T10:30:00Z' })
  date: string;

  @ApiProperty({ description: 'Unidade de medida', example: 'L' })
  unit: string;

  @ApiProperty({ description: 'Variação em relação ao preço anterior', example: 0.05, required: false })
  variation?: number;

  @ApiProperty({ description: 'Variação percentual', example: 0.85, required: false })
  variationPercent?: number;
}

export class LatestPricesResponseDto {
  @ApiProperty({ description: 'ID do posto', example: 'uuid-station-id' })
  stationId: string;

  @ApiProperty({ type: [PriceItemDto], description: 'Últimos preços de todos os produtos' })
  prices: PriceItemDto[];

  @ApiProperty({ description: 'Total de produtos encontrados', example: 3 })
  totalProducts: number;

  @ApiProperty({ description: 'Data/hora da consulta (ISO string)', example: '2025-01-31T10:30:00Z' })
  updatedAt: string;
}

export class HistoryResponseDto {
  @ApiProperty({ description: 'ID do posto', example: 'uuid-station-id' })
  stationId: string;

  @ApiProperty({ description: 'Data de início do período', example: '2025-01-01' })
  startDate: string;

  @ApiProperty({ description: 'Data de fim do período', example: '2025-01-31' })
  endDate: string;

  @ApiProperty({ description: 'Produto filtrado (se aplicável)', example: 'GASOLINA', required: false })
  product?: string;

  @ApiProperty({ type: [PriceItemDto], description: 'Histórico de preços no período' })
  prices: PriceItemDto[];

  @ApiProperty({ description: 'Total de registros encontrados', example: 45 })
  total: number;

  @ApiProperty({ description: 'Data/hora da consulta (ISO string)', example: '2025-01-31T10:30:00Z' })
  queryTime: string;
}