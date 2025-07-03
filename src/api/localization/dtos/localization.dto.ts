import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CoordinatesDto {
  @ApiProperty({
    enum: ['Point'],
    description: 'Type of the geographic point.',
  })
  type: 'Point';

  @ApiProperty({
    type: [Number],
    example: [-42.81, -7.07],
    description: 'Longitude and Latitude.',
  })
  coordinates: [number, number];
}

export class LocalizationCreateDto {
  @ApiPropertyOptional({ example: 'Piauí' })
  state?: string;

  @ApiPropertyOptional({ example: 'Floriano' })
  city?: string;

  @ApiPropertyOptional()
  address?: string;

  @ApiPropertyOptional()
  number?: string;

  @ApiPropertyOptional()
  complement?: string;

  @ApiPropertyOptional()
  neighborhood?: string;

  @ApiPropertyOptional({ example: '64800-000' })
  zip_code?: string;

  @ApiProperty({ type: CoordinatesDto })
  coordinates: CoordinatesDto;
}

export class LocalizationQueryDto {
  @ApiPropertyOptional({ default: 1 })
  page?: number;

  @ApiPropertyOptional({ default: 10 })
  limit?: number;

  @ApiPropertyOptional({ description: 'Search by city, state or address' })
  search?: string;
}
