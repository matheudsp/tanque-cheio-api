import { z } from 'zod';

export const geocodeAddressSchema = z.object({
  address: z.string().trim().min(5, "Address must have at least 5 characters"),
  city: z.string().trim().min(1),
  state: z.string().trim().min(2),
  zipCode: z.string().optional(),
});

export type GeocodeAddressSchema = z.infer<typeof geocodeAddressSchema>;