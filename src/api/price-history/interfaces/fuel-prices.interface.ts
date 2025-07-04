export interface FuelPriceProduct {
  product_id: string;
  product_name: string;
  price: string;
  unit_of_measure: string;
  collection_date: string;
  percentage_change: number | null;
  trend: 'DOWN' | 'STABLE' | 'UP' | null;
}
