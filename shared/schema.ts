import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, boolean, timestamp, json, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const submissionTypeEnum = pgEnum('submission_type', ['new', 'update']);
export const submissionStatusEnum = pgEnum('submission_status', ['pending', 'approved', 'rejected']);
export const photoCategoryEnum = pgEnum('photo_category', ['interior', 'exterior', 'food', 'menu', 'storefront', 'logo', 'other']);
export const photoStatusEnum = pgEnum('photo_status', ['pending', 'processing', 'completed', 'failed']);
export const notificationTypeEnum = pgEnum('notification_type', ['opening_hours', 'special_offers', 'nearby_shops', 'review_responses', 'weekly_digest']);
export const notificationStatusEnum = pgEnum('notification_status', ['pending', 'sent', 'delivered', 'failed', 'clicked']);

// Users table (enhanced for full authentication)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(), // bcrypt hashed
  name: text("name").notNull(),
  isEmailVerified: boolean("is_email_verified").default(false),
  avatarUrl: text("avatar_url"),
  preferences: json("preferences").default(sql`'{}'::json`), // User settings
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User sessions table (for express-session)
export const userSessions = pgTable("user_sessions", {
  sid: varchar("sid").primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

// User favorites table (many-to-many relationship)
export const userFavorites = pgTable("user_favorites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  shopId: varchar("shop_id").notNull().references(() => shops.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Cities table
export const cities = pgTable("cities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  lat: decimal("lat", { precision: 10, scale: 7 }).notNull(),
  lng: decimal("lng", { precision: 10, scale: 7 }).notNull(),
  bbox: json("bbox"),
});

// Shops table
export const shops = pgTable("shops", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  lat: decimal("lat", { precision: 10, scale: 7 }).notNull(),
  lng: decimal("lng", { precision: 10, scale: 7 }).notNull(),
  street: text("street").notNull(),
  city: text("city").notNull(),
  zip: text("zip"),
  phone: text("phone"),
  website: text("website"),
  priceLevel: integer("price_level"), // 1-4
  halal: boolean("halal").default(false),
  veg: boolean("veg").default(false),
  meatType: text("meat_type"),
  isPublished: boolean("is_published").default(true),
  // Special offers
  hasOffers: boolean("has_offers").default(false),
  offers: text("offers").array(),
  // Delivery service
  hasDelivery: boolean("has_delivery").default(false),
  deliveryFee: decimal("delivery_fee", { precision: 5, scale: 2 }),
  minDeliveryOrder: decimal("min_delivery_order", { precision: 5, scale: 2 }),
  deliveryRadius: integer("delivery_radius"), // in kilometers
  // Google Places integration fields
  googlePlaceId: text("google_place_id").unique(),
  dataSource: text("data_source").default("manual"), // 'manual', 'google', 'hybrid'
  lastGoogleSync: timestamp("last_google_sync"),
  googleRating: decimal("google_rating", { precision: 3, scale: 2 }),
  googleReviewCount: integer("google_review_count"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Opening hours table
export const openingHours = pgTable("opening_hours", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shopId: varchar("shop_id").notNull().references(() => shops.id, { onDelete: 'cascade' }),
  weekday: integer("weekday").notNull(), // 0=Sunday, 1=Monday, etc.
  openTime: text("open_time"), // HH:MM format
  closeTime: text("close_time"), // HH:MM format
  note: text("note"),
});

// Reviews table (supports both authenticated and anonymous users)
export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shopId: varchar("shop_id").notNull().references(() => shops.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }), // Null for anonymous
  rating: integer("rating").notNull(), // 1-5
  text: text("text").notNull(),
  userHash: text("user_hash"), // For anonymous users (SHA256 of IP + user agent)
  authorName: text("author_name"), // Display name (from user or anonymous)
  isAnonymous: boolean("is_anonymous").default(true),
  isEdited: boolean("is_edited").default(false),
  editedAt: timestamp("edited_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Photos table
export const photos = pgTable("photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shopId: varchar("shop_id").notNull().references(() => shops.id, { onDelete: 'cascade' }),
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  source: text("source").default("manual"), // 'manual', 'google', 'imported'
  category: photoCategoryEnum("category").default('other'),
  status: photoStatusEnum("status").default('completed'),
  isPrimary: boolean("is_primary").default(false),
  sortOrder: integer("sort_order").default(0),
  // File metadata
  filename: text("filename"),
  originalFilename: text("original_filename"),
  mimeType: text("mime_type"),
  fileSize: integer("file_size"), // bytes
  width: integer("width"),
  height: integer("height"),
  // Google Places integration
  googlePhotoReference: text("google_photo_reference"),
  // Metadata and accessibility
  altText: text("alt_text"),
  tags: text("tags").array(), // Array of tags
  description: text("description"),
  uploadedBy: text("uploaded_by"), // For tracking admin who uploaded
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Submissions table
export const submissions = pgTable("submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: submissionTypeEnum("type").notNull(),
  payload: json("payload").notNull(),
  status: submissionStatusEnum("status").default('pending'),
  createdAt: timestamp("created_at").defaultNow(),
});

// Push subscriptions table
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  endpoint: text("endpoint").notNull().unique(),
  p256dhKey: text("p256dh_key").notNull(),
  authKey: text("auth_key").notNull(),
  userAgent: text("user_agent"),
  isActive: boolean("is_active").default(true),
  lastUsed: timestamp("last_used").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notification preferences table
export const notificationPreferences = pgTable("notification_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: notificationTypeEnum("type").notNull(),
  enabled: boolean("enabled").default(true),
  settings: json("settings").default(sql`'{}'::json`), // frequency, quietHours, etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notification history table
export const notificationHistory = pgTable("notification_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  subscriptionId: varchar("subscription_id").references(() => pushSubscriptions.id, { onDelete: 'set null' }),
  type: notificationTypeEnum("type").notNull(),
  status: notificationStatusEnum("status").default('pending'),
  title: text("title").notNull(),
  body: text("body").notNull(),
  icon: text("icon"),
  badge: text("badge"),
  data: json("data").default(sql`'{}'::json`), // Additional payload data
  shopId: varchar("shop_id").references(() => shops.id, { onDelete: 'set null' }), // For shop-specific notifications
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  clickedAt: timestamp("clicked_at"),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  reviews: many(reviews),
  favorites: many(userFavorites),
  pushSubscriptions: many(pushSubscriptions),
  notificationPreferences: many(notificationPreferences),
  notificationHistory: many(notificationHistory),
}));

export const userFavoritesRelations = relations(userFavorites, ({ one }) => ({
  user: one(users, {
    fields: [userFavorites.userId],
    references: [users.id],
  }),
  shop: one(shops, {
    fields: [userFavorites.shopId],
    references: [shops.id],
  }),
}));

export const shopsRelations = relations(shops, ({ many }) => ({
  openingHours: many(openingHours),
  reviews: many(reviews),
  photos: many(photos),
  favorites: many(userFavorites),
}));

export const openingHoursRelations = relations(openingHours, ({ one }) => ({
  shop: one(shops, {
    fields: [openingHours.shopId],
    references: [shops.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  shop: one(shops, {
    fields: [reviews.shopId],
    references: [shops.id],
  }),
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
}));

export const photosRelations = relations(photos, ({ one }) => ({
  shop: one(shops, {
    fields: [photos.shopId],
    references: [shops.id],
  }),
}));

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one, many }) => ({
  user: one(users, {
    fields: [pushSubscriptions.userId],
    references: [users.id],
  }),
  notificationHistory: many(notificationHistory),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [notificationPreferences.userId],
    references: [users.id],
  }),
}));

export const notificationHistoryRelations = relations(notificationHistory, ({ one }) => ({
  user: one(users, {
    fields: [notificationHistory.userId],
    references: [users.id],
  }),
  subscription: one(pushSubscriptions, {
    fields: [notificationHistory.subscriptionId],
    references: [pushSubscriptions.id],
  }),
  shop: one(shops, {
    fields: [notificationHistory.shopId],
    references: [shops.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isEmailVerified: true,
  lastLoginAt: true,
}).extend({
  email: z.string().email('Bitte gib eine gültige E-Mail-Adresse ein'),
  password: z.string().min(8, 'Das Passwort muss mindestens 8 Zeichen lang sein'),
  name: z.string().min(2, 'Der Name muss mindestens 2 Zeichen lang sein').max(100),
});

export const loginUserSchema = z.object({
  email: z.string().email('Bitte gib eine gültige E-Mail-Adresse ein'),
  password: z.string().min(1, 'Bitte gib dein Passwort ein'),
});

export const updateUserProfileSchema = createInsertSchema(users).pick({
  name: true,
  avatarUrl: true,
  preferences: true,
}).extend({
  name: z.string().min(2, 'Der Name muss mindestens 2 Zeichen lang sein').max(100),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  preferences: z.record(z.any()).optional(),
});

export const insertUserFavoriteSchema = createInsertSchema(userFavorites).omit({
  id: true,
  createdAt: true,
});

export const insertCitySchema = createInsertSchema(cities).omit({
  id: true,
});

export const insertShopSchema = createInsertSchema(shops).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOpeningHoursSchema = createInsertSchema(openingHours).omit({
  id: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  userHash: true,
  userId: true,
  authorName: true,
  isAnonymous: true,
  isEdited: true,
  editedAt: true,
}).extend({
  rating: z.number().min(1).max(5),
  text: z.string().max(2000, 'Die Bewertung darf maximal 2000 Zeichen lang sein'),
});

export const updateReviewSchema = z.object({
  rating: z.number().min(1).max(5).optional(),
  text: z.string().max(2000, 'Die Bewertung darf maximal 2000 Zeichen lang sein').optional(),
});

export const insertPhotoSchema = createInsertSchema(photos).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  tags: z.array(z.string()).optional(),
  altText: z.string().max(255).optional(),
  description: z.string().max(1000).optional(),
  fileSize: z.number().positive().optional(),
  category: z.enum(['interior', 'exterior', 'food', 'menu', 'storefront', 'logo', 'other']).optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
});

export const insertSubmissionSchema = createInsertSchema(submissions).omit({
  id: true,
  createdAt: true,
  status: true,
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastUsed: true,
}).extend({
  endpoint: z.string().url('Ungültiger Push-Endpoint'),
  p256dhKey: z.string().min(1, 'P256DH-Schlüssel ist erforderlich'),
  authKey: z.string().min(1, 'Auth-Schlüssel ist erforderlich'),
  userAgent: z.string().optional(),
});

export const insertNotificationPreferenceSchema = createInsertSchema(notificationPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  type: z.enum(['opening_hours', 'special_offers', 'nearby_shops', 'review_responses', 'weekly_digest']),
  enabled: z.boolean().default(true),
  settings: z.record(z.any()).optional(),
});

export const insertNotificationHistorySchema = createInsertSchema(notificationHistory).omit({
  id: true,
  createdAt: true,
  sentAt: true,
  deliveredAt: true,
  clickedAt: true,
}).extend({
  type: z.enum(['opening_hours', 'special_offers', 'nearby_shops', 'review_responses', 'weekly_digest']),
  title: z.string().min(1, 'Titel ist erforderlich').max(255),
  body: z.string().min(1, 'Nachrichtentext ist erforderlich').max(1000),
  icon: z.string().url().optional(),
  badge: z.string().url().optional(),
  data: z.record(z.any()).optional(),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;
export type UserSession = typeof userSessions.$inferSelect;
export type UserFavorite = typeof userFavorites.$inferSelect;
export type InsertUserFavorite = z.infer<typeof insertUserFavoriteSchema>;
export type UpdateReview = z.infer<typeof updateReviewSchema>;
export type City = typeof cities.$inferSelect;
export type InsertCity = z.infer<typeof insertCitySchema>;
export type Shop = typeof shops.$inferSelect;
export type InsertShop = z.infer<typeof insertShopSchema>;
export type OpeningHours = typeof openingHours.$inferSelect;
export type InsertOpeningHours = z.infer<typeof insertOpeningHoursSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Photo = typeof photos.$inferSelect;
export type InsertPhoto = z.infer<typeof insertPhotoSchema>;
export type Submission = typeof submissions.$inferSelect;
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = z.infer<typeof insertNotificationPreferenceSchema>;
export type NotificationHistory = typeof notificationHistory.$inferSelect;
export type InsertNotificationHistory = z.infer<typeof insertNotificationHistorySchema>;

// Extended types for API responses
export type ShopWithDetails = Shop & {
  openingHours: OpeningHours[];
  reviews: Review[];
  photos: Photo[];
  avgRating: number;
  reviewCount: number;
  isFavorited?: boolean; // For authenticated users
};

export type UserWithProfile = User & {
  favoriteCount: number;
  reviewCount: number;
};

export type ReviewWithUser = Review & {
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
};

export type FavoriteWithShop = UserFavorite & {
  shop: ShopWithDetails;
};
