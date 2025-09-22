export interface City {
  id: string;
  name: string;
  slug: string;
  lat: string;
  lng: string;
  bbox?: any;
}

export interface Shop {
  id: string;
  name: string;
  slug: string;
  lat: string;
  lng: string;
  street: string;
  city: string;
  zip?: string;
  phone?: string;
  website?: string;
  priceLevel?: number;
  halal: boolean;
  veg: boolean;
  meatType?: string;
  isPublished: boolean;
  // Special offers
  hasOffers: boolean;
  offers?: string[];
  // Delivery service  
  hasDelivery: boolean;
  deliveryFee?: string;
  minDeliveryOrder?: string;
  deliveryRadius?: number;
  createdAt: string;
  updatedAt: string;
}

export interface OpeningHours {
  id: string;
  shopId: string;
  weekday: number; // 0=Sunday, 1=Monday, etc.
  openTime?: string;
  closeTime?: string;
  note?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  isEmailVerified: boolean;
  preferences?: Record<string, any>;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InsertUser {
  email: string;
  password: string;
  name: string;
  avatarUrl?: string;
  preferences?: Record<string, any>;
}

export interface LoginUser {
  email: string;
  password: string;
}

export interface UpdateUserProfile {
  name?: string;
  avatarUrl?: string;
  preferences?: Record<string, any>;
}

export interface UserWithProfile extends User {
  favoriteCount: number;
  reviewCount: number;
}

export interface UserFavorite {
  id: string;
  userId: string;
  shopId: string;
  createdAt: string;
}

export interface FavoriteWithShop extends UserFavorite {
  shop: ShopWithDetails;
}

export interface Review {
  id: string;
  shopId: string;
  userId?: string;
  rating: number;
  text: string;
  userHash?: string;
  authorName?: string;
  isAnonymous: boolean;
  isEdited: boolean;
  editedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewWithUser extends Review {
  user?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  shop: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface Photo {
  id: string;
  shopId: string;
  url: string;
  thumbnailUrl?: string;
  source: string; // 'manual', 'google', 'imported'
  category?: string; // 'interior', 'exterior', 'food', 'menu', 'storefront', 'logo', 'other'
  status?: string; // 'pending', 'processing', 'completed', 'failed'
  isPrimary: boolean;
  sortOrder: number;
  // File metadata
  filename?: string;
  originalFilename?: string;
  mimeType?: string;
  fileSize?: number; // bytes
  width?: number;
  height?: number;
  // Google Places integration
  googlePhotoReference?: string;
  // Metadata and accessibility
  altText?: string;
  tags?: string[];
  description?: string;
  uploadedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ShopWithDetails extends Shop {
  openingHours: OpeningHours[];
  reviews: Review[];
  photos: Photo[];
  avgRating: number;
  reviewCount: number;
  distance?: number; // Distance in meters from user location (if calculated)
}

export interface Submission {
  id: string;
  type: 'new' | 'update';
  payload: any;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface SearchFilters {
  city?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  openNow?: boolean;
  halal?: boolean;
  veg?: boolean;
  hasOffers?: boolean;
  hasDelivery?: boolean;
  sortBy?: 'rating' | 'price' | 'distance';
}
