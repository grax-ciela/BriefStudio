export interface Finding {
  id: string;
  company: string;
  city: string | null;
  product: string;
  moq: string | null;
  quoted_price: string | null;
  photo_url: string | null;
  created_at: string;
}
