/**
 * Business-specific notification functions
 * Handles sending push notifications for business events
 */

import { NotificationPayload } from '@/lib/push-notifications';

/**
 * Send notification when business is approved
 */
export async function sendBusinessApprovedNotification(
  businessOwnerId: string,
  businessName: string
): Promise<boolean> {
  const payload: NotificationPayload = {
    title: '🎉 Business Approved!',
    body: `${businessName} is now live on Qwikker! Start attracting customers today.`,
    icon: '/icon-192x192.svg',
    badge: '/icon-72x72.svg',
    url: '/dashboard',
    type: 'business_approved',
    data: {
      businessName,
      action: 'business_approved',
      timestamp: Date.now()
    }
  };

  return await sendPushNotification(businessOwnerId, payload);
}

/**
 * Send notification when new offer is created
 */
export async function sendNewOfferNotification(
  userIds: string[],
  businessName: string,
  offerTitle: string,
  offerValue: string
): Promise<boolean> {
  const payload: NotificationPayload = {
    title: `🔥 New Offer at ${businessName}!`,
    body: `${offerTitle} - ${offerValue}. Don't miss out!`,
    icon: '/icon-192x192.svg',
    badge: '/icon-72x72.svg',
    url: '/user/offers',
    type: 'new_offer',
    data: {
      businessName,
      offerTitle,
      offerValue,
      action: 'view_offer',
      timestamp: Date.now()
    }
  };

  return await sendPushNotificationToMultiple(userIds, payload);
}

/**
 * Send notification when secret menu is unlocked
 */
export async function sendSecretMenuUnlockedNotification(
  userId: string,
  businessName: string,
  secretMenuItem: string
): Promise<boolean> {
  const payload: NotificationPayload = {
    title: `🤫 Secret Menu Unlocked!`,
    body: `You've unlocked "${secretMenuItem}" at ${businessName}. Exclusive access just for you!`,
    icon: '/icon-192x192.svg',
    badge: '/icon-72x72.svg',
    url: '/user/secret-menu',
    type: 'secret_menu',
    data: {
      businessName,
      secretMenuItem,
      action: 'view_secret_menu',
      timestamp: Date.now()
    }
  };

  return await sendPushNotification(userId, payload);
}

/**
 * Send notification for profile completion reminder
 */
export async function sendProfileCompletionReminder(
  businessOwnerId: string,
  businessName: string,
  completionPercentage: number,
  missingItems: string[]
): Promise<boolean> {
  const payload: NotificationPayload = {
    title: '📋 Complete Your Profile',
    body: `${businessName} is ${completionPercentage}% complete. ${missingItems.length} items remaining.`,
    icon: '/icon-192x192.svg',
    badge: '/icon-72x72.svg',
    url: '/dashboard',
    type: 'business_approved',
    data: {
      businessName,
      completionPercentage,
      missingItems,
      action: 'complete_profile',
      timestamp: Date.now()
    }
  };

  return await sendPushNotification(businessOwnerId, payload);
}

/**
 * Send notification for time-sensitive offers
 */
export async function sendFlashOfferNotification(
  userIds: string[],
  businessName: string,
  offerTitle: string,
  timeRemaining: string
): Promise<boolean> {
  const payload: NotificationPayload = {
    title: `⚡ Flash Offer - ${timeRemaining} Left!`,
    body: `${offerTitle} at ${businessName}. Hurry, limited time!`,
    icon: '/icon-192x192.svg',
    badge: '/icon-72x72.svg',
    url: '/user/offers',
    type: 'new_offer',
    data: {
      businessName,
      offerTitle,
      timeRemaining,
      action: 'view_offer',
      urgent: true,
      timestamp: Date.now()
    }
  };

  return await sendPushNotificationToMultiple(userIds, payload);
}

/**
 * Send push notification to single user
 */
async function sendPushNotification(userId: string, payload: NotificationPayload): Promise<boolean> {
  try {
    const response = await fetch('/api/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        payload
      })
    });

    const result = await response.json();
    
    if (result.success && result.sent > 0) {
      console.log(`✅ Notification sent to user ${userId}:`, payload.title);
      return true;
    } else {
      console.log(`⚠️ No active subscriptions for user ${userId}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Failed to send notification to user ${userId}:`, error);
    return false;
  }
}

/**
 * Send push notification to multiple users
 */
async function sendPushNotificationToMultiple(userIds: string[], payload: NotificationPayload): Promise<boolean> {
  try {
    const response = await fetch('/api/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userIds,
        payload
      })
    });

    const result = await response.json();
    
    if (result.success && result.sent > 0) {
      console.log(`✅ Notification sent to ${result.sent}/${result.total} users:`, payload.title);
      return true;
    } else {
      console.log(`⚠️ No active subscriptions found for ${userIds.length} users`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Failed to send notification to ${userIds.length} users:`, error);
    return false;
  }
}

/**
 * Get all user IDs who should receive business notifications
 * (This would typically filter by location, preferences, etc.)
 */
export async function getUsersForBusinessNotifications(
  businessCity: string,
  businessType?: string
): Promise<string[]> {
  try {
    // For now, return mock user IDs
    // In production, this would query your user database
    return ['QWIK-BOURNEMOUTH-DAVID-2024']; // David's wallet pass ID
  } catch (error) {
    console.error('❌ Failed to get users for notifications:', error);
    return [];
  }
}
