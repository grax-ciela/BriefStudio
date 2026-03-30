export interface Product {
  id: string;
  name: string;
  supplier_id: string | null;
  supplier_name: string | null;
  materials: string | null;
  dimensions: string | null;
  variants: string | null;
  packaging: string | null;
  moq: string | null;
  cost: string | null;
  notes: string | null;
  created_at: string;
}
