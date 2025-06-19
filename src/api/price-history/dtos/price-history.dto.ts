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
  start_date: string;

  @ApiProperty({
    description: 'Data de fim (YYYY-MM-DD)',
    example: '2025-01-31',
    required: true,
  })
  @IsDateString({}, { message: 'Data de fim deve estar no formato YYYY-MM-DD' })
  end_date: string;

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
  product_id: string;

  @ApiProperty({ description: 'Nome do produto', example: 'GASOLINA COMUM' })
  product_name: string;

  @ApiProperty({ description: 'Preço do combustível', example: 5.89 })
  price: number;

  @ApiProperty({
    description: 'Data da coleta (ISO string)',
    example: '2025-01-31T10:30:00Z',
  })
  collection_date: string;

  @ApiProperty({ description: 'Unidade de medida', example: 'L' })
  unit_of_measure: string;

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
  percentage_change?: number | null;
}

export class FuelPriceDto {
  @ApiProperty({
    description: 'Id do produto',
    example: 'UUID',
  })
  product_id: string;

  @ApiProperty({
    description: 'Nome do combustível',
    example: 'GASOLINA COMUM',
  })
  product_name: string;

  @ApiProperty({ description: 'Preço formatado', example: '6.49' })
  price: number | null;

  @ApiProperty({ description: 'Unidade com moeda', example: 'R$ / litro' })
  unit_of_measure: string;

  @ApiProperty({
    description: 'Data da última atualização (YYYY-MM-DD)',
    example: '2025-05-20',
  })
  collection_date: string;

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
  percentage_change?: number | null;
}

export class LatestPricesResponseDto {
  @ApiProperty({ description: 'ID do posto', example: 'uuid-station-id' })
  station_id: string;

  @ApiProperty({
    type: [PriceItemDto],
    description: 'Últimos preços de todos os produtos',
  })
  prices: PriceItemDto[];

  @ApiProperty({ description: 'Total de produtos encontrados', example: 3 })
  total_products: number;

  @ApiProperty({
    description: 'Data/hora da consulta (ISO string)',
    example: '2025-01-31T10:30:00Z',
  })
  updated_at: string;
}

export class PriceByProductDto {
  @ApiProperty({
    description: 'Nome do tipo de combustível (por exemplo: GASOLINA COMUM)',
    example: 'GASOLINA COMUM',
  })
  @IsString()
  product_name: string;

  @ApiProperty({
    description: 'Lista de objetos representando cada registro de preço',
    type: [PriceItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceItemDto)
  prices: PriceItemDto[];
}
