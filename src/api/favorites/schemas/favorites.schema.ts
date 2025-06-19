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


export type FavoriteCreateSchema = z.infer<typeof favoriteCreateSchema>;