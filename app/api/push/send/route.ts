import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import webpush from 'web-push';

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  'mailto:admin@qwikker.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa40HI80NM9f8HnVJyWAcJEXAiR3RSI4HXH6MuCxSGHWh1NQ6E8sUPUGfXm0_Y',
  process.env.VAPID_PRIVATE_KEY || 'VCPpNOnVHjtOYiM7DGNKoA6ckTBJHHQBFSxjFSbTnps'
);

export async function POST(request: NextRequest) {
  try {
    const { userId, userIds, payload } = await request.json();

    if (!payload || (!userId && !userIds)) {
      return NextResponse.json(
        { error: 'Missing userId/userIds or payload' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get push subscriptions for the user(s)
    let query = supabase.from('push_subscriptions').select('*');
    
    if (userId) {
      query = query.eq('user_id', userId);
    } else if (userIds && Array.isArray(userIds)) {
      query = query.in('user_id', userIds);
    }

    const { data: subscriptions, error } = await query;

    if (error) {
      console.error('❌ Failed to fetch push subscriptions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('⚠️ No push subscriptions found for user(s)');
      return NextResponse.json(
        { message: 'No subscriptions found', sent: 0 },
        { status: 200 }
      );
    }

    // Send notifications to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (subscription) => {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh_key,
            auth: subscription.auth_key
          }
        };

        try {
          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify(payload)
          );
          console.log('✅ Push notification sent to:', subscription.user_id);
          return { success: true, userId: subscription.user_id };
        } catch (error) {
          console.error('❌ Failed to send push notification to:', subscription.user_id, error);
          
          // If subscription is invalid, remove it from database
          if (error instanceof Error && (error.message.includes('410') || error.message.includes('invalid'))) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('user_id', subscription.user_id);
            console.log('🗑️ Removed invalid subscription for user:', subscription.user_id);
          }
          
          return { success: false, userId: subscription.user_id, error: error.message };
        }
      })
    );

    const successful = results.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length;

    const failed = results.length - successful;

    console.log(`📊 Push notification results: ${successful} sent, ${failed} failed`);

    return NextResponse.json({
      success: true,
      sent: successful,
      failed: failed,
      total: results.length
    });

  } catch (error) {
    console.error('❌ Push notification API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
