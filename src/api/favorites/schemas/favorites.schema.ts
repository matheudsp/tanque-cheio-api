import { z } from 'zod';

export const favoriteCreateSchema = z.object({
  station_id: z.string().uuid({ message: 'Invalid Station ID format' }),
  product_id: z.string().uuid({ message: 'Invalid Product ID format' }),
});

export const favoriteRemoveSchema = z.object({
  station_id: z.string().uuid({ message: 'Invalid Station ID format' }),
  product_id: z.string().uuid({ message: 'Invalid Product ID format' }),
});

export const favoriteGetUserSchema = z.object({
  user_id: z.string().uuid({ message: 'Invalid User ID format' }),
});

export const favoriteBulkSchema = z.object({
  station_id: z.string().uuid({ message: 'Formato de Station ID inválido' }),
  product_ids: z
    .array(z.string().uuid({ message: 'Formato de Product ID inválido' }))
    .nonempty({ message: 'A lista de produtos não pode estar vazia' }),
});


export type FavoriteCreateSchema = z.infer<typeof favoriteCreateSchema>;
export type FavoriteGetUserSchema = z.infer<typeof favoriteGetUserSchema>;
export type FavoriteRemoveSchema = z.infer<typeof favoriteRemoveSchema>;
export type FavoriteBulkSchema  = z.infer<typeof favoriteBulkSchema>;