import { 
  users, cities, shops, openingHours, reviews, photos, submissions, userFavorites,
  pushSubscriptions, notificationPreferences, notificationHistory,
  type User, type InsertUser, type LoginUser, type UpdateUserProfile, type UserWithProfile,
  type City, type InsertCity, 
  type Shop, type InsertShop, type ShopWithDetails,
  type OpeningHours, type InsertOpeningHours,
  type Review, type InsertReview, type ReviewWithUser, type UpdateReview,
  type Photo, type InsertPhoto,
  type Submission, type InsertSubmission,
  type UserFavorite, type InsertUserFavorite, type FavoriteWithShop,
  type PushSubscription, type InsertPushSubscription,
  type NotificationPreference, type InsertNotificationPreference,
  type NotificationHistory, type InsertNotificationHistory
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, or, like, sql, avg, count } from "drizzle-orm";

export interface IStorage {
  // Users - Enhanced Authentication
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>; // Legacy support
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: UpdateUserProfile): Promise<User>;
  updateUserLastLogin(id: string): Promise<void>;
  getUserWithProfile(id: string): Promise<UserWithProfile | undefined>;
  verifyUserEmail(id: string): Promise<void>;

  // Cities
  getCities(): Promise<City[]>;
  getCityBySlug(slug: string): Promise<City | undefined>;

  // Shops
  getShops(filters?: {
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
    limit?: number;
    offset?: number;
  }): Promise<ShopWithDetails[]>;
  
  getShopBySlug(slug: string): Promise<ShopWithDetails | undefined>;
  getShopByGooglePlaceId(googlePlaceId: string): Promise<Shop | undefined>;
  createShop(shop: InsertShop): Promise<Shop>;
  updateShop(id: string, shop: Partial<InsertShop>): Promise<Shop>;
  deleteShop(id: string): Promise<void>;
  createShopFromGoogle(shopData: any, openingHours?: any[], photos?: any[]): Promise<Shop>;
  updateShopWithGoogleData(id: string, googleData: any): Promise<Shop>;

  // Opening Hours
  createOpeningHours(hours: InsertOpeningHours[]): Promise<OpeningHours[]>;
  updateOpeningHours(shopId: string, hours: InsertOpeningHours[]): Promise<OpeningHours[]>;

  // Reviews - Enhanced with User Support
  getReviewsByShopId(shopId: string, offset?: number, limit?: number): Promise<ReviewWithUser[]>;
  getReviewsByUserId(userId: string, offset?: number, limit?: number): Promise<ReviewWithUser[]>;
  createReview(review: InsertReview & { userHash?: string; userId?: string; isAnonymous?: boolean }): Promise<Review>;
  updateReview(reviewId: string, userId: string, updates: UpdateReview): Promise<Review>;
  deleteReview(reviewId: string, userId: string): Promise<void>;
  getUserReviewForShop(userId: string, shopId: string): Promise<Review | undefined>;

  // Photos
  getPhotosByShopId(shopId: string): Promise<Photo[]>;
  getPhotoById(id: string): Promise<Photo | undefined>;
  getAllPhotos(filters?: { shopId?: string; category?: string; limit?: number; offset?: number }): Promise<Photo[]>;
  createPhoto(photo: InsertPhoto): Promise<Photo>;
  updatePhoto(id: string, updates: Partial<InsertPhoto>): Promise<Photo>;
  deletePhoto(id: string): Promise<void>;
  updateShopPhotos(shopId: string, updates: Partial<InsertPhoto>): Promise<void>;
  createPhotosFromGoogle(shopId: string, googlePhotos: any[]): Promise<Photo[]>;
  importGooglePhotosForShop(shopId: string, googlePhotos: any[], options?: {
    replaceExisting?: boolean;
    categoryMapping?: Record<number, string>;
  }): Promise<Photo[]>;
  syncGooglePhotosForShop(shopId: string, googlePhotos: any[]): Promise<{
    added: Photo[];
    updated: Photo[];
    existing: Photo[];
  }>;

  // User Favorites
  getUserFavorites(userId: string, offset?: number, limit?: number): Promise<FavoriteWithShop[]>;
  addUserFavorite(userId: string, shopId: string): Promise<UserFavorite>;
  removeUserFavorite(userId: string, shopId: string): Promise<void>;
  isShopFavorited(userId: string, shopId: string): Promise<boolean>;
  getUserFavoriteShopIds(userId: string): Promise<string[]>;

  // Submissions
  getSubmissions(status?: 'pending' | 'approved' | 'rejected'): Promise<Submission[]>;
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  updateSubmissionStatus(id: string, status: 'approved' | 'rejected'): Promise<Submission>;

  // Push Subscriptions
  getPushSubscriptionByUserId(userId: string): Promise<PushSubscription | undefined>;
  getPushSubscriptionByEndpoint(endpoint: string): Promise<PushSubscription | undefined>;
  createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription>;
  updatePushSubscription(id: string, updates: Partial<InsertPushSubscription>): Promise<PushSubscription>;
  deletePushSubscription(id: string): Promise<void>;
  deletePushSubscriptionByUserId(userId: string): Promise<void>;
  getActivePushSubscriptions(): Promise<PushSubscription[]>;

  // Notification Preferences
  getNotificationPreferences(userId: string): Promise<NotificationPreference[]>;
  getNotificationPreference(userId: string, type: string): Promise<NotificationPreference | undefined>;
  createNotificationPreference(preference: InsertNotificationPreference): Promise<NotificationPreference>;
  updateNotificationPreference(id: string, updates: Partial<InsertNotificationPreference>): Promise<NotificationPreference>;
  deleteNotificationPreference(id: string): Promise<void>;
  initializeDefaultNotificationPreferences(userId: string): Promise<NotificationPreference[]>;

  // Notification History
  getNotificationHistory(userId: string, offset?: number, limit?: number): Promise<NotificationHistory[]>;
  createNotificationHistory(notification: InsertNotificationHistory): Promise<NotificationHistory>;
  updateNotificationStatus(id: string, status: string, timestamp?: Date): Promise<NotificationHistory>;
  getNotificationStatistics(userId: string): Promise<{
    totalSent: number;
    totalDelivered: number;
    totalClicked: number;
    byType: Record<string, number>;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // Legacy support - for now, treat username as email
    return this.getUserByEmail(username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        updatedAt: new Date(),
      })
      .returning();
    return user;
  }

  async updateUser(id: string, updates: UpdateUserProfile): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  }

  async updateUserLastLogin(id: string): Promise<void> {
    await db
      .update(users)
      .set({
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
  }

  async getUserWithProfile(id: string): Promise<UserWithProfile | undefined> {
    const [result] = await db
      .select({
        user: users,
        favoriteCount: sql<number>`COUNT(DISTINCT ${userFavorites.id})`,
        reviewCount: sql<number>`COUNT(DISTINCT ${reviews.id})`,
      })
      .from(users)
      .leftJoin(userFavorites, eq(users.id, userFavorites.userId))
      .leftJoin(reviews, eq(users.id, reviews.userId))
      .where(eq(users.id, id))
      .groupBy(users.id);

    if (!result) {
      return undefined;
    }

    return {
      ...result.user,
      favoriteCount: Number(result.favoriteCount),
      reviewCount: Number(result.reviewCount),
    };
  }

  async verifyUserEmail(id: string): Promise<void> {
    await db
      .update(users)
      .set({
        isEmailVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
  }

  async getCities(): Promise<City[]> {
    return await db.select().from(cities).orderBy(asc(cities.name));
  }

  async getCityBySlug(slug: string): Promise<City | undefined> {
    const [city] = await db.select().from(cities).where(eq(cities.slug, slug));
    return city || undefined;
  }

  async getShops(filters: {
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
    limit?: number;
    offset?: number;
  } = {}): Promise<ShopWithDetails[]> {
    const { city, lat, lng, radius, halal, veg, hasOffers, hasDelivery, limit = 50, offset = 0 } = filters;
    
    // Build base query with aggregations (WITHOUT limit/offset initially)
    const baseQuery = db
      .select({
        shop: shops,
        avgRating: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
        reviewCount: sql<number>`COUNT(${reviews.id})`,
      })
      .from(shops)
      .leftJoin(reviews, eq(shops.id, reviews.shopId))
      .where(
        and(
          eq(shops.isPublished, true),
          city ? eq(shops.city, city) : undefined,
          halal ? eq(shops.halal, true) : undefined,
          veg ? eq(shops.veg, true) : undefined,
          hasOffers ? eq(shops.hasOffers, true) : undefined,
          hasDelivery ? eq(shops.hasDelivery, true) : undefined
        )
      )
      .groupBy(shops.id);

    // Apply sorting for non-distance cases
    if (filters.sortBy === 'rating') {
      baseQuery.orderBy(desc(sql`AVG(${reviews.rating})`));
    } else if (filters.sortBy === 'price') {
      baseQuery.orderBy(asc(shops.priceLevel));
    } else if (filters.sortBy !== 'distance') {
      // Default: price first, then rating (only if not sorting by distance)
      baseQuery.orderBy(asc(shops.priceLevel), desc(sql`AVG(${reviews.rating})`));
    }

    let result = await baseQuery;

    // Calculate distances and apply distance-based filtering/sorting if lat/lng provided
    if (lat !== undefined && lng !== undefined) {
      // Calculate distance for each shop
      const shopsWithDistance = result.map(item => {
        const shopLat = parseFloat(item.shop.lat);
        const shopLng = parseFloat(item.shop.lng);
        const distance = this.calculateDistance(lat, lng, shopLat, shopLng);
        
        return {
          ...item,
          distance
        };
      });

      // Apply radius filtering if specified
      let filteredShops = shopsWithDistance;
      if (radius !== undefined) {
        filteredShops = shopsWithDistance.filter(item => item.distance <= radius);
      }

      // Apply distance sorting if requested
      if (filters.sortBy === 'distance') {
        filteredShops.sort((a, b) => a.distance - b.distance);
      }

      result = filteredShops;
    }

    // Apply pagination AFTER distance calculations and filtering
    const paginatedResult = result.slice(offset, offset + limit);

    // Fetch related data for each shop
    const shopsWithDetails: ShopWithDetails[] = [];
    
    for (const item of paginatedResult) {
      const [hoursData, reviewsData, photosData] = await Promise.all([
        db.select().from(openingHours).where(eq(openingHours.shopId, item.shop.id)),
        db.select().from(reviews).where(eq(reviews.shopId, item.shop.id)).orderBy(desc(reviews.createdAt)).limit(5),
        db.select().from(photos).where(eq(photos.shopId, item.shop.id))
      ]);

      const shopWithDetails: ShopWithDetails = {
        ...item.shop,
        openingHours: hoursData,
        reviews: reviewsData,
        photos: photosData,
        avgRating: Number(item.avgRating),
        reviewCount: Number(item.reviewCount),
      };

      // Include distance if calculated
      if ('distance' in item && typeof item.distance === 'number') {
        shopWithDetails.distance = item.distance;
      }

      shopsWithDetails.push(shopWithDetails);
    }

    return shopsWithDetails;
  }

  // Helper method to calculate distance between two points using Haversine formula
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.degreesToRadians(lat2 - lat1);
    const dLng = this.degreesToRadians(lng2 - lng1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.degreesToRadians(lat1)) * Math.cos(this.degreesToRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    
    return Math.round(distance * 1000); // Return distance in meters, rounded
  }

  private degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  async getShopBySlug(slug: string): Promise<ShopWithDetails | undefined> {
    const [shop] = await db.select().from(shops).where(eq(shops.slug, slug));
    if (!shop) return undefined;

    const [hoursData, reviewsData, photosData, ratingsData] = await Promise.all([
      db.select().from(openingHours).where(eq(openingHours.shopId, shop.id)).orderBy(asc(openingHours.weekday)),
      db.select().from(reviews).where(eq(reviews.shopId, shop.id)).orderBy(desc(reviews.createdAt)),
      db.select().from(photos).where(eq(photos.shopId, shop.id)),
      db.select({
        avgRating: sql<number>`AVG(${reviews.rating})`,
        reviewCount: sql<number>`COUNT(${reviews.id})`
      }).from(reviews).where(eq(reviews.shopId, shop.id))
    ]);

    const ratings = ratingsData[0] || { avgRating: 0, reviewCount: 0 };

    return {
      ...shop,
      openingHours: hoursData,
      reviews: reviewsData,
      photos: photosData,
      avgRating: Number(ratings.avgRating) || 0,
      reviewCount: Number(ratings.reviewCount) || 0,
    };
  }

  async createShop(shop: InsertShop): Promise<Shop> {
    const [newShop] = await db
      .insert(shops)
      .values(shop)
      .returning();
    return newShop;
  }

  async updateShop(id: string, shop: Partial<InsertShop>): Promise<Shop> {
    const [updatedShop] = await db
      .update(shops)
      .set({ ...shop, updatedAt: new Date() })
      .where(eq(shops.id, id))
      .returning();
    return updatedShop;
  }

  async deleteShop(id: string): Promise<void> {
    await db.delete(shops).where(eq(shops.id, id));
  }

  async createOpeningHours(hours: InsertOpeningHours[]): Promise<OpeningHours[]> {
    if (hours.length === 0) return [];
    return await db.insert(openingHours).values(hours).returning();
  }

  async updateOpeningHours(shopId: string, hours: InsertOpeningHours[]): Promise<OpeningHours[]> {
    // Delete existing hours
    await db.delete(openingHours).where(eq(openingHours.shopId, shopId));
    
    // Insert new hours
    if (hours.length === 0) return [];
    return await db.insert(openingHours).values(hours).returning();
  }

  async getReviewsByShopId(shopId: string, offset = 0, limit = 10): Promise<ReviewWithUser[]> {
    const reviewsData = await db
      .select({
        review: reviews,
        user: {
          id: users.id,
          name: users.name,
          avatarUrl: users.avatarUrl,
        },
        shop: {
          id: shops.id,
          name: shops.name,
          slug: shops.slug,
        }
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.userId, users.id))
      .leftJoin(shops, eq(reviews.shopId, shops.id))
      .where(eq(reviews.shopId, shopId))
      .orderBy(desc(reviews.createdAt))
      .limit(limit)
      .offset(offset);

    return reviewsData.map(item => ({
      ...item.review,
      user: item.user.id ? item.user : undefined,
      shop: item.shop
    }));
  }

  async getReviewsByUserId(userId: string, offset = 0, limit = 10): Promise<ReviewWithUser[]> {
    const reviewsData = await db
      .select({
        review: reviews,
        user: {
          id: users.id,
          name: users.name,
          avatarUrl: users.avatarUrl,
        },
        shop: {
          id: shops.id,
          name: shops.name,
          slug: shops.slug,
        }
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.userId, users.id))
      .leftJoin(shops, eq(reviews.shopId, shops.id))
      .where(eq(reviews.userId, userId))
      .orderBy(desc(reviews.createdAt))
      .limit(limit)
      .offset(offset);

    return reviewsData.map(item => ({
      ...item.review,
      user: item.user.id ? item.user : undefined,
      shop: item.shop
    }));
  }

  async createReview(review: InsertReview & { userHash?: string; userId?: string; isAnonymous?: boolean }): Promise<Review> {
    const { userHash, userId, isAnonymous = !userId, ...reviewData } = review;
    
    const [newReview] = await db
      .insert(reviews)
      .values({
        ...reviewData,
        userId: userId || null,
        userHash: userHash || null,
        isAnonymous: isAnonymous,
        authorName: userId ? null : 'Anonymer Nutzer', // Will be populated from user data if authenticated
        updatedAt: new Date(),
      })
      .returning();
    return newReview;
  }

  async updateReview(reviewId: string, userId: string, updates: UpdateReview): Promise<Review> {
    const [updatedReview] = await db
      .update(reviews)
      .set({
        ...updates,
        isEdited: true,
        editedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(reviews.id, reviewId),
        eq(reviews.userId, userId)
      ))
      .returning();

    if (!updatedReview) {
      throw new Error('Review not found or unauthorized');
    }

    return updatedReview;
  }

  async deleteReview(reviewId: string, userId: string): Promise<void> {
    const result = await db
      .delete(reviews)
      .where(and(
        eq(reviews.id, reviewId),
        eq(reviews.userId, userId)
      ));

    if (result.rowCount === 0) {
      throw new Error('Review not found or unauthorized');
    }
  }

  async getUserReviewForShop(userId: string, shopId: string): Promise<Review | undefined> {
    const [review] = await db
      .select()
      .from(reviews)
      .where(and(
        eq(reviews.userId, userId),
        eq(reviews.shopId, shopId)
      ));

    return review || undefined;
  }

  async getPhotosByShopId(shopId: string): Promise<Photo[]> {
    return await db
      .select()
      .from(photos)
      .where(eq(photos.shopId, shopId))
      .orderBy(desc(photos.createdAt));
  }

  async createPhoto(photo: InsertPhoto): Promise<Photo> {
    const [newPhoto] = await db
      .insert(photos)
      .values(photo)
      .returning();
    return newPhoto;
  }

  async getPhotoById(id: string): Promise<Photo | undefined> {
    const [photo] = await db
      .select()
      .from(photos)
      .where(eq(photos.id, id));
    return photo || undefined;
  }

  async getAllPhotos(filters: { 
    shopId?: string; 
    category?: string; 
    limit?: number; 
    offset?: number 
  } = {}): Promise<Photo[]> {
    const { shopId, category, limit = 50, offset = 0 } = filters;
    
    let query = db.select().from(photos);
    
    const conditions = [];
    if (shopId) {
      conditions.push(eq(photos.shopId, shopId));
    }
    if (category) {
      conditions.push(eq(photos.category, category as any));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query
      .orderBy(asc(photos.sortOrder), desc(photos.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async updatePhoto(id: string, updates: Partial<InsertPhoto>): Promise<Photo> {
    const [updatedPhoto] = await db
      .update(photos)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(photos.id, id))
      .returning();
    return updatedPhoto;
  }

  async deletePhoto(id: string): Promise<void> {
    await db.delete(photos).where(eq(photos.id, id));
  }

  async updateShopPhotos(shopId: string, updates: Partial<InsertPhoto>): Promise<void> {
    await db
      .update(photos)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(photos.shopId, shopId));
  }

  // User Favorites Implementation
  async getUserFavorites(userId: string, offset = 0, limit = 20): Promise<FavoriteWithShop[]> {
    const favoritesData = await db
      .select({
        favorite: userFavorites,
        shop: shops,
      })
      .from(userFavorites)
      .innerJoin(shops, eq(userFavorites.shopId, shops.id))
      .where(eq(userFavorites.userId, userId))
      .orderBy(desc(userFavorites.createdAt))
      .limit(limit)
      .offset(offset);

    // For each shop, get the full details
    const favoritesWithDetails: FavoriteWithShop[] = [];
    
    for (const item of favoritesData) {
      const [hoursData, reviewsData, photosData] = await Promise.all([
        db.select().from(openingHours).where(eq(openingHours.shopId, item.shop.id)),
        this.getReviewsByShopId(item.shop.id, 0, 5),
        db.select().from(photos).where(eq(photos.shopId, item.shop.id))
      ]);

      // Calculate shop rating and review count
      const [ratingData] = await db
        .select({
          avgRating: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
          reviewCount: sql<number>`COUNT(${reviews.id})`,
        })
        .from(reviews)
        .where(eq(reviews.shopId, item.shop.id));

      const shopWithDetails: ShopWithDetails = {
        ...item.shop,
        openingHours: hoursData,
        reviews: reviewsData,
        photos: photosData,
        avgRating: Number(ratingData?.avgRating || 0),
        reviewCount: Number(ratingData?.reviewCount || 0),
        isFavorited: true, // Always true for favorites list
      };

      favoritesWithDetails.push({
        ...item.favorite,
        shop: shopWithDetails,
      });
    }

    return favoritesWithDetails;
  }

  async addUserFavorite(userId: string, shopId: string): Promise<UserFavorite> {
    // Check if already favorited
    const existing = await db
      .select()
      .from(userFavorites)
      .where(and(
        eq(userFavorites.userId, userId),
        eq(userFavorites.shopId, shopId)
      ));

    if (existing.length > 0) {
      return existing[0];
    }

    const [favorite] = await db
      .insert(userFavorites)
      .values({
        userId,
        shopId,
      })
      .returning();

    return favorite;
  }

  async removeUserFavorite(userId: string, shopId: string): Promise<void> {
    await db
      .delete(userFavorites)
      .where(and(
        eq(userFavorites.userId, userId),
        eq(userFavorites.shopId, shopId)
      ));
  }

  async isShopFavorited(userId: string, shopId: string): Promise<boolean> {
    const [favorite] = await db
      .select()
      .from(userFavorites)
      .where(and(
        eq(userFavorites.userId, userId),
        eq(userFavorites.shopId, shopId)
      ));

    return !!favorite;
  }

  async getUserFavoriteShopIds(userId: string): Promise<string[]> {
    const favorites = await db
      .select({
        shopId: userFavorites.shopId,
      })
      .from(userFavorites)
      .where(eq(userFavorites.userId, userId));

    return favorites.map(f => f.shopId);
  }

  async getSubmissions(status?: 'pending' | 'approved' | 'rejected'): Promise<Submission[]> {
    const query = db.select().from(submissions);
    
    if (status) {
      query.where(eq(submissions.status, status));
    }
    
    return await query.orderBy(desc(submissions.createdAt));
  }

  async createSubmission(submission: InsertSubmission): Promise<Submission> {
    const [newSubmission] = await db
      .insert(submissions)
      .values(submission)
      .returning();
    return newSubmission;
  }

  async updateSubmissionStatus(id: string, status: 'approved' | 'rejected'): Promise<Submission> {
    const [updatedSubmission] = await db
      .update(submissions)
      .set({ status })
      .where(eq(submissions.id, id))
      .returning();
    return updatedSubmission;
  }

  // Google Places integration methods
  async getShopByGooglePlaceId(googlePlaceId: string): Promise<Shop | undefined> {
    const [shop] = await db.select().from(shops).where(eq(shops.googlePlaceId, googlePlaceId));
    return shop || undefined;
  }

  async createShopFromGoogle(
    shopData: any,
    openingHours: any[] = [],
    googlePhotos: any[] = []
  ): Promise<Shop> {
    // Create the shop first
    const [newShop] = await db
      .insert(shops)
      .values({
        ...shopData,
        lastGoogleSync: new Date()
      })
      .returning();

    // Create opening hours if provided
    if (openingHours.length > 0) {
      await this.createOpeningHours(
        openingHours.map(hours => ({
          ...hours,
          shopId: newShop.id
        }))
      );
    }

    // Create photos if provided
    if (googlePhotos.length > 0) {
      await this.createPhotosFromGoogle(newShop.id, googlePhotos);
    }

    return newShop;
  }

  async updateShopWithGoogleData(id: string, googleData: any): Promise<Shop> {
    const [updatedShop] = await db
      .update(shops)
      .set({
        ...googleData,
        lastGoogleSync: new Date(),
        updatedAt: new Date()
      })
      .where(eq(shops.id, id))
      .returning();
    return updatedShop;
  }

  async createPhotosFromGoogle(shopId: string, googlePhotos: any[]): Promise<Photo[]> {
    if (googlePhotos.length === 0) return [];
    
    const photoData = googlePhotos.map((photo, index) => ({
      shopId,
      url: photo.url || '', 
      thumbnailUrl: photo.thumbnailUrl || photo.url || '',
      source: 'google' as const,
      category: photo.category || (index === 0 ? 'storefront' : 'other'),
      status: 'completed' as const,
      isPrimary: index === 0, // First photo becomes primary
      sortOrder: index,
      googlePhotoReference: photo.googlePhotoReference,
      width: photo.width,
      height: photo.height,
      altText: `${photo.category || 'Photo'} of the restaurant`,
      description: `Google Places photo`,
      tags: ['google-places'],
      uploadedBy: 'google-places-sync'
    }));

    return await db.insert(photos).values(photoData).returning();
  }

  // Enhanced Google photo import with better categorization
  async importGooglePhotosForShop(shopId: string, googlePhotos: any[], options?: {
    replaceExisting?: boolean;
    categoryMapping?: Record<number, string>;
  }): Promise<Photo[]> {
    const { replaceExisting = false, categoryMapping = {} } = options || {};

    if (replaceExisting) {
      // Remove existing Google photos
      await db.delete(photos).where(
        and(eq(photos.shopId, shopId), eq(photos.source, 'google'))
      );
    }

    // Enhanced photo data with better categorization
    const photoData = googlePhotos.map((photo, index) => {
      const category = categoryMapping[index] || photo.category || 
        (index === 0 ? 'storefront' : 'other');
      
      return {
        shopId,
        url: photo.url || '',
        thumbnailUrl: photo.thumbnailUrl || photo.url || '',
        source: 'google' as const,
        category: category as any,
        status: 'completed' as const,
        isPrimary: !replaceExisting ? index === 0 : false, // Only set primary if not replacing
        sortOrder: index + 1000, // Google photos get higher sort order
        googlePhotoReference: photo.googlePhotoReference,
        width: photo.width,
        height: photo.height,
        altText: `${category} view of the restaurant`,
        description: photo.description || 'Photo from Google Places',
        tags: ['google-places', category],
        uploadedBy: 'google-places-import'
      };
    });

    return await db.insert(photos).values(photoData).returning();
  }

  // Sync Google photos (update existing, add new)
  async syncGooglePhotosForShop(shopId: string, googlePhotos: any[]): Promise<{
    added: Photo[];
    updated: Photo[];
    existing: Photo[];
  }> {
    const existingGooglePhotos = await db
      .select()
      .from(photos)
      .where(
        and(
          eq(photos.shopId, shopId),
          eq(photos.source, 'google')
        )
      );

    const existingReferences = new Set(
      existingGooglePhotos
        .map(p => p.googlePhotoReference)
        .filter(Boolean)
    );

    const newPhotos = googlePhotos.filter(
      photo => !existingReferences.has(photo.googlePhotoReference)
    );

    const added = newPhotos.length > 0 
      ? await this.createPhotosFromGoogle(shopId, newPhotos)
      : [];

    // Update existing photos with fresh URLs if needed
    const updated: Photo[] = [];
    for (const existingPhoto of existingGooglePhotos) {
      const googlePhoto = googlePhotos.find(
        p => p.googlePhotoReference === existingPhoto.googlePhotoReference
      );
      
      if (googlePhoto && googlePhoto.url !== existingPhoto.url) {
        const updatedPhoto = await this.updatePhoto(existingPhoto.id, {
          url: googlePhoto.url,
          thumbnailUrl: googlePhoto.thumbnailUrl || googlePhoto.url,
          width: googlePhoto.width,
          height: googlePhoto.height,
          updatedAt: new Date()
        });
        updated.push(updatedPhoto);
      }
    }

    return {
      added,
      updated,
      existing: existingGooglePhotos.filter(p => !updated.find(u => u.id === p.id))
    };
  }

  // Push Subscriptions Implementation
  async getPushSubscriptionByUserId(userId: string): Promise<PushSubscription | undefined> {
    const [subscription] = await db
      .select()
      .from(pushSubscriptions)
      .where(and(
        eq(pushSubscriptions.userId, userId),
        eq(pushSubscriptions.isActive, true)
      ));
    return subscription || undefined;
  }

  async getPushSubscriptionByEndpoint(endpoint: string): Promise<PushSubscription | undefined> {
    const [subscription] = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint));
    return subscription || undefined;
  }

  async createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription> {
    // First, deactivate any existing subscriptions for this user
    await db
      .update(pushSubscriptions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(pushSubscriptions.userId, subscription.userId));

    const [newSubscription] = await db
      .insert(pushSubscriptions)
      .values({
        ...subscription,
        isActive: true,
        lastUsed: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    return newSubscription;
  }

  async updatePushSubscription(id: string, updates: Partial<InsertPushSubscription>): Promise<PushSubscription> {
    const [subscription] = await db
      .update(pushSubscriptions)
      .set({
        ...updates,
        lastUsed: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(pushSubscriptions.id, id))
      .returning();
    
    if (!subscription) {
      throw new Error('Push subscription not found');
    }
    
    return subscription;
  }

  async deletePushSubscription(id: string): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, id));
  }

  async deletePushSubscriptionByUserId(userId: string): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  }

  async getActivePushSubscriptions(): Promise<PushSubscription[]> {
    return await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.isActive, true))
      .orderBy(desc(pushSubscriptions.lastUsed));
  }

  // Notification Preferences Implementation
  async getNotificationPreferences(userId: string): Promise<NotificationPreference[]> {
    return await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .orderBy(asc(notificationPreferences.type));
  }

  async getNotificationPreference(userId: string, type: string): Promise<NotificationPreference | undefined> {
    const [preference] = await db
      .select()
      .from(notificationPreferences)
      .where(and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.type, type as any)
      ));
    return preference || undefined;
  }

  async createNotificationPreference(preference: InsertNotificationPreference): Promise<NotificationPreference> {
    const [newPreference] = await db
      .insert(notificationPreferences)
      .values({
        ...preference,
        updatedAt: new Date(),
      })
      .returning();
    
    return newPreference;
  }

  async updateNotificationPreference(id: string, updates: Partial<InsertNotificationPreference>): Promise<NotificationPreference> {
    const [preference] = await db
      .update(notificationPreferences)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(notificationPreferences.id, id))
      .returning();
    
    if (!preference) {
      throw new Error('Notification preference not found');
    }
    
    return preference;
  }

  async deleteNotificationPreference(id: string): Promise<void> {
    await db.delete(notificationPreferences).where(eq(notificationPreferences.id, id));
  }

  async initializeDefaultNotificationPreferences(userId: string): Promise<NotificationPreference[]> {
    const defaultPreferences = [
      { userId, type: 'opening_hours' as const, enabled: true, settings: { minutesBefore: 30 } },
      { userId, type: 'special_offers' as const, enabled: true, settings: { immediate: true } },
      { userId, type: 'nearby_shops' as const, enabled: false, settings: { radius: 5 } },
      { userId, type: 'review_responses' as const, enabled: true, settings: { immediate: true } },
      { userId, type: 'weekly_digest' as const, enabled: true, settings: { day: 'sunday', hour: 18 } },
    ];

    const preferences = await Promise.all(
      defaultPreferences.map(async (pref) => {
        // Check if preference already exists
        const existing = await this.getNotificationPreference(userId, pref.type);
        if (existing) {
          return existing;
        }
        
        return await this.createNotificationPreference(pref);
      })
    );

    return preferences;
  }

  // Notification History Implementation
  async getNotificationHistory(userId: string, offset = 0, limit = 20): Promise<NotificationHistory[]> {
    return await db
      .select()
      .from(notificationHistory)
      .where(eq(notificationHistory.userId, userId))
      .orderBy(desc(notificationHistory.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async createNotificationHistory(notification: InsertNotificationHistory): Promise<NotificationHistory> {
    const [newNotification] = await db
      .insert(notificationHistory)
      .values(notification)
      .returning();
    
    return newNotification;
  }

  async updateNotificationStatus(id: string, status: string, timestamp?: Date): Promise<NotificationHistory> {
    const updateData: any = {
      status: status as any,
    };

    // Set appropriate timestamp based on status
    if (status === 'sent') {
      updateData.sentAt = timestamp || new Date();
    } else if (status === 'delivered') {
      updateData.deliveredAt = timestamp || new Date();
    } else if (status === 'clicked') {
      updateData.clickedAt = timestamp || new Date();
    }

    const [notification] = await db
      .update(notificationHistory)
      .set(updateData)
      .where(eq(notificationHistory.id, id))
      .returning();
    
    if (!notification) {
      throw new Error('Notification not found');
    }
    
    return notification;
  }

  async getNotificationStatistics(userId: string): Promise<{
    totalSent: number;
    totalDelivered: number;
    totalClicked: number;
    byType: Record<string, number>;
  }> {
    const stats = await db
      .select({
        status: notificationHistory.status,
        type: notificationHistory.type,
        count: sql<number>`COUNT(*)`,
      })
      .from(notificationHistory)
      .where(eq(notificationHistory.userId, userId))
      .groupBy(notificationHistory.status, notificationHistory.type);

    const result = {
      totalSent: 0,
      totalDelivered: 0,
      totalClicked: 0,
      byType: {} as Record<string, number>,
    };

    for (const stat of stats) {
      const count = Number(stat.count);
      
      if (stat.status === 'sent') {
        result.totalSent += count;
      } else if (stat.status === 'delivered') {
        result.totalDelivered += count;
      } else if (stat.status === 'clicked') {
        result.totalClicked += count;
      }

      if (!result.byType[stat.type]) {
        result.byType[stat.type] = 0;
      }
      result.byType[stat.type] += count;
    }

    return result;
  }
}

export const storage = new DatabaseStorage();
