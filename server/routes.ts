import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertReviewSchema, 
  insertSubmissionSchema, 
  insertPhotoSchema,
  insertUserSchema,
  loginUserSchema,
  updateUserProfileSchema
} from "@shared/schema";
import { db } from "./db";
import { createHash } from "crypto";
import rateLimit from "express-rate-limit";
import { createGooglePlacesClient, GooglePlacesClient } from "./googlePlaces";
import { photoService, upload } from "./photoService";
import path from "path";
import express from "express";
import {
  hashPassword,
  comparePassword,
  requireAuth,
  optionalAuth,
  requireAdmin,
  getCurrentUser,
  setSessionUser,
  clearSessionUser,
  createUserHash
} from "./auth";

// Rate limiters
const reviewLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: "Zu viele Bewertungen. Versuche es in einer Minute erneut." }
});

const submissionLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3,
  message: { error: "Zu viele Meldungen. Versuche es in 5 Minuten erneut." }
});

const photoUploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // Allow 20 photo uploads per minute
  message: { error: "Zu viele Foto-Uploads. Versuche es in einer Minute erneut." }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: { error: "Zu viele Anmeldeversuche. Versuche es in 15 Minuten erneut." }
});

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 registration attempts per hour
  message: { error: "Zu viele Registrierungsversuche. Versuche es in einer Stunde erneut." }
});

// Helper functions (createUserHash moved to auth.ts)

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[äöüß]/g, match => ({ 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' }[match] || match))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Admin auth middleware (moved to auth.ts, keeping here for backwards compatibility)
function requireAdminCompat(req: Request, res: Response, next: Function) {
  return requireAdmin(req, res, next);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Enable trust proxy for rate limiting
  app.set('trust proxy', 1);

  // Authentication API Routes
  app.post('/api/auth/register', registrationLimiter, async (req: Request, res: Response) => {
    try {
      const validation = insertUserSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Ungültige Registrierungsdaten',
          details: validation.error.errors
        });
      }

      const { email, password, name } = validation.data;

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          error: 'Ein Benutzer mit dieser E-Mail-Adresse existiert bereits'
        });
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        name,
      });

      // Set session
      setSessionUser(req, {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl || undefined,
      });

      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registrierung fehlgeschlagen' });
    }
  });

  app.post('/api/auth/login', authLimiter, async (req: Request, res: Response) => {
    try {
      const validation = loginUserSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Ungültige Anmeldedaten',
          details: validation.error.errors
        });
      }

      const { email, password } = validation.data;

      // Find user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({
          error: 'E-Mail oder Passwort ist falsch'
        });
      }

      // Verify password
      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          error: 'E-Mail oder Passwort ist falsch'
        });
      }

      // Update last login
      await storage.updateUserLastLogin(user.id);

      // Set session
      setSessionUser(req, {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl || undefined,
      });

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Anmeldung fehlgeschlagen' });
    }
  });

  app.post('/api/auth/logout', async (req: Request, res: Response) => {
    try {
      await clearSessionUser(req);
      res.json({ message: 'Erfolgreich abgemeldet' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Abmeldung fehlgeschlagen' });
    }
  });

  app.get('/api/auth/me', async (req: Request, res: Response) => {
    try {
      const currentUser = getCurrentUser(req);
      if (!currentUser) {
        return res.status(401).json({ error: 'Nicht angemeldet' });
      }

      // Get updated user data with profile info
      const userWithProfile = await storage.getUserWithProfile(currentUser.id);
      if (!userWithProfile) {
        return res.status(404).json({ error: 'Benutzer nicht gefunden' });
      }

      res.json({
        user: {
          id: userWithProfile.id,
          email: userWithProfile.email,
          name: userWithProfile.name,
          avatarUrl: userWithProfile.avatarUrl,
          favoriteCount: userWithProfile.favoriteCount,
          reviewCount: userWithProfile.reviewCount,
        }
      });
    } catch (error) {
      console.error('Session validation error:', error);
      res.status(500).json({ error: 'Sitzungsvalidierung fehlgeschlagen' });
    }
  });

  app.put('/api/auth/profile', requireAuth, async (req: Request, res: Response) => {
    try {
      const currentUser = getCurrentUser(req)!;
      const validation = updateUserProfileSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          error: 'Ungültige Profildaten',
          details: validation.error.errors
        });
      }

      const updatedUser = await storage.updateUser(currentUser.id, validation.data);

      // Update session
      setSessionUser(req, {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        avatarUrl: updatedUser.avatarUrl || undefined,
      });

      res.json({
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          avatarUrl: updatedUser.avatarUrl,
        }
      });
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({ error: 'Profil-Update fehlgeschlagen' });
    }
  });

  // User Favorites API
  app.get('/api/auth/favorites', requireAuth, async (req: Request, res: Response) => {
    try {
      const currentUser = getCurrentUser(req)!;
      const { offset = 0, limit = 20 } = req.query;
      
      const favorites = await storage.getUserFavorites(
        currentUser.id,
        parseInt(offset as string),
        parseInt(limit as string)
      );

      res.json(favorites);
    } catch (error) {
      console.error('Get favorites error:', error);
      res.status(500).json({ error: 'Favoriten konnten nicht geladen werden' });
    }
  });

  app.post('/api/auth/favorites/:shopId', requireAuth, async (req: Request, res: Response) => {
    try {
      const currentUser = getCurrentUser(req)!;
      const { shopId } = req.params;

      const favorite = await storage.addUserFavorite(currentUser.id, shopId);
      res.status(201).json(favorite);
    } catch (error) {
      console.error('Add favorite error:', error);
      res.status(500).json({ error: 'Favorit konnte nicht hinzugefügt werden' });
    }
  });

  app.delete('/api/auth/favorites/:shopId', requireAuth, async (req: Request, res: Response) => {
    try {
      const currentUser = getCurrentUser(req)!;
      const { shopId } = req.params;

      await storage.removeUserFavorite(currentUser.id, shopId);
      res.json({ message: 'Favorit erfolgreich entfernt' });
    } catch (error) {
      console.error('Remove favorite error:', error);
      res.status(500).json({ error: 'Favorit konnte nicht entfernt werden' });
    }
  });

  // User Reviews API
  app.get('/api/auth/reviews', requireAuth, async (req: Request, res: Response) => {
    try {
      const currentUser = getCurrentUser(req)!;
      const { offset = 0, limit = 10 } = req.query;
      
      const reviews = await storage.getReviewsByUserId(
        currentUser.id,
        parseInt(offset as string),
        parseInt(limit as string)
      );

      res.json(reviews);
    } catch (error) {
      console.error('Get user reviews error:', error);
      res.status(500).json({ error: 'Bewertungen konnten nicht geladen werden' });
    }
  });

  // Cities API
  app.get('/api/cities', async (req: Request, res: Response) => {
    try {
      const cities = await storage.getCities();
      res.json(cities);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch cities' });
    }
  });

  // Top shops API
  app.get('/api/top', async (req: Request, res: Response) => {
    try {
      const { city, limit = 3 } = req.query;
      const shops = await storage.getShops({
        city: city as string,
        sortBy: 'rating',
        limit: parseInt(limit as string)
      });
      res.json(shops);
    } catch (error) {
      console.error('Error in /api/top:', error);
      res.status(500).json({ error: 'Failed to fetch top shops' });
    }
  });

  // Shops API
  app.get('/api/shops', async (req: Request, res: Response) => {
    try {
      const {
        city,
        lat,
        lng,
        radius,
        open_now,
        halal,
        veg,
        has_offers,
        has_delivery,
        by: sortBy,
        limit = 50,
        offset = 0
      } = req.query;

      const filters = {
        city: city as string,
        lat: lat ? parseFloat(lat as string) : undefined,
        lng: lng ? parseFloat(lng as string) : undefined,
        radius: radius ? parseInt(radius as string) : undefined,
        openNow: open_now === 'true',
        halal: halal === 'true',
        veg: veg === 'true',
        hasOffers: has_offers === 'true',
        hasDelivery: has_delivery === 'true',
        sortBy: sortBy as 'rating' | 'price' | 'distance',
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      };

      const shops = await storage.getShops(filters);
      res.json(shops);
    } catch (error) {
      console.error('Error in /api/shops:', error);
      res.status(500).json({ error: 'Failed to fetch shops' });
    }
  });

  // Shop detail API
  app.get('/api/shops/:slug', async (req: Request, res: Response) => {
    try {
      const shop = await storage.getShopBySlug(req.params.slug);
      if (!shop) {
        return res.status(404).json({ error: 'Shop not found' });
      }
      res.json(shop);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch shop details' });
    }
  });

  // Reviews API - Enhanced with Authentication Support
  app.post('/api/reviews', reviewLimiter, optionalAuth, async (req: Request, res: Response) => {
    try {
      const validation = insertReviewSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: 'Ungültige Bewertungsdaten',
          details: validation.error.errors
        });
      }

      const currentUser = getCurrentUser(req);
      
      // Check if user is logged in and already reviewed this shop
      if (currentUser) {
        const existingReview = await storage.getUserReviewForShop(currentUser.id, validation.data.shopId);
        if (existingReview) {
          return res.status(409).json({
            error: 'Du hast diesen Laden bereits bewertet. Du kannst deine Bewertung bearbeiten.'
          });
        }
      }

      const reviewData = {
        ...validation.data,
        userId: currentUser?.id,
        userHash: currentUser ? null : createUserHash(req),
        isAnonymous: !currentUser,
        authorName: currentUser ? currentUser.name : null,
      };

      const review = await storage.createReview(reviewData);

      res.status(201).json(review);
    } catch (error) {
      console.error('Create review error:', error);
      res.status(500).json({ error: 'Bewertung konnte nicht erstellt werden' });
    }
  });

  // Update Review API (authenticated users only)
  app.put('/api/reviews/:reviewId', requireAuth, async (req: Request, res: Response) => {
    try {
      const currentUser = getCurrentUser(req)!;
      const { reviewId } = req.params;
      
      const validation = insertReviewSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Ungültige Bewertungsdaten',
          details: validation.error.errors
        });
      }

      const updatedReview = await storage.updateReview(reviewId, currentUser.id, validation.data);
      res.json(updatedReview);
    } catch (error) {
      console.error('Update review error:', error);
      if (error.message === 'Review not found or unauthorized') {
        res.status(404).json({ error: 'Bewertung nicht gefunden oder nicht berechtigt' });
      } else {
        res.status(500).json({ error: 'Bewertung konnte nicht aktualisiert werden' });
      }
    }
  });

  // Delete Review API (authenticated users only)
  app.delete('/api/reviews/:reviewId', requireAuth, async (req: Request, res: Response) => {
    try {
      const currentUser = getCurrentUser(req)!;
      const { reviewId } = req.params;

      await storage.deleteReview(reviewId, currentUser.id);
      res.json({ message: 'Bewertung erfolgreich gelöscht' });
    } catch (error) {
      console.error('Delete review error:', error);
      if (error.message === 'Review not found or unauthorized') {
        res.status(404).json({ error: 'Bewertung nicht gefunden oder nicht berechtigt' });
      } else {
        res.status(500).json({ error: 'Bewertung konnte nicht gelöscht werden' });
      }
    }
  });

  // Submissions API
  app.post('/api/submissions', submissionLimiter, async (req: Request, res: Response) => {
    try {
      const validation = insertSubmissionSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Invalid submission data',
          details: validation.error.errors
        });
      }

      const submission = await storage.createSubmission(validation.data);
      res.status(201).json(submission);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create submission' });
    }
  });

  // Admin API
  app.get('/api/admin/submissions', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { status } = req.query;
      const submissions = await storage.getSubmissions(status as any);
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch submissions' });
    }
  });

  app.patch('/api/admin/submissions/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const submission = await storage.updateSubmissionStatus(req.params.id, status);
      res.json(submission);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update submission' });
    }
  });

  app.post('/api/admin/shops', requireAdmin, async (req: Request, res: Response) => {
    try {
      const shopData = {
        ...req.body,
        slug: generateSlug(req.body.name)
      };

      const shop = await storage.createShop(shopData);
      
      // Create opening hours if provided
      if (req.body.openingHours && Array.isArray(req.body.openingHours)) {
        await storage.createOpeningHours(
          req.body.openingHours.map((hours: any) => ({
            ...hours,
            shopId: shop.id
          }))
        );
      }

      res.status(201).json(shop);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create shop' });
    }
  });

  app.put('/api/admin/shops/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      const shop = await storage.updateShop(req.params.id, req.body);
      
      // Update opening hours if provided
      if (req.body.openingHours && Array.isArray(req.body.openingHours)) {
        await storage.updateOpeningHours(
          req.params.id,
          req.body.openingHours.map((hours: any) => ({
            ...hours,
            shopId: req.params.id
          }))
        );
      }

      res.json(shop);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update shop' });
    }
  });

  app.delete('/api/admin/shops/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      await storage.deleteShop(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete shop' });
    }
  });

  // Bulk operations for shops
  app.patch('/api/admin/shops/bulk', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { ids, updates } = req.body;
      
      if (!Array.isArray(ids) || !updates) {
        return res.status(400).json({ error: 'Invalid bulk update data' });
      }

      const results = [];
      for (const id of ids) {
        try {
          const shop = await storage.updateShop(id, updates);
          results.push(shop);
        } catch (error) {
          console.error(`Failed to update shop ${id}:`, error);
        }
      }

      res.json({ updated: results.length, results });
    } catch (error) {
      res.status(500).json({ error: 'Failed to bulk update shops' });
    }
  });

  // Reviews management API
  app.get('/api/admin/reviews', requireAdmin, async (req: Request, res: Response) => {
    try {
      const allShops = await storage.getShops({});
      const allReviews = [];
      
      for (const shop of allShops) {
        const shopReviews = await storage.getReviewsByShopId(shop.id, 0, 1000);
        allReviews.push(...shopReviews);
      }
      
      // Sort by creation date (newest first)
      allReviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      res.json(allReviews);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch reviews' });
    }
  });

  app.patch('/api/admin/reviews/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { action } = req.body;
      
      // For now, we'll just acknowledge the moderation action
      // In a full implementation, this would update a review status/visibility field
      res.json({ message: `Review ${action} action processed`, reviewId: req.params.id });
    } catch (error) {
      res.status(500).json({ error: 'Failed to moderate review' });
    }
  });

  // Google Places integration APIs
  const googleClient = createGooglePlacesClient();

  app.get('/api/admin/google/search', requireAdmin, async (req: Request, res: Response) => {
    try {
      if (!googleClient) {
        return res.status(503).json({ 
          error: 'Google Places API not configured. Please set GOOGLE_PLACES_API_KEY environment variable.' 
        });
      }

      const { query, city, lat, lng, radius } = req.query;
      
      if (!query && !city && (!lat || !lng)) {
        return res.status(400).json({ 
          error: 'Query, city, or coordinates (lat, lng) are required' 
        });
      }

      const searchFilters = {
        query: query as string,
        location: city as string,
        lat: lat ? parseFloat(lat as string) : undefined,
        lng: lng ? parseFloat(lng as string) : undefined,
        radius: radius ? parseInt(radius as string) : 5000
      };

      const places = await googleClient.searchPlaces(searchFilters);
      
      // Check which places already exist in our database
      const placesWithStatus = await Promise.all(
        places.map(async (place) => {
          const existingShop = await storage.getShopByGooglePlaceId(place.place_id);
          return {
            ...place,
            isImported: !!existingShop,
            existingShopId: existingShop?.id
          };
        })
      );

      res.json(placesWithStatus);
    } catch (error) {
      console.error('Google Places search error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to search Google Places' 
      });
    }
  });

  app.get('/api/admin/google/details/:placeId', requireAdmin, async (req: Request, res: Response) => {
    try {
      if (!googleClient) {
        return res.status(503).json({ 
          error: 'Google Places API not configured' 
        });
      }

      const placeDetails = await googleClient.getPlaceDetails(req.params.placeId);
      
      // Check if already imported
      const existingShop = await storage.getShopByGooglePlaceId(req.params.placeId);
      
      res.json({
        ...placeDetails,
        isImported: !!existingShop,
        existingShopId: existingShop?.id
      });
    } catch (error) {
      console.error('Google Places details error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get place details' 
      });
    }
  });

  app.post('/api/admin/google/import', requireAdmin, async (req: Request, res: Response) => {
    try {
      if (!googleClient) {
        return res.status(503).json({ 
          error: 'Google Places API not configured' 
        });
      }

      const { placeId, options = {} } = req.body;
      
      if (!placeId) {
        return res.status(400).json({ error: 'Place ID is required' });
      }

      // Check if already imported
      const existingShop = await storage.getShopByGooglePlaceId(placeId);
      if (existingShop && !options.forceUpdate) {
        return res.status(409).json({ 
          error: 'Shop already imported',
          existingShopId: existingShop.id 
        });
      }

      // Get detailed place information
      const placeDetails = await googleClient.getPlaceDetails(placeId);
      
      // Convert Google data to our format
      const shopData = GooglePlacesClient.convertToShopData(placeDetails);
      const openingHours = GooglePlacesClient.convertOpeningHours(placeDetails.opening_hours);
      const photos = GooglePlacesClient.convertPhotos(placeDetails.photos);
      
      // Generate slug
      shopData.slug = generateSlug(shopData.name);
      
      let shop;
      if (existingShop && options.forceUpdate) {
        // Update existing shop
        shop = await storage.updateShopWithGoogleData(existingShop.id, shopData);
        
        // Update opening hours if provided
        if (openingHours.length > 0) {
          await storage.updateOpeningHours(existingShop.id, 
            openingHours.map(hours => ({ ...hours, shopId: existingShop.id }))
          );
        }
        
        // Add new photos if provided
        if (photos.length > 0) {
          await storage.createPhotosFromGoogle(existingShop.id, photos);
        }
      } else {
        // Create new shop
        shop = await storage.createShopFromGoogle(shopData, openingHours, photos);
      }

      res.status(201).json({ 
        shop,
        imported: {
          openingHours: openingHours.length,
          photos: photos.length
        }
      });
    } catch (error) {
      console.error('Google Places import error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to import from Google Places' 
      });
    }
  });

  app.get('/api/admin/google/photo/:reference', requireAdmin, async (req: Request, res: Response) => {
    try {
      if (!googleClient) {
        return res.status(503).json({ 
          error: 'Google Places API not configured' 
        });
      }

      const { reference } = req.params;
      const { maxWidth = 800 } = req.query;
      
      const photoUrl = googleClient.getPhotoUrl(reference, parseInt(maxWidth as string));
      
      // Redirect to Google's photo URL
      res.redirect(photoUrl);
    } catch (error) {
      console.error('Google photo error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get photo' 
      });
    }
  });

  app.get('/api/admin/google/nearby', requireAdmin, async (req: Request, res: Response) => {
    try {
      if (!googleClient) {
        return res.status(503).json({ 
          error: 'Google Places API not configured' 
        });
      }

      const { lat, lng, radius = 5000, keyword = 'döner kebab' } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({ 
          error: 'Latitude and longitude are required' 
        });
      }

      const places = await googleClient.searchNearby(
        parseFloat(lat as string),
        parseFloat(lng as string),
        parseInt(radius as string),
        keyword as string
      );
      
      // Check which places already exist in our database
      const placesWithStatus = await Promise.all(
        places.map(async (place) => {
          const existingShop = await storage.getShopByGooglePlaceId(place.place_id);
          return {
            ...place,
            isImported: !!existingShop,
            existingShopId: existingShop?.id
          };
        })
      );

      res.json(placesWithStatus);
    } catch (error) {
      console.error('Google Places nearby search error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to search nearby places' 
      });
    }
  });

  // Static file serving for uploads
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Photo Management API
  app.post('/api/admin/photos/upload/:shopId', requireAdmin, photoUploadLimiter, upload.array('photos', 10), async (req: Request, res: Response) => {
    try {
      const { shopId } = req.params;
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files provided' });
      }

      const metadata = {
        category: req.body.category,
        altText: req.body.altText,
        description: req.body.description,
        tags: req.body.tags ? JSON.parse(req.body.tags) : [],
        uploadedBy: req.get('X-Admin-User') || 'admin'
      };

      const uploadedPhotos = await photoService.uploadMultiplePhotos(shopId, files, metadata);
      res.status(201).json(uploadedPhotos);
    } catch (error) {
      console.error('Photo upload error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to upload photos' 
      });
    }
  });

  app.get('/api/admin/photos', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { shopId, category, limit = 50, offset = 0 } = req.query;
      
      const photos = await storage.getAllPhotos({
        shopId: shopId as string,
        category: category as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

      res.json(photos);
    } catch (error) {
      console.error('Get photos error:', error);
      res.status(500).json({ error: 'Failed to fetch photos' });
    }
  });

  app.get('/api/admin/photos/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      const photo = await storage.getPhotoById(req.params.id);
      
      if (!photo) {
        return res.status(404).json({ error: 'Photo not found' });
      }

      res.json(photo);
    } catch (error) {
      console.error('Get photo error:', error);
      res.status(500).json({ error: 'Failed to fetch photo' });
    }
  });

  app.patch('/api/admin/photos/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      const validation = insertPhotoSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: 'Invalid photo data',
          details: validation.error.errors
        });
      }

      const updatedPhoto = await storage.updatePhoto(req.params.id, validation.data);
      res.json(updatedPhoto);
    } catch (error) {
      console.error('Update photo error:', error);
      res.status(500).json({ error: 'Failed to update photo' });
    }
  });

  app.delete('/api/admin/photos/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      await photoService.deletePhoto(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Delete photo error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to delete photo' 
      });
    }
  });

  app.post('/api/admin/photos/:id/set-primary', requireAdmin, async (req: Request, res: Response) => {
    try {
      const photo = await storage.getPhotoById(req.params.id);
      if (!photo) {
        return res.status(404).json({ error: 'Photo not found' });
      }

      await photoService.setPrimaryPhoto(photo.shopId, req.params.id);
      res.json({ message: 'Primary photo set successfully' });
    } catch (error) {
      console.error('Set primary photo error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to set primary photo' 
      });
    }
  });

  app.post('/api/admin/photos/reorder/:shopId', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { photoIds } = req.body;
      
      if (!Array.isArray(photoIds)) {
        return res.status(400).json({ error: 'photoIds must be an array' });
      }

      await photoService.reorderPhotos(req.params.shopId, photoIds);
      res.json({ message: 'Photos reordered successfully' });
    } catch (error) {
      console.error('Reorder photos error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to reorder photos' 
      });
    }
  });

  app.post('/api/admin/photos/bulk-update', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { photoIds, updates } = req.body;
      
      if (!Array.isArray(photoIds) || !updates) {
        return res.status(400).json({ error: 'photoIds array and updates object are required' });
      }

      const validation = insertPhotoSchema.partial().safeParse(updates);
      if (!validation.success) {
        return res.status(400).json({ 
          error: 'Invalid update data',
          details: validation.error.errors
        });
      }

      const updatePromises = photoIds.map(id => storage.updatePhoto(id, validation.data));
      await Promise.all(updatePromises);

      res.json({ message: `${photoIds.length} photos updated successfully` });
    } catch (error) {
      console.error('Bulk update photos error:', error);
      res.status(500).json({ error: 'Failed to bulk update photos' });
    }
  });

  app.delete('/api/admin/photos/bulk-delete', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { photoIds } = req.body;
      
      if (!Array.isArray(photoIds)) {
        return res.status(400).json({ error: 'photoIds must be an array' });
      }

      const deletePromises = photoIds.map(id => photoService.deletePhoto(id));
      await Promise.all(deletePromises);

      res.json({ message: `${photoIds.length} photos deleted successfully` });
    } catch (error) {
      console.error('Bulk delete photos error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to bulk delete photos' 
      });
    }
  });

  // Google Photos Integration API
  app.post('/api/admin/google/photos/import/:shopId', requireAdmin, async (req: Request, res: Response) => {
    try {
      if (!googleClient) {
        return res.status(503).json({ 
          error: 'Google Places API not configured' 
        });
      }

      const { shopId } = req.params;
      const { placeId, replaceExisting = false, categoryMapping = {} } = req.body;

      if (!placeId) {
        return res.status(400).json({ error: 'placeId is required' });
      }

      // Get place details with photos
      const placeDetails = await googleClient.getPlaceDetails(placeId);
      const { photoData } = await googleClient.convertToShopDataWithPhotos(placeDetails);

      // Import photos
      const importedPhotos = await storage.importGooglePhotosForShop(shopId, photoData, {
        replaceExisting,
        categoryMapping
      });

      res.json({
        message: `${importedPhotos.length} photos imported successfully`,
        photos: importedPhotos
      });
    } catch (error) {
      console.error('Google photo import error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to import Google photos' 
      });
    }
  });

  app.post('/api/admin/google/photos/sync/:shopId', requireAdmin, async (req: Request, res: Response) => {
    try {
      if (!googleClient) {
        return res.status(503).json({ 
          error: 'Google Places API not configured' 
        });
      }

      const { shopId } = req.params;
      const { placeId } = req.body;

      if (!placeId) {
        return res.status(400).json({ error: 'placeId is required' });
      }

      // Get place details with photos
      const placeDetails = await googleClient.getPlaceDetails(placeId);
      const { photoData } = await googleClient.convertToShopDataWithPhotos(placeDetails);

      // Sync photos
      const syncResult = await storage.syncGooglePhotosForShop(shopId, photoData);

      res.json({
        message: 'Photos synced successfully',
        ...syncResult,
        summary: {
          added: syncResult.added.length,
          updated: syncResult.updated.length,
          existing: syncResult.existing.length
        }
      });
    } catch (error) {
      console.error('Google photo sync error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to sync Google photos' 
      });
    }
  });

  // Seed data endpoint for development
  if (process.env.NODE_ENV === 'development') {
    app.post('/api/seed', async (req: Request, res: Response) => {
      try {
        // Seed cities
        const citiesData = [
          { name: 'Freiberg', slug: 'freiberg', lat: '50.9167', lng: '13.3417' },
          { name: 'Brand-Erbisdorf', slug: 'brand-erbisdorf', lat: '50.8833', lng: '13.3167' },
          { name: 'Chemnitz', slug: 'chemnitz', lat: '50.8278', lng: '12.9214' },
          { name: 'Hainichen', slug: 'hainichen', lat: '50.9667', lng: '13.1333' },
          { name: 'Flöha', slug: 'floeha', lat: '50.8500', lng: '13.0833' },
          { name: 'Döbeln', slug: 'doebeln', lat: '51.1167', lng: '13.1167' },
          { name: 'Mittweida', slug: 'mittweida', lat: '50.9833', lng: '12.9833' },
          { name: 'Frankenberg', slug: 'frankenberg', lat: '50.9167', lng: '13.0333' },
        ];

        for (const city of citiesData) {
          try {
            await storage.getCityBySlug(city.slug).then(async (existing) => {
              if (!existing) {
                await db.insert(cities).values(city);
              }
            });
          } catch (err) {
            // City might already exist
          }
        }

        // Seed shops
        const shopsData = [
          {
            name: 'Döner Palace',
            slug: 'doener-palace-freiberg',
            lat: '50.9167',
            lng: '13.3417',
            street: 'Chemnitzer Straße 15',
            city: 'Freiberg',
            zip: '09599',
            phone: '+49 3731 678 9012',
            website: 'www.doener-palace.de',
            priceLevel: 2,
            halal: true,
            veg: false,
            isPublished: true
          },
          {
            name: 'Istanbul Kebab',
            slug: 'istanbul-kebab-freiberg',
            lat: '50.9157',
            lng: '13.3427',
            street: 'Hauptstraße 42',
            city: 'Freiberg',
            zip: '09599',
            phone: '+49 3731 123456',
            priceLevel: 1,
            halal: true,
            veg: true,
            isPublished: true
          },
          {
            name: 'Anatolien Grill',
            slug: 'anatolien-grill-freiberg',
            lat: '50.9177',
            lng: '13.3407',
            street: 'Freiberger Straße 8',
            city: 'Freiberg',
            zip: '09599',
            priceLevel: 3,
            halal: true,
            veg: false,
            isPublished: true
          }
        ];

        for (const shop of shopsData) {
          try {
            const newShop = await storage.createShop(shop);
            
            // Add opening hours
            const hours = [
              { shopId: newShop.id, weekday: 1, openTime: '11:00', closeTime: '22:00' },
              { shopId: newShop.id, weekday: 2, openTime: '11:00', closeTime: '22:00' },
              { shopId: newShop.id, weekday: 3, openTime: '11:00', closeTime: '22:00' },
              { shopId: newShop.id, weekday: 4, openTime: '11:00', closeTime: '22:00' },
              { shopId: newShop.id, weekday: 5, openTime: '11:00', closeTime: '23:00' },
              { shopId: newShop.id, weekday: 6, openTime: '11:00', closeTime: '23:00' },
              { shopId: newShop.id, weekday: 0, openTime: '12:00', closeTime: '22:00' }
            ];
            await storage.createOpeningHours(hours);

            // Add sample reviews
            const reviews = [
              {
                shopId: newShop.id,
                rating: 5,
                text: 'Bester Döner in Freiberg! Das Fleisch ist super zart und die Soßen sind hausgemacht. Personal ist sehr freundlich.',
                userHash: createHash('sha256').update('sample1' + newShop.id).digest('hex')
              },
              {
                shopId: newShop.id,
                rating: 4,
                text: 'Sehr leckerer Döner mit frischen Zutaten. Komme gerne wieder!',
                userHash: createHash('sha256').update('sample2' + newShop.id).digest('hex')
              }
            ];

            for (const review of reviews) {
              await storage.createReview(review);
            }
          } catch (err) {
            // Shop might already exist
          }
        }

        res.json({ message: 'Seed data created successfully' });
      } catch (error) {
        console.error('Seed error:', error);
        res.status(500).json({ error: 'Failed to seed data' });
      }
    });
  }

  const httpServer = createServer(app);
  return httpServer;
}
