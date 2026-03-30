export interface Supplier {
  id: string;
  company_name: string;
  country: string | null;
  city: string | null;
  notes: string | null;
  relationship_status: string | null;
  created_at: string;
}

export interface SupplierProduct {
  id: string;
  supplier_id: string;
  product_name: string;
  variants: string | null;
  moq: string | null;
  price: string | null;
  notes: string | null;
  created_at: string;
}
