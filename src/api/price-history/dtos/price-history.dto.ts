import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsDateString,
  ValidateNested,
  IsArray,
} from 'class-validator';

export class PeriodQueryDto {
  @ApiProperty({
    description: 'Data de início (YYYY-MM-DD)',
    example: '2025-01-01',
    required: true,
  })
  @IsDateString(
    {},
    { message: 'Data de início deve estar no formato YYYY-MM-DD' },
  )
  startDate: string;

  @ApiProperty({
    description: 'Data de fim (YYYY-MM-DD)',
    example: '2025-01-31',
    required: true,
  })
  @IsDateString({}, { message: 'Data de fim deve estar no formato YYYY-MM-DD' })
  endDate: string;

  @ApiProperty({
    description: 'Nome do produto para filtrar (opcional)',
    example: 'GASOLINA',
    required: false,
  })
  @IsOptional()
  @IsString()
  product?: string;
}

export class PriceItemDto {
  @ApiProperty({ description: 'ID do registro', example: 'uuid-price-id' })
  id: string;

  @ApiProperty({ description: 'ID do produto', example: 'uuid-product-id' })
  productId: string;

  @ApiProperty({ description: 'Nome do produto', example: 'GASOLINA COMUM' })
  productName: string;

  @ApiProperty({ description: 'Preço do combustível', example: 5.89 })
  price: number;

  @ApiProperty({
    description: 'Data da coleta (ISO string)',
    example: '2025-01-31T10:30:00Z',
  })
  date: string;

  @ApiProperty({ description: 'Unidade de medida', example: 'L' })
  unit: string;

  @ApiProperty({
    description:
      'Tendência do preço em relação ao registro anterior (UP, DOWN, STABLE)',
    example: 'DOWN',
    required: false,
  })
  trend?: 'UP' | 'DOWN' | 'STABLE' | null;

  @ApiProperty({
    description: 'Variação percentual em relação ao preço anterior',
    example: -1.5,
    required: false,
  })
  percentageChange?: number | null;
}

export class FuelPriceDto {
  @ApiProperty({
    description: 'Id do produto',
    example: 'UUID',
  })
  id: string;

  @ApiProperty({
    description: 'Nome do combustível',
    example: 'GASOLINA COMUM',
  })
  name: string;

  @ApiProperty({ description: 'Preço formatado', example: '6.49' })
  price: number | null;

  @ApiProperty({ description: 'Unidade com moeda', example: 'R$ / litro' })
  unit: string;

  @ApiProperty({
    description: 'Data da última atualização (YYYY-MM-DD)',
    example: '2025-05-20',
  })
  lastUpdated: string;

  @ApiProperty({
    description:
      'Tendência do preço em relação ao registro anterior (UP, DOWN, STABLE)',
    example: 'UP',
    required: false,
  })
  trend?: 'UP' | 'DOWN' | 'STABLE' | null;

  @ApiProperty({
    description: 'Variação percentual em relação ao preço anterior',
    example: 2.1,
    required: false,
  })
  percentageChange?: number | null;
}

export class LatestPricesResponseDto {
  @ApiProperty({ description: 'ID do posto', example: 'uuid-station-id' })
  stationId: string;

  @ApiProperty({
    type: [PriceItemDto],
    description: 'Últimos preços de todos os produtos',
  })
  prices: PriceItemDto[];

  @ApiProperty({ description: 'Total de produtos encontrados', example: 3 })
  totalProducts: number;

  @ApiProperty({
    description: 'Data/hora da consulta (ISO string)',
    example: '2025-01-31T10:30:00Z',
  })
  updatedAt: string;
}

export class PriceByProductDto {
  @ApiProperty({
    description: 'Nome do tipo de combustível (por exemplo: GASOLINA COMUM)',
    example: 'GASOLINA COMUM',
  })
  @IsString()
  productName: string;

  @ApiProperty({
    description: 'Lista de objetos representando cada registro de preço',
    type: [PriceItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceItemDto)
  prices: PriceItemDto[];
}
