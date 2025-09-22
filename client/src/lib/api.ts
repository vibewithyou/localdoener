import { apiRequest } from "./queryClient";
import type { 
  City, 
  ShopWithDetails, 
  Review, 
  Submission, 
  SearchFilters,
  User,
  InsertUser,
  LoginUser,
  UpdateUserProfile,
  UserWithProfile,
  ReviewWithUser,
  FavoriteWithShop,
  UserFavorite
} from "./types";

export const api = {
  // Cities
  getCities: async (): Promise<City[]> => {
    const res = await apiRequest('GET', '/api/cities');
    return res.json();
  },

  // Shops
  getTopShops: async (city?: string, limit = 3): Promise<ShopWithDetails[]> => {
    const params = new URLSearchParams();
    if (city) params.set('city', city);
    params.set('limit', limit.toString());
    
    const res = await apiRequest('GET', `/api/top?${params}`);
    return res.json();
  },

  getShops: async (filters: SearchFilters = {}): Promise<ShopWithDetails[]> => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.set(key, value.toString());
      }
    });

    const res = await apiRequest('GET', `/api/shops?${params}`);
    return res.json();
  },

  getShopBySlug: async (slug: string): Promise<ShopWithDetails> => {
    const res = await apiRequest('GET', `/api/shops/${slug}`);
    return res.json();
  },

  // Authentication
  register: async (data: InsertUser): Promise<{ user: User }> => {
    const res = await apiRequest('POST', '/api/auth/register', data);
    return res.json();
  },

  login: async (data: LoginUser): Promise<{ user: User }> => {
    const res = await apiRequest('POST', '/api/auth/login', data);
    return res.json();
  },

  logout: async (): Promise<{ message: string }> => {
    const res = await apiRequest('POST', '/api/auth/logout');
    return res.json();
  },

  getMe: async (): Promise<{ user: UserWithProfile }> => {
    const res = await apiRequest('GET', '/api/auth/me');
    return res.json();
  },

  updateProfile: async (data: UpdateUserProfile): Promise<{ user: User }> => {
    const res = await apiRequest('PUT', '/api/auth/profile', data);
    return res.json();
  },

  // User Favorites
  getUserFavorites: async (offset = 0, limit = 20): Promise<FavoriteWithShop[]> => {
    const params = new URLSearchParams({ offset: offset.toString(), limit: limit.toString() });
    const res = await apiRequest('GET', `/api/auth/favorites?${params}`);
    return res.json();
  },

  addFavorite: async (shopId: string): Promise<UserFavorite> => {
    const res = await apiRequest('POST', `/api/auth/favorites/${shopId}`);
    return res.json();
  },

  removeFavorite: async (shopId: string): Promise<{ message: string }> => {
    const res = await apiRequest('DELETE', `/api/auth/favorites/${shopId}`);
    return res.json();
  },

  // User Reviews
  getUserReviews: async (offset = 0, limit = 10): Promise<ReviewWithUser[]> => {
    const params = new URLSearchParams({ offset: offset.toString(), limit: limit.toString() });
    const res = await apiRequest('GET', `/api/auth/reviews?${params}`);
    return res.json();
  },

  // Reviews - Enhanced
  createReview: async (data: { shopId: string; rating: number; text: string }): Promise<Review> => {
    const res = await apiRequest('POST', '/api/reviews', data);
    return res.json();
  },

  updateReview: async (reviewId: string, data: { rating?: number; text?: string }): Promise<Review> => {
    const res = await apiRequest('PUT', `/api/reviews/${reviewId}`, data);
    return res.json();
  },

  deleteReview: async (reviewId: string): Promise<{ message: string }> => {
    const res = await apiRequest('DELETE', `/api/reviews/${reviewId}`);
    return res.json();
  },

  // Submissions
  createSubmission: async (data: { type: 'new' | 'update'; payload: any }): Promise<Submission> => {
    const res = await apiRequest('POST', '/api/submissions', data);
    return res.json();
  },

  // Admin
  getSubmissions: async (status?: string): Promise<Submission[]> => {
    const params = status ? `?status=${status}` : '';
    const res = await apiRequestWithOptions('GET', `/api/admin/submissions${params}`, undefined, {
      headers: {
        'X-Admin-Secret': import.meta.env.VITE_ADMIN_SECRET || 'dev-secret'
      }
    });
    return res.json();
  },

  updateSubmissionStatus: async (id: string, status: 'approved' | 'rejected'): Promise<Submission> => {
    const res = await apiRequestWithOptions('PATCH', `/api/admin/submissions/${id}`, { status }, {
      headers: {
        'X-Admin-Secret': import.meta.env.VITE_ADMIN_SECRET || 'dev-secret'
      }
    });
    return res.json();
  },

  createShop: async (data: any): Promise<any> => {
    const res = await apiRequestWithOptions('POST', '/api/admin/shops', data, {
      headers: {
        'X-Admin-Secret': import.meta.env.VITE_ADMIN_SECRET || 'dev-secret'
      }
    });
    return res.json();
  },

  updateShop: async (id: string, data: any): Promise<any> => {
    const res = await apiRequestWithOptions('PUT', `/api/admin/shops/${id}`, data, {
      headers: {
        'X-Admin-Secret': import.meta.env.VITE_ADMIN_SECRET || 'dev-secret'
      }
    });
    return res.json();
  },

  deleteShop: async (id: string): Promise<void> => {
    await apiRequestWithOptions('DELETE', `/api/admin/shops/${id}`, undefined, {
      headers: {
        'X-Admin-Secret': import.meta.env.VITE_ADMIN_SECRET || 'dev-secret'
      }
    });
  },

  bulkUpdateShops: async (ids: string[], updates: any): Promise<void> => {
    await apiRequestWithOptions('PATCH', '/api/admin/shops/bulk', { ids, updates }, {
      headers: {
        'X-Admin-Secret': import.meta.env.VITE_ADMIN_SECRET || 'dev-secret'
      }
    });
  },

  // Reviews Management
  getAllReviews: async (): Promise<Review[]> => {
    const res = await apiRequestWithOptions('GET', '/api/admin/reviews', undefined, {
      headers: {
        'X-Admin-Secret': import.meta.env.VITE_ADMIN_SECRET || 'dev-secret'
      }
    });
    return res.json();
  },

  // Google Places integration
  searchGooglePlaces: async (filters: { query?: string; city?: string; lat?: number; lng?: number; radius?: number }): Promise<any[]> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.set(key, value.toString());
      }
    });
    
    const res = await apiRequestWithOptions('GET', `/api/admin/google/search?${params}`, undefined, {
      headers: {
        'X-Admin-Secret': import.meta.env.VITE_ADMIN_SECRET || 'dev-secret'
      }
    });
    return res.json();
  },

  getGooglePlaceDetails: async (placeId: string): Promise<any> => {
    const res = await apiRequestWithOptions('GET', `/api/admin/google/details/${placeId}`, undefined, {
      headers: {
        'X-Admin-Secret': import.meta.env.VITE_ADMIN_SECRET || 'dev-secret'
      }
    });
    return res.json();
  },

  importFromGooglePlaces: async (placeId: string, options?: { forceUpdate?: boolean }): Promise<any> => {
    const res = await apiRequestWithOptions('POST', '/api/admin/google/import', { placeId, options }, {
      headers: {
        'X-Admin-Secret': import.meta.env.VITE_ADMIN_SECRET || 'dev-secret'
      }
    });
    return res.json();
  },

  searchGooglePlacesNearby: async (lat: number, lng: number, radius = 5000, keyword = 'döner kebab'): Promise<any[]> => {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
      radius: radius.toString(),
      keyword
    });
    
    const res = await apiRequestWithOptions('GET', `/api/admin/google/nearby?${params}`, undefined, {
      headers: {
        'X-Admin-Secret': import.meta.env.VITE_ADMIN_SECRET || 'dev-secret'
      }
    });
    return res.json();
  },

  getGooglePhotoUrl: (photoReference: string, maxWidth = 800): string => {
    return `/api/admin/google/photo/${photoReference}?maxWidth=${maxWidth}`;
  },

  // Photo Management
  getAllPhotos: async (filters?: { shopId?: string; category?: string; limit?: number; offset?: number }): Promise<Photo[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.set(key, value.toString());
        }
      });
    }
    
    const res = await apiRequestWithOptions('GET', `/api/admin/photos?${params}`, undefined, {
      headers: {
        'X-Admin-Secret': import.meta.env.VITE_ADMIN_SECRET || 'dev-secret'
      }
    });
    return res.json();
  },

  getPhotoById: async (id: string): Promise<Photo> => {
    const res = await apiRequestWithOptions('GET', `/api/admin/photos/${id}`, undefined, {
      headers: {
        'X-Admin-Secret': import.meta.env.VITE_ADMIN_SECRET || 'dev-secret'
      }
    });
    return res.json();
  },

  updatePhoto: async (id: string, updates: Partial<Photo>): Promise<Photo> => {
    const res = await apiRequestWithOptions('PATCH', `/api/admin/photos/${id}`, updates, {
      headers: {
        'X-Admin-Secret': import.meta.env.VITE_ADMIN_SECRET || 'dev-secret'
      }
    });
    return res.json();
  },

  deletePhoto: async (id: string): Promise<void> => {
    await apiRequestWithOptions('DELETE', `/api/admin/photos/${id}`, undefined, {
      headers: {
        'X-Admin-Secret': import.meta.env.VITE_ADMIN_SECRET || 'dev-secret'
      }
    });
  },

  setPrimaryPhoto: async (photoId: string): Promise<void> => {
    await apiRequestWithOptions('POST', `/api/admin/photos/${photoId}/set-primary`, {}, {
      headers: {
        'X-Admin-Secret': import.meta.env.VITE_ADMIN_SECRET || 'dev-secret'
      }
    });
  },

  reorderPhotos: async (shopId: string, photoIds: string[]): Promise<void> => {
    await apiRequestWithOptions('POST', `/api/admin/photos/reorder/${shopId}`, { photoIds }, {
      headers: {
        'X-Admin-Secret': import.meta.env.VITE_ADMIN_SECRET || 'dev-secret'
      }
    });
  },

  bulkUpdatePhotos: async (photoIds: string[], updates: any): Promise<void> => {
    await apiRequestWithOptions('POST', '/api/admin/photos/bulk-update', { photoIds, updates }, {
      headers: {
        'X-Admin-Secret': import.meta.env.VITE_ADMIN_SECRET || 'dev-secret'
      }
    });
  },

  bulkDeletePhotos: async (photoIds: string[]): Promise<void> => {
    await apiRequestWithOptions('DELETE', '/api/admin/photos/bulk-delete', { photoIds }, {
      headers: {
        'X-Admin-Secret': import.meta.env.VITE_ADMIN_SECRET || 'dev-secret'
      }
    });
  },

  // Google Photos Integration
  importGooglePhotos: async (shopId: string, placeId: string, options?: { 
    replaceExisting?: boolean; 
    categoryMapping?: Record<number, string>; 
  }): Promise<any> => {
    const res = await apiRequestWithOptions('POST', `/api/admin/google/photos/import/${shopId}`, 
      { placeId, ...options }, {
      headers: {
        'X-Admin-Secret': import.meta.env.VITE_ADMIN_SECRET || 'dev-secret'
      }
    });
    return res.json();
  },

  syncGooglePhotos: async (shopId: string, placeId: string): Promise<any> => {
    const res = await apiRequestWithOptions('POST', `/api/admin/google/photos/sync/${shopId}`, 
      { placeId }, {
      headers: {
        'X-Admin-Secret': import.meta.env.VITE_ADMIN_SECRET || 'dev-secret'
      }
    });
    return res.json();
  },

  // Development seed
  seedData: async (): Promise<any> => {
    const res = await apiRequest('POST', '/api/seed');
    return res.json();
  }
};

// API request helper with additional options
async function apiRequestWithOptions(
  method: string,
  url: string,
  data?: unknown,
  options: { headers?: Record<string, string> } = {}
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }

  return res;
}

// Override the api methods that need auth headers
Object.assign(api, {
  getSubmissions: async (status?: string): Promise<Submission[]> => {
    const params = status ? `?status=${status}` : '';
    const res = await apiRequestWithOptions('GET', `/api/admin/submissions${params}`, undefined, {
      headers: {
        'X-Admin-Secret': import.meta.env.VITE_ADMIN_SECRET || 'dev-secret'
      }
    });
    return res.json();
  },

  updateSubmissionStatus: async (id: string, status: 'approved' | 'rejected'): Promise<Submission> => {
    const res = await apiRequestWithOptions('PATCH', `/api/admin/submissions/${id}`, { status }, {
      headers: {
        'X-Admin-Secret': import.meta.env.VITE_ADMIN_SECRET || 'dev-secret'
      }
    });
    return res.json();
  },

  createShop: async (data: any): Promise<any> => {
    const res = await apiRequestWithOptions('POST', '/api/admin/shops', data, {
      headers: {
        'X-Admin-Secret': import.meta.env.VITE_ADMIN_SECRET || 'dev-secret'
      }
    });
    return res.json();
  },

  updateShop: async (id: string, data: any): Promise<any> => {
    const res = await apiRequestWithOptions('PUT', `/api/admin/shops/${id}`, data, {
      headers: {
        'X-Admin-Secret': import.meta.env.VITE_ADMIN_SECRET || 'dev-secret'
      }
    });
    return res.json();
  },

  deleteShop: async (id: string): Promise<void> => {
    await apiRequestWithOptions('DELETE', `/api/admin/shops/${id}`, undefined, {
      headers: {
        'X-Admin-Secret': import.meta.env.VITE_ADMIN_SECRET || 'dev-secret'
      }
    });
  }
});
