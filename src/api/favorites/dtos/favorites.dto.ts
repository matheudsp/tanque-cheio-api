import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { IsUUID, IsArray, ArrayNotEmpty } from 'class-validator';
@ApiSchema({ name: 'CreateFavorite' })
export class FavoriteCreateDto {
  @ApiProperty({
    description: 'The UUID of the gas station to be favorited',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  station_id: string;

  @ApiProperty({
    description: 'The UUID of the product to be favorited at the station',
    example: 'b2c3d4e5-f6a7-8901-2345-67890abcdef1',
  })
  product_id: string;
}



export class FavoriteBulkDto {
  @ApiProperty({
    description: 'O UUID do posto de combustível',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  @IsUUID('4', { message: 'Formato de Station ID inválido' })
  station_id: string;

  @ApiProperty({
    description: 'Um array com os UUIDs dos produtos a serem favoritados/desfavoritados',
    type: [String],
    example: [
      'b2c3d4e5-f6a7-8901-2345-67890abcdef1',
      'c3d4e5f6-a7b8-9012-3456-7890abcdef12',
    ],
  })
  @IsArray({ message: 'product_ids deve ser um array' })
  @ArrayNotEmpty({ message: 'A lista de produtos não pode estar vazia' })
  @IsUUID('4', { each: true, message: 'Cada product_id deve ser um UUID válido' })
  product_ids: string[];
}