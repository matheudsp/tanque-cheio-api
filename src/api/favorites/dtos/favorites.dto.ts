import { ApiProperty, ApiSchema } from '@nestjs/swagger';

@ApiSchema({ name: 'CreateFavorite' })
export class FavoriteCreateDto {
  @ApiProperty({
    description: 'The UUID of the gas station to be favorited',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  stationId: string;

  @ApiProperty({
    description: 'The UUID of the product to be favorited at the station',
    example: 'b2c3d4e5-f6a7-8901-2345-67890abcdef1',
  })
  productId: string;
}
