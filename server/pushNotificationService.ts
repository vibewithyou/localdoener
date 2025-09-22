import webpush from 'web-push';
import { storage } from './storage';
import type { 
  PushSubscription, 
  NotificationPreference, 
  Shop, 
  ShopWithDetails 
} from '@shared/schema';

// VAPID configuration
const VAPID_KEYS = {
  publicKey: process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa40HvinOjUjqino1jJLLPJ-POGpfRdGR5fGUhD8Q9hgWOdCNa4A3vE8Gj5ByE',
  privateKey: process.env.VAPID_PRIVATE_KEY || 'YOUR_PRIVATE_KEY_HERE_GENERATE_WITH_WEB_PUSH_CLI',
  subject: process.env.VAPID_SUBJECT || 'mailto:support@localdoener.com'
};

// Configure web-push
webpush.setVapidDetails(
  VAPID_KEYS.subject,
  VAPID_KEYS.publicKey,
  VAPID_KEYS.privateKey
);

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  type: 'opening_hours' | 'special_offers' | 'nearby_shops' | 'review_responses' | 'weekly_digest';
  data?: Record<string, any>;
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export interface SendNotificationOptions {
  userId?: string;
  subscriptionId?: string;
  subscriptions?: PushSubscription[];
  payload: NotificationPayload;
  priority?: 'normal' | 'high';
  timeToLive?: number; // in seconds
}

export class PushNotificationService {
  
  // Get VAPID public key for frontend registration
  static getVapidPublicKey(): string {
    return VAPID_KEYS.publicKey;
  }

  // Send notification to a specific user
  async sendToUser(userId: string, payload: NotificationPayload): Promise<{
    success: boolean;
    results: Array<{ success: boolean; error?: string; notificationId?: string }>;
  }> {
    try {
      const subscription = await storage.getPushSubscriptionByUserId(userId);
      if (!subscription || !subscription.isActive) {
        console.log(`[PushService] No active subscription found for user ${userId}`);
        return { success: false, results: [] };
      }

      // Check user preferences
      const preferences = await storage.getNotificationPreferences(userId);
      const preference = preferences.find(p => p.type === payload.type);
      
      if (preference && !preference.enabled) {
        console.log(`[PushService] Notifications disabled for type ${payload.type} for user ${userId}`);
        return { success: false, results: [] };
      }

      // Apply quiet hours if configured
      if (preference?.settings && this.isQuietHours(preference.settings)) {
        console.log(`[PushService] Skipping notification due to quiet hours for user ${userId}`);
        return { success: false, results: [] };
      }

      const results = await this.sendToSubscriptions([subscription], payload);
      
      return {
        success: results.some(r => r.success),
        results
      };
    } catch (error) {
      console.error('[PushService] Error sending to user:', error);
      return { success: false, results: [] };
    }
  }

  // Send notification to multiple users
  async sendToUsers(userIds: string[], payload: NotificationPayload): Promise<{
    success: boolean;
    results: Array<{ userId: string; success: boolean; error?: string; notificationId?: string }>;
  }> {
    const results = await Promise.all(
      userIds.map(async (userId) => {
        const result = await this.sendToUser(userId, payload);
        return {
          userId,
          success: result.success,
          error: result.results[0]?.error,
          notificationId: result.results[0]?.notificationId
        };
      })
    );

    return {
      success: results.some(r => r.success),
      results
    };
  }

  // Send notification to specific subscriptions
  async sendToSubscriptions(subscriptions: PushSubscription[], payload: NotificationPayload): Promise<Array<{
    success: boolean;
    error?: string;
    notificationId?: string;
    subscriptionId: string;
  }>> {
    const results = await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          // Create notification history entry
          const notificationHistory = await storage.createNotificationHistory({
            userId: subscription.userId,
            subscriptionId: subscription.id,
            type: payload.type,
            title: payload.title,
            body: payload.body,
            icon: payload.icon,
            badge: payload.badge,
            data: payload.data || {},
            shopId: payload.data?.shopId,
          });

          // Prepare push payload
          const pushPayload = JSON.stringify({
            ...payload,
            notificationId: notificationHistory.id,
            timestamp: Date.now(),
          });

          // Prepare push options
          const pushOptions = {
            TTL: 24 * 60 * 60, // 24 hours
            urgency: payload.type === 'opening_hours' ? 'high' : 'normal',
            topic: payload.tag || `${payload.type}-${Date.now()}`,
          };

          // Send push notification
          const pushSubscriptionObject = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dhKey,
              auth: subscription.authKey,
            },
          };

          await webpush.sendNotification(
            pushSubscriptionObject,
            pushPayload,
            pushOptions
          );

          // Update notification status to sent
          await storage.updateNotificationStatus(notificationHistory.id, 'sent');

          // Update subscription last used
          await storage.updatePushSubscription(subscription.id, {
            lastUsed: new Date(),
          });

          console.log(`[PushService] Notification sent successfully to subscription ${subscription.id}`);
          
          return {
            success: true,
            notificationId: notificationHistory.id,
            subscriptionId: subscription.id,
          };

        } catch (error: any) {
          console.error(`[PushService] Failed to send to subscription ${subscription.id}:`, error);

          // Handle specific errors
          if (error.statusCode === 410 || error.statusCode === 404) {
            // Subscription is no longer valid
            console.log(`[PushService] Deactivating invalid subscription ${subscription.id}`);
            await storage.updatePushSubscription(subscription.id, { isActive: false });
          }

          return {
            success: false,
            error: error.message || 'Failed to send notification',
            subscriptionId: subscription.id,
          };
        }
      })
    );

    return results;
  }

  // Send opening hours notifications
  async sendOpeningHoursNotification(shop: ShopWithDetails, type: 'opening_soon' | 'closing_soon'): Promise<void> {
    try {
      // Get users who have this shop as favorite and have opening hours notifications enabled
      const favoriteUsers = await this.getUsersWithShopFavorited(shop.id);
      
      if (favoriteUsers.length === 0) {
        console.log(`[PushService] No users have shop ${shop.name} favorited`);
        return;
      }

      const payload: NotificationPayload = {
        title: type === 'opening_soon' ? '🕐 Öffnet bald!' : '⏰ Schließt bald!',
        body: type === 'opening_soon' 
          ? `${shop.name} öffnet in 30 Minuten`
          : `${shop.name} schließt in 30 Minuten`,
        icon: '/icons/clock.png',
        badge: '/icons/clock-badge.png',
        type: 'opening_hours',
        tag: `opening-hours-${shop.id}-${type}`,
        data: {
          shopId: shop.id,
          shopSlug: shop.slug,
          shopName: shop.name,
          type: type,
        },
        requireInteraction: false,
        vibrate: [200, 100, 200],
        actions: [
          {
            action: 'view_shop',
            title: 'Shop anzeigen',
            icon: '/icons/view.png'
          },
          {
            action: 'dismiss',
            title: 'Verwerfen',
            icon: '/icons/close.png'
          }
        ]
      };

      const result = await this.sendToUsers(favoriteUsers, payload);
      console.log(`[PushService] Opening hours notification sent to ${result.results.filter(r => r.success).length}/${favoriteUsers.length} users for shop ${shop.name}`);

    } catch (error) {
      console.error('[PushService] Error sending opening hours notification:', error);
    }
  }

  // Send special offers notification
  async sendSpecialOffersNotification(shop: ShopWithDetails, offers: string[]): Promise<void> {
    try {
      const favoriteUsers = await this.getUsersWithShopFavorited(shop.id);
      
      if (favoriteUsers.length === 0) {
        console.log(`[PushService] No users have shop ${shop.name} favorited`);
        return;
      }

      const payload: NotificationPayload = {
        title: '🎉 Neue Angebote!',
        body: `${shop.name} hat neue Angebote: ${offers.slice(0, 2).join(', ')}${offers.length > 2 ? '...' : ''}`,
        icon: '/icons/offer.png',
        badge: '/icons/offer-badge.png',
        type: 'special_offers',
        tag: `special-offers-${shop.id}-${Date.now()}`,
        data: {
          shopId: shop.id,
          shopSlug: shop.slug,
          shopName: shop.name,
          offers: offers,
        },
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200],
        actions: [
          {
            action: 'view_offers',
            title: 'Angebote ansehen',
            icon: '/icons/offers.png'
          },
          {
            action: 'view_shop',
            title: 'Shop anzeigen',
            icon: '/icons/view.png'
          }
        ]
      };

      const result = await this.sendToUsers(favoriteUsers, payload);
      console.log(`[PushService] Special offers notification sent to ${result.results.filter(r => r.success).length}/${favoriteUsers.length} users for shop ${shop.name}`);

    } catch (error) {
      console.error('[PushService] Error sending special offers notification:', error);
    }
  }

  // Send nearby shops notification
  async sendNearbyShopsNotification(userId: string, shops: ShopWithDetails[], userLocation: { lat: number; lng: number }): Promise<void> {
    try {
      if (shops.length === 0) {
        return;
      }

      const payload: NotificationPayload = {
        title: '📍 Döner in der Nähe!',
        body: `${shops.length} Döner-Shops in Ihrer Nähe: ${shops.slice(0, 2).map(s => s.name).join(', ')}${shops.length > 2 ? '...' : ''}`,
        icon: '/icons/location.png',
        badge: '/icons/location-badge.png',
        type: 'nearby_shops',
        tag: `nearby-shops-${userId}-${Date.now()}`,
        data: {
          shops: shops.map(s => ({ id: s.id, name: s.name, slug: s.slug })),
          userLocation: userLocation,
        },
        requireInteraction: false,
        actions: [
          {
            action: 'view_all_favorites',
            title: 'Favoriten anzeigen',
            icon: '/icons/favorites.png'
          },
          {
            action: 'dismiss',
            title: 'Verwerfen',
            icon: '/icons/close.png'
          }
        ]
      };

      const result = await this.sendToUser(userId, payload);
      console.log(`[PushService] Nearby shops notification ${result.success ? 'sent' : 'failed'} for user ${userId}`);

    } catch (error) {
      console.error('[PushService] Error sending nearby shops notification:', error);
    }
  }

  // Send weekly digest notification
  async sendWeeklyDigestNotification(userId: string): Promise<void> {
    try {
      // Get user's favorite shops and recent activity
      const favorites = await storage.getUserFavorites(userId, 0, 10);
      const recentReviews = await storage.getReviewsByUserId(userId, 0, 5);

      if (favorites.length === 0) {
        console.log(`[PushService] User ${userId} has no favorites for weekly digest`);
        return;
      }

      const payload: NotificationPayload = {
        title: '📊 Wöchentliche Zusammenfassung',
        body: `Sie haben ${favorites.length} Favoriten und ${recentReviews.length} Bewertungen diese Woche`,
        icon: '/icons/digest.png',
        badge: '/icons/digest-badge.png',
        type: 'weekly_digest',
        tag: `weekly-digest-${userId}`,
        data: {
          favoriteCount: favorites.length,
          reviewCount: recentReviews.length,
        },
        requireInteraction: false,
        actions: [
          {
            action: 'view_all_favorites',
            title: 'Favoriten anzeigen',
            icon: '/icons/favorites.png'
          }
        ]
      };

      const result = await this.sendToUser(userId, payload);
      console.log(`[PushService] Weekly digest notification ${result.success ? 'sent' : 'failed'} for user ${userId}`);

    } catch (error) {
      console.error('[PushService] Error sending weekly digest notification:', error);
    }
  }

  // Helper method to check quiet hours
  private isQuietHours(settings: any): boolean {
    if (!settings.quietHours) {
      return false;
    }

    const now = new Date();
    const currentHour = now.getHours();
    const startHour = settings.quietHours.start || 22;
    const endHour = settings.quietHours.end || 8;

    if (startHour < endHour) {
      return currentHour >= startHour && currentHour < endHour;
    } else {
      return currentHour >= startHour || currentHour < endHour;
    }
  }

  // Helper method to get users who have favorited a specific shop
  private async getUsersWithShopFavorited(shopId: string): Promise<string[]> {
    try {
      // This would need to be implemented in storage
      // For now, we'll use a simple query approach
      const favorites = await storage.getUserFavorites('', 0, 1000); // Get all favorites (needs improvement)
      
      // Filter for the specific shop and extract user IDs
      const userIds = favorites
        .filter(fav => fav.shop.id === shopId)
        .map(fav => fav.userId);

      return [...new Set(userIds)]; // Remove duplicates
    } catch (error) {
      console.error('[PushService] Error getting users with shop favorited:', error);
      return [];
    }
  }

  // Cleanup inactive subscriptions
  async cleanupInactiveSubscriptions(): Promise<void> {
    try {
      const allSubscriptions = await storage.getActivePushSubscriptions();
      const testPayload = JSON.stringify({
        title: 'Test',
        body: 'Test',
        tag: 'test-cleanup'
      });

      for (const subscription of allSubscriptions) {
        try {
          const pushSubscriptionObject = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dhKey,
              auth: subscription.authKey,
            },
          };

          await webpush.sendNotification(pushSubscriptionObject, testPayload, { TTL: 1 });
        } catch (error: any) {
          if (error.statusCode === 410 || error.statusCode === 404) {
            console.log(`[PushService] Deactivating inactive subscription ${subscription.id}`);
            await storage.updatePushSubscription(subscription.id, { isActive: false });
          }
        }
      }

      console.log('[PushService] Cleanup of inactive subscriptions completed');
    } catch (error) {
      console.error('[PushService] Error during subscription cleanup:', error);
    }
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService();