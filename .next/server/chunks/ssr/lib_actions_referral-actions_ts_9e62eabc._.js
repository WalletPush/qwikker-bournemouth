module.exports = [
"[project]/lib/actions/referral-actions.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"405cf154efcc0a65b8f3104b9b0b07094cacffa8d7":"getUserReferrals","40a130ea5b5e9026d90238cc850c4ec285c029d775":"getReferralStats","604c17eed20b685aca9a48ad1ad1517b4ecc65fdbe":"updateReferralStatus","60d41e1ed61b9bd782cbf172f422d2c5c2b2051a8b":"trackReferral"},"",""] */ __turbopack_context__.s([
    "getReferralStats",
    ()=>getReferralStats,
    "getUserReferrals",
    ()=>getUserReferrals,
    "trackReferral",
    ()=>trackReferral,
    "updateReferralStatus",
    ()=>updateReferralStatus
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.3_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/admin.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$integrations$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/integrations.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.3_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/cache.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.3_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
;
;
async function trackReferral(referralCode, newUserId) {
    if (!referralCode || !newUserId) {
        return {
            success: false,
            error: 'Missing referral code or user ID'
        };
    }
    const supabaseAdmin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])();
    try {
        // Call the database function to track the referral
        const { error } = await supabaseAdmin.rpc('track_referral', {
            referral_code_param: referralCode,
            new_user_id: newUserId
        });
        if (error) {
            console.error('Error tracking referral:', error);
            return {
                success: false,
                error: error.message
            };
        }
        // Get referrer profile for notification
        const { data: referrerProfile } = await supabaseAdmin.from('business_profiles').select('*').eq('referral_code', referralCode).single();
        // Get new user profile
        const { data: newUserProfile } = await supabaseAdmin.from('business_profiles').select('*').eq('user_id', newUserId).single();
        // Send Slack notification about new referral
        if (referrerProfile && newUserProfile) {
            try {
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$integrations$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sendBusinessUpdateNotification"])(referrerProfile, 'referral_signup', {
                    referredBusinessName: newUserProfile.business_name || 'New Business',
                    referredOwnerName: `${newUserProfile.first_name || ''} ${newUserProfile.last_name || ''}`.trim() || 'New User',
                    referralCode: referralCode
                });
            } catch (error) {
                console.error('Slack notification failed (non-critical):', error);
            }
        }
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])('/dashboard');
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])('/dashboard/referrals');
        return {
            success: true
        };
    } catch (error) {
        console.error('Error in trackReferral:', error);
        return {
            success: false,
            error: 'Failed to track referral'
        };
    }
}
async function getReferralStats(userId) {
    const supabaseAdmin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])();
    try {
        // Get user's profile ID
        const { data: profile } = await supabaseAdmin.from('business_profiles').select('id').eq('user_id', userId).single();
        if (!profile) {
            return {
                success: false,
                error: 'Profile not found'
            };
        }
        // Get referral stats
        const { data: referrals, error } = await supabaseAdmin.from('referrals').select('status, reward_amount').eq('referrer_id', profile.id);
        if (error) {
            return {
                success: false,
                error: error.message
            };
        }
        const totalReferrals = referrals?.length || 0;
        const successfulReferrals = referrals?.filter((r)=>r.status === 'approved' || r.status === 'credited').length || 0;
        const totalEarnings = referrals?.filter((r)=>r.status === 'credited').reduce((sum, r)=>sum + (r.reward_amount || 0), 0) || 0;
        return {
            success: true,
            data: {
                totalReferrals,
                successfulReferrals,
                totalEarnings
            }
        };
    } catch (error) {
        console.error('Error getting referral stats:', error);
        return {
            success: false,
            error: 'Failed to get referral stats'
        };
    }
}
async function getUserReferrals(userId) {
    const supabaseAdmin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])();
    try {
        // Get user's profile ID
        const { data: profile } = await supabaseAdmin.from('business_profiles').select('id').eq('user_id', userId).single();
        if (!profile) {
            return {
                success: false,
                error: 'Profile not found'
            };
        }
        // Get referrals with referred user details
        const { data: referrals, error } = await supabaseAdmin.from('referrals').select(`
        *,
        referred:referred_id (
          business_name,
          first_name,
          last_name
        )
      `).eq('referrer_id', profile.id).order('created_at', {
            ascending: false
        });
        if (error) {
            return {
                success: false,
                error: error.message
            };
        }
        return {
            success: true,
            data: referrals
        };
    } catch (error) {
        console.error('Error getting user referrals:', error);
        return {
            success: false,
            error: 'Failed to get referrals'
        };
    }
}
async function updateReferralStatus(referralId, status) {
    const supabaseAdmin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])();
    try {
        const updateData = {
            status,
            updated_at: new Date().toISOString()
        };
        // If crediting, add credited_date
        if (status === 'credited') {
            updateData.credited_date = new Date().toISOString();
        }
        const { data, error } = await supabaseAdmin.from('referrals').update(updateData).eq('id', referralId).select(`
        *,
        referrer:referrer_id (
          business_name,
          first_name,
          last_name,
          user_id
        ),
        referred:referred_id (
          business_name,
          first_name,
          last_name
        )
      `).single();
        if (error) {
            return {
                success: false,
                error: error.message
            };
        }
        // Send notification if status changed to credited
        if (status === 'credited' && data.referrer) {
            try {
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$integrations$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sendBusinessUpdateNotification"])(data.referrer, 'referral_credited', {
                    referredBusinessName: data.referred?.business_name || 'Business',
                    rewardAmount: data.reward_amount,
                    currency: data.reward_currency
                });
            } catch (error) {
                console.error('Slack notification failed (non-critical):', error);
            }
        }
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])('/dashboard/referrals');
        return {
            success: true,
            data
        };
    } catch (error) {
        console.error('Error updating referral status:', error);
        return {
            success: false,
            error: 'Failed to update referral status'
        };
    }
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    trackReferral,
    getReferralStats,
    getUserReferrals,
    updateReferralStatus
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(trackReferral, "60d41e1ed61b9bd782cbf172f422d2c5c2b2051a8b", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getReferralStats, "40a130ea5b5e9026d90238cc850c4ec285c029d775", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getUserReferrals, "405cf154efcc0a65b8f3104b9b0b07094cacffa8d7", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(updateReferralStatus, "604c17eed20b685aca9a48ad1ad1517b4ecc65fdbe", null);
}),
];

//# sourceMappingURL=lib_actions_referral-actions_ts_9e62eabc._.js.map