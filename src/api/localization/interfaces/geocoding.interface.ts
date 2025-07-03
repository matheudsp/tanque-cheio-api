export interface GeocodeResult {
  placeId: string;
  formattedAddress: string;
  location: { latitude: number; longitude: number };
}

export interface GeocodeResponse {
  results?: GeocodeResult[];
  errorMessage?: string;
}