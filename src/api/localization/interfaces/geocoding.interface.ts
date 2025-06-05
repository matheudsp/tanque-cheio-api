export interface GeocodingResult {
  id: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  success: boolean;
  error?: string;
}

export interface GeocodingResponse {
  results: Array<{ geometry: { location: { lat: number; lng: number } } }>;
  status: string;
  error_message?: string;
}