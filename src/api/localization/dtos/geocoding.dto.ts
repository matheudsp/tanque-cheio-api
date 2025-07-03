import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Point } from 'typeorm';
import { CoordinatesDto } from './localization.dto';

export class GeocodeAddressDto {
  @ApiProperty({
    example: 'Avenida Getúlio Vargas, 123',
    description: 'Street name and number.',
  })
  address: string;

  @ApiProperty({ example: 'Floriano', description: 'City name.' })
  city: string;

  @ApiProperty({ example: 'Piauí', description: 'State name.' })
  state: string;

  @ApiPropertyOptional({ example: '64800-000', description: 'ZIP code.' })
  zipCode?: string;
}

export class LocalizationDto {
  @ApiProperty({ description: 'Unique identifier of the localization.' })
  id: string;

  @ApiProperty({ description: 'State.' })
  state: string;

  @ApiProperty({ description: 'City.' })
  city: string;

  @ApiPropertyOptional({ description: 'Full address.' })
  address?: string | null;

  @ApiPropertyOptional({ description: 'Street number.' })
  number?: string | null;

  @ApiPropertyOptional({ description: 'Address complement.' })
  complement?: string | null;

  @ApiPropertyOptional({ description: 'Neighborhood.' })
  neighborhood?: string | null;

  @ApiPropertyOptional({ description: 'ZIP code.' })
  zip_code?: string | null;

  @ApiProperty({ type: CoordinatesDto, description: 'Geographic coordinates.' })
  coordinates: CoordinatesDto;
}
