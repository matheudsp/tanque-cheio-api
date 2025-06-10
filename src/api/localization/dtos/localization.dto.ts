export class LocalizationCreateDto {
  state: string;
  city: string;
  address?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  coordinates: any;
}