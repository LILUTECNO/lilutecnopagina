
export interface Product {
  id: string;
  name: string;
  price: number;
  old_price?: number;
  category: string;
  stock: number;
  summary: string;
  images: string[];
  features: string[];
}

export interface ProductWithStringImages {
  id: string;
  name: string;
  price: number;
  old_price?: number;
  category: string;
  stock: number;
  summary: string;
  images: string; // Images as a single comma-separated string
  features: string[];
}

export interface CartItem extends Product {
  quantity: number;
  image: string; // To store the primary image for cart display
}

export interface FiltersState {
  searchTerm: string;
  category: string;
  priceRange: {
    min: number;
    max: number;
  };
  stockOnly: boolean;
}

export interface NotificationMessage {
  id: number;
  message: string;
  type: 'success' | 'error';
}
