import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class PriceHistoryQueryDto {
  @ApiProperty({ required: false, description: 'Data inicial do período (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString({}, { message: 'A data inicial deve estar no formato YYYY-MM-DD' })
  start_date?: string;

  @ApiProperty({ required: false, description: 'Data final do período (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString({}, { message: 'A data final deve estar no formato YYYY-MM-DD' })
  end_date?: string;

  @ApiProperty({ required: false, description: 'Filtra o histórico por um nome de produto específico' })
  @IsOptional()
  product?: string;
}

@ApiSchema({ name: 'Gas Station' })
export class GasStationDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  legal_name: string;

  @ApiProperty({ required: false })
  trade_name?: string | null;

  @ApiProperty({ required: false })
  brand?: string | null;

  @ApiProperty()
  tax_id: string;

  @ApiProperty()
  is_active: boolean;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;

  @ApiProperty()
  localization_id: string;
}

@ApiSchema({ name: 'Gas Station Query' })
export class GasStationQueryDto {
  @ApiProperty({ required: false })
  city?: string;

  @ApiProperty({ required: false })
  product?: string;

  @ApiProperty({ required: false })
  brand?: string;

  @ApiProperty({ required: false })
  limit?: number;

  @ApiProperty({ required: false })
  offset?: number;
}

@ApiSchema({ name: 'Nearby Stations Query' })
export class NearbyStationsQueryDto {
  @ApiProperty({ 
    description: 'Latitude do ponto de referência',
    example: -20.46000,
    type: 'number',
    format: 'float'
  })
  lat: number;

  @ApiProperty({ 
    description: 'Longitude do ponto de referência',
    example: -54.62000,
    type: 'number',
    format: 'float'
  })
  lng: number;

  @ApiProperty({ 
    description: 'Raio de busca em km',
    example: 50,
    type: 'integer'
  })
  radius: number;

  @ApiProperty({ 
    required: false,
    description: 'Tipo de combustível para filtrar e ordenar por preço',
    example: 'GASOLINA COMUM'
  })
  product?: string;

  @ApiProperty({ 
    required: false,
    default: 'distance',
    description: 'Critério de ordenação'
  })
  sort?: 'distance' | 'priceAsc' | 'priceDesc';

  @ApiProperty({ 
    required: false,
    default: 10,
    minimum: 1,
    maximum: 10
  })
  limit?: number;

  @ApiProperty({ 
    required: false,
    default: 0,
    minimum: 0
  })
  offset?: number;
}

// export class NearbyStationDto {
//   id: string;
//   taxId: string;
//   legal_name: string;
//   trade_name: string;
//   brand: string;
//   city: string;
//   state: string;
//   latitude: number;
//   longitude: number;
//   distanceKm: number;
//   prices: FuelPriceDto[];
// }
