import { z } from 'zod';



const favoriteCreateSchema = z.object({
  stationId: z.string().uuid({ message: 'Invalid Station ID format' }),
  productId: z.string().uuid({ message: 'Invalid Product ID format' }),
});


export type FavoriteCreateSchema = z.infer<typeof favoriteCreateSchema>;
export {favoriteCreateSchema}