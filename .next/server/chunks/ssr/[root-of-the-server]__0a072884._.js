module.exports = [
"[externals]/stream [external] (stream, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("stream", () => require("stream"));

module.exports = mod;
}),
"[externals]/http [external] (http, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("http", () => require("http"));

module.exports = mod;
}),
"[externals]/url [external] (url, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("url", () => require("url"));

module.exports = mod;
}),
"[externals]/punycode [external] (punycode, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("punycode", () => require("punycode"));

module.exports = mod;
}),
"[externals]/https [external] (https, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("https", () => require("https"));

module.exports = mod;
}),
"[externals]/zlib [external] (zlib, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("zlib", () => require("zlib"));

module.exports = mod;
}),
"[project]/lib/supabase/admin.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createAdminClient",
    ()=>createAdminClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$supabase$2b$supabase$2d$js$40$2$2e$57$2e$4$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/@supabase+supabase-js@2.57.4/node_modules/@supabase/supabase-js/dist/module/index.js [app-rsc] (ecmascript) <locals>");
;
function createAdminClient() {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations');
    }
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$supabase$2b$supabase$2d$js$40$2$2e$57$2e$4$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(("TURBOPACK compile-time value", "https://iiiciapavjonpmldytxf.supabase.co"), process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}
}),
"[project]/lib/integrations.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Integration utilities for external services
/**
 * Upload file to Cloudinary
 */ __turbopack_context__.s([
    "sendBusinessUpdateNotification",
    ()=>sendBusinessUpdateNotification,
    "sendFileUpdateToGoHighLevel",
    ()=>sendFileUpdateToGoHighLevel,
    "sendProfileUpdateSlackNotification",
    ()=>sendProfileUpdateSlackNotification,
    "sendSlackNotification",
    ()=>sendSlackNotification,
    "sendToGoHighLevel",
    ()=>sendToGoHighLevel,
    "uploadToCloudinary",
    ()=>uploadToCloudinary
]);
async function uploadToCloudinary(file, folder = "qwikker_uploads") {
    const url = `https://api.cloudinary.com/v1_1/dsh32kke7/${file.type.startsWith('image') ? 'image' : 'raw'}/upload`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'unsigned_qwikker'); // This preset must be created in Cloudinary
    formData.append('folder', folder);
    const response = await fetch(url, {
        method: 'POST',
        body: formData
    });
    if (!response.ok) {
        throw new Error(`Cloudinary upload failed: ${response.statusText}`);
    }
    const data = await response.json();
    return data.secure_url;
}
async function sendToGoHighLevel(formData) {
    const webhookUrl = "https://services.leadconnectorhq.com/hooks/IkBldqzvQG4XkoSxkCq8/webhook-trigger/582275ed-27fe-4374-808b-9f8403f820e3";
    const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
    });
    if (!response.ok) {
        throw new Error(`GoHighLevel webhook failed: ${response.statusText}`);
    }
}
async function sendFileUpdateToGoHighLevel(formData) {
    // Use a separate webhook URL for updates to avoid signup notifications
    const updateWebhookUrl = process.env.NEXT_PUBLIC_GHL_UPDATE_WEBHOOK_URL;
    if (!updateWebhookUrl) {
        console.warn('GHL update webhook not configured - file updates will not sync to GHL');
        console.warn('To enable GHL sync for file updates, set NEXT_PUBLIC_GHL_UPDATE_WEBHOOK_URL');
        return;
    }
    // Add metadata to distinguish this from new signups
    const updateData = {
        ...formData,
        isFileUpdate: true,
        updateType: 'file_upload',
        skipSignupNotification: true
    };
    const response = await fetch(updateWebhookUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(updateData)
    });
    if (!response.ok) {
        throw new Error(`GoHighLevel file update webhook failed: ${response.statusText}`);
    }
}
async function sendSlackNotification(formData) {
    // You'll need to set up a Slack webhook URL in your environment variables
    const slackWebhookUrl = ("TURBOPACK compile-time value", "https://hooks.slack.com/services/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");
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    const message = {
        text: "🎉 New QWIKKER Business Signup!",
        blocks: [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: "🎉 New Business Registration"
                }
            },
            {
                type: "section",
                fields: [
                    {
                        type: "mrkdwn",
                        text: `*Business:* ${formData.businessName || 'Not provided'}`
                    },
                    {
                        type: "mrkdwn",
                        text: `*Owner:* ${formData.firstName} ${formData.lastName}`
                    },
                    {
                        type: "mrkdwn",
                        text: `*Email:* ${formData.email}`
                    },
                    {
                        type: "mrkdwn",
                        text: `*Phone:* ${formData.phone || 'Not provided'}`
                    },
                    {
                        type: "mrkdwn",
                        text: `*Location:* ${formData.town}, ${formData.postcode}`
                    },
                    {
                        type: "mrkdwn",
                        text: `*Type:* ${formData.businessType || 'Not specified'}`
                    }
                ]
            },
            {
                type: "section",
                fields: [
                    {
                        type: "mrkdwn",
                        text: `*Logo Uploaded:* ${formData.logo_url ? '✅ Yes' : '❌ No'}`
                    },
                    {
                        type: "mrkdwn",
                        text: `*Menu Uploaded:* ${formData.menuservice_url ? '✅ Yes' : '❌ No'}`
                    },
                    {
                        type: "mrkdwn",
                        text: `*Offer Created:* ${formData.offerName ? '✅ Yes' : '❌ No'}`
                    },
                    {
                        type: "mrkdwn",
                        text: `*Referral Source:* ${formData.referralSource || 'Not specified'}`
                    }
                ]
            }
        ]
    };
    const response = await fetch(slackWebhookUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
    });
    if (!response.ok) {
        throw new Error(`Slack notification failed: ${response.statusText}`);
    }
}
async function sendBusinessUpdateNotification(profileData, updateType, details) {
    const slackWebhookUrl = ("TURBOPACK compile-time value", "https://hooks.slack.com/services/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");
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    const businessName = profileData.business_name || 'Unknown Business';
    const ownerName = `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() || 'Unknown Owner';
    let message;
    switch(updateType){
        case 'file_upload':
            message = createFileUploadMessage(businessName, ownerName, details.fileType, details.fileUrl);
            break;
        case 'secret_menu':
            message = createSecretMenuMessage(businessName, ownerName, details);
            break;
        case 'offer_created':
            message = createOfferMessage(businessName, ownerName, details);
            break;
        case 'business_info':
            message = createBusinessInfoMessage(businessName, ownerName, details);
            break;
        case 'offer_deleted':
            message = createOfferDeleteMessage(businessName, ownerName, details);
            break;
        case 'secret_menu_deleted':
            message = createSecretMenuDeleteMessage(businessName, ownerName, details);
            break;
        case 'referral_signup':
            message = createReferralSignupMessage(businessName, ownerName, details);
            break;
        case 'referral_credited':
            message = createReferralCreditedMessage(businessName, ownerName, details);
            break;
        default:
            return; // Skip unknown update types
    }
    // Add channel and thread targeting
    const payload = {
        ...message,
        channel: "#business-file-management",
        username: "QWIKKER Bot",
        icon_emoji: ":file_folder:"
    };
    const response = await fetch(slackWebhookUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        throw new Error(`Slack business update notification failed: ${response.statusText}`);
    }
}
function createFileUploadMessage(businessName, ownerName, fileType, fileUrl) {
    const actions = {
        logo: `${ownerName} (${businessName}) uploaded a new business logo`,
        menu: `${ownerName} (${businessName}) uploaded a new menu/price list`,
        offer: `${ownerName} (${businessName}) uploaded a new offer image`
    };
    const emojis = {
        logo: '🏢',
        menu: '📋',
        offer: '🎯'
    };
    return {
        text: actions[fileType],
        blocks: [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `${emojis[fileType]} ${actions[fileType]}`
                }
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `<${fileUrl}|View File> • Knowledge base may need updating`
                }
            }
        ]
    };
}
function createSecretMenuMessage(businessName, ownerName, details) {
    return {
        text: `${ownerName} (${businessName}) added a secret menu item`,
        blocks: [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `🤫 ${ownerName} (${businessName}) added a secret menu item: *${details.itemName}*`
                }
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `${details.description ? `_"${details.description}"_` : ''} • Knowledge base update recommended`
                }
            }
        ]
    };
}
function createOfferMessage(businessName, ownerName, details) {
    const formatDate = (dateStr)=>{
        if (!dateStr) return 'Not specified';
        return new Date(dateStr).toLocaleDateString('en-GB');
    };
    const claimAmountLabel = details.offerClaimAmount === 'single' ? 'Single Use' : details.offerClaimAmount === 'multiple' ? 'Multiple Use' : 'Not specified';
    const offerImage = details.offerImage ? `\n*Offer Image:* <${details.offerImage}|View Image>` : '\n*Offer Image:* Will be designed by QWIKKER team';
    return {
        text: `${ownerName} (${businessName}) created a new offer: ${details.offerName}`,
        blocks: [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `🎯 ${ownerName} (${businessName}) created a new offer: *${details.offerName}*`
                }
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*Value:* ${details.offerValue || 'Not specified'}\n*Type:* ${details.offerType || 'Not specified'}\n*Claim Amount:* ${claimAmountLabel}\n*Start Date:* ${formatDate(details.offerStartDate)}\n*End Date:* ${formatDate(details.offerEndDate)}${offerImage}`
                }
            },
            ...details.offerTerms ? [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `*Terms & Conditions:*\n${details.offerTerms}`
                    }
                }
            ] : [],
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `Knowledge base update recommended`
                }
            }
        ]
    };
}
function createBusinessInfoMessage(businessName, ownerName, details) {
    const importantFields = details.updatedFields.filter((field)=>![
            'phone',
            'email',
            'first_name',
            'last_name'
        ].includes(field));
    if (importantFields.length === 0) {
        return null // Skip routine contact updates
        ;
    }
    return {
        text: `${ownerName} (${businessName}) updated business information`,
        blocks: [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `📝 ${ownerName} (${businessName}) updated: ${importantFields.join(', ')}`
                }
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `Knowledge base may need updating`
                }
            }
        ]
    };
}
function createOfferDeleteMessage(businessName, ownerName, details) {
    return {
        text: `${ownerName} (${businessName}) deleted an offer: ${details.offerName}`,
        blocks: [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `🗑️ ${ownerName} (${businessName}) deleted offer: *${details.offerName}*`
                }
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*Previous Value:* ${details.offerValue || 'Not specified'}\n*Previous Type:* ${details.offerType || 'Not specified'}`
                }
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `Knowledge base update recommended - offer no longer available`
                }
            }
        ]
    };
}
function createSecretMenuDeleteMessage(businessName, ownerName, details) {
    return {
        text: `${ownerName} (${businessName}) removed secret menu item: ${details.itemName}`,
        blocks: [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `🗑️ ${ownerName} (${businessName}) removed secret menu item: *${details.itemName}*`
                }
            },
            ...details.description ? [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `*Previous Description:* ${details.description}`
                    }
                }
            ] : [],
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `Knowledge base update recommended - item no longer available`
                }
            }
        ]
    };
}
function createReferralSignupMessage(businessName, ownerName, details) {
    return {
        text: `${ownerName} (${businessName}) referred a new business: ${details.referredBusinessName}`,
        blocks: [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `🎉 ${ownerName} (${businessName}) referred a new business!`
                }
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*New Business:* ${details.referredBusinessName}\n*Owner:* ${details.referredOwnerName}\n*Referral Code:* ${details.referralCode}`
                }
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `Potential £10 reward pending business activation • Monitor for conversion`
                }
            }
        ]
    };
}
function createReferralCreditedMessage(businessName, ownerName, details) {
    return {
        text: `${ownerName} (${businessName}) earned referral reward for ${details.referredBusinessName}`,
        blocks: [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `💰 Referral reward credited to ${ownerName} (${businessName})`
                }
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*Referred Business:* ${details.referredBusinessName}\n*Reward Amount:* ${details.currency === 'GBP' ? '£' : '$'}${details.rewardAmount}`
                }
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `Successful referral conversion • Reward processed`
                }
            }
        ]
    };
}
async function sendProfileUpdateSlackNotification(profileData, updatedFields) {
    // Redirect to new notification system
    return sendBusinessUpdateNotification(profileData, 'business_info', {
        updatedFields
    });
}
}),
"[project]/lib/actions/business-actions.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"408d05e08a002eeb4f7db2d2da1d096d6486b03ce3":"deleteOffer","60018773fd9b11481ffb12600c6032a5613918a812":"addSecretMenuItem","60c810bc0ce80aa166c50eda23642390059c3bda5c":"deleteSecretMenuItem","60d2bd2e7a334d8c2d68641ddd02fee8fbb6bf2baf":"createOffer","60dd086945378090aa5100c49572622dd4b6e2e0f2":"updateBusinessInfo"},"",""] */ __turbopack_context__.s([
    "addSecretMenuItem",
    ()=>addSecretMenuItem,
    "createOffer",
    ()=>createOffer,
    "deleteOffer",
    ()=>deleteOffer,
    "deleteSecretMenuItem",
    ()=>deleteSecretMenuItem,
    "updateBusinessInfo",
    ()=>updateBusinessInfo
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
async function addSecretMenuItem(userId, itemData) {
    const supabaseAdmin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])();
    // Get user profile for notification context
    const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').select('*').eq('user_id', userId).single();
    if (profileError || !profile) {
        return {
            success: false,
            error: 'Profile not found'
        };
    }
    // For now, store secret menu items in additional_notes or create a separate table
    // This is a placeholder - you might want a dedicated secret_menu_items table
    const secretMenuData = {
        ...itemData,
        created_at: new Date().toISOString()
    };
    // Update profile with secret menu item (stored as JSON in additional_notes for now)
    const currentNotes = profile.additional_notes || '{}';
    let notesData;
    try {
        notesData = JSON.parse(currentNotes);
    } catch  {
        notesData = {};
    }
    if (!notesData.secret_menu_items) {
        notesData.secret_menu_items = [];
    }
    notesData.secret_menu_items.push(secretMenuData);
    const { error: updateError } = await supabaseAdmin.from('profiles').update({
        additional_notes: JSON.stringify(notesData)
    }).eq('user_id', userId);
    if (updateError) {
        return {
            success: false,
            error: updateError.message
        };
    }
    // Send Slack notification
    try {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$integrations$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sendBusinessUpdateNotification"])(profile, 'secret_menu', itemData);
    } catch (error) {
        console.error('Slack notification failed (non-critical):', error);
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])('/dashboard');
    return {
        success: true,
        data: secretMenuData
    };
}
async function createOffer(userId, offerData) {
    const supabaseAdmin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])();
    // Update profile with offer data
    const { data: profile, error } = await supabaseAdmin.from('profiles').update({
        offer_name: offerData.offerName,
        offer_type: offerData.offerType,
        offer_value: offerData.offerValue,
        offer_claim_amount: offerData.offerClaimAmount,
        offer_terms: offerData.offerTerms,
        offer_start_date: offerData.startDate,
        offer_end_date: offerData.endDate,
        offer_image: offerData.offerImage
    }).eq('user_id', userId).select().single();
    if (error) {
        return {
            success: false,
            error: error.message
        };
    }
    // Send Slack notification with all offer details
    try {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$integrations$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sendBusinessUpdateNotification"])(profile, 'offer_created', {
            offerName: offerData.offerName,
            offerType: offerData.offerType,
            offerValue: offerData.offerValue,
            offerClaimAmount: offerData.offerClaimAmount,
            offerStartDate: offerData.startDate,
            offerEndDate: offerData.endDate,
            offerTerms: offerData.offerTerms,
            offerImage: offerData.offerImage
        });
    } catch (error) {
        console.error('Slack notification failed (non-critical):', error);
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])('/dashboard');
    return {
        success: true,
        data: profile
    };
}
async function updateBusinessInfo(userId, updates) {
    const supabaseAdmin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])();
    // Filter out routine contact updates that don't need notifications
    const routineFields = [
        'phone',
        'email',
        'first_name',
        'last_name'
    ];
    const importantUpdates = Object.keys(updates).filter((key)=>!routineFields.includes(key));
    const { data: profile, error } = await supabaseAdmin.from('profiles').update(updates).eq('user_id', userId).select().single();
    if (error) {
        return {
            success: false,
            error: error.message
        };
    }
    // Only send notification if important fields were updated
    if (importantUpdates.length > 0) {
        try {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$integrations$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sendBusinessUpdateNotification"])(profile, 'business_info', {
                updatedFields: importantUpdates
            });
        } catch (error) {
            console.error('Slack notification failed (non-critical):', error);
        }
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])('/dashboard');
    return {
        success: true,
        data: profile
    };
}
async function deleteOffer(userId) {
    const supabaseAdmin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])();
    // Get the current offer details for the notification
    const { data: currentProfile, error: fetchError } = await supabaseAdmin.from('profiles').select('*').eq('user_id', userId).single();
    if (fetchError || !currentProfile) {
        return {
            success: false,
            error: 'Profile not found'
        };
    }
    // Store offer details before deletion for notification
    const deletedOffer = {
        offerName: currentProfile.offer_name,
        offerType: currentProfile.offer_type,
        offerValue: currentProfile.offer_value
    };
    // Clear offer data from profile
    const { data: profile, error } = await supabaseAdmin.from('profiles').update({
        offer_name: null,
        offer_type: null,
        offer_value: null,
        offer_claim_amount: null,
        offer_terms: null,
        offer_start_date: null,
        offer_end_date: null,
        offer_image: null
    }).eq('user_id', userId).select().single();
    if (error) {
        return {
            success: false,
            error: error.message
        };
    }
    // Send Slack notification about deletion
    try {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$integrations$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sendBusinessUpdateNotification"])(profile, 'offer_deleted', deletedOffer);
    } catch (error) {
        console.error('Slack notification failed (non-critical):', error);
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])('/dashboard');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])('/dashboard/offers');
    return {
        success: true,
        data: profile
    };
}
async function deleteSecretMenuItem(userId, itemId) {
    const supabaseAdmin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])();
    // Get current profile data
    const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').select('*').eq('user_id', userId).single();
    if (profileError || !profile) {
        return {
            success: false,
            error: 'Profile not found'
        };
    }
    // Parse current secret menu items
    const currentNotes = profile.additional_notes || '{}';
    let notesData;
    try {
        notesData = JSON.parse(currentNotes);
    } catch  {
        notesData = {};
    }
    if (!notesData.secret_menu_items || !Array.isArray(notesData.secret_menu_items)) {
        return {
            success: false,
            error: 'No secret menu items found'
        };
    }
    // Find the item to delete
    const itemIndex = notesData.secret_menu_items.findIndex((item)=>item.created_at === itemId || item.itemName === itemId);
    if (itemIndex === -1) {
        return {
            success: false,
            error: 'Secret menu item not found'
        };
    }
    // Store deleted item details for notification
    const deletedItem = notesData.secret_menu_items[itemIndex];
    // Remove the item
    notesData.secret_menu_items.splice(itemIndex, 1);
    // Update profile with modified secret menu items
    const { error: updateError } = await supabaseAdmin.from('profiles').update({
        additional_notes: JSON.stringify(notesData)
    }).eq('user_id', userId);
    if (updateError) {
        return {
            success: false,
            error: updateError.message
        };
    }
    // Send Slack notification about deletion
    try {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$integrations$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sendBusinessUpdateNotification"])(profile, 'secret_menu_deleted', deletedItem);
    } catch (error) {
        console.error('Slack notification failed (non-critical):', error);
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])('/dashboard');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])('/dashboard/secret-menu');
    return {
        success: true,
        data: deletedItem
    };
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    addSecretMenuItem,
    createOffer,
    updateBusinessInfo,
    deleteOffer,
    deleteSecretMenuItem
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(addSecretMenuItem, "60018773fd9b11481ffb12600c6032a5613918a812", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(createOffer, "60d2bd2e7a334d8c2d68641ddd02fee8fbb6bf2baf", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(updateBusinessInfo, "60dd086945378090aa5100c49572622dd4b6e2e0f2", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(deleteOffer, "408d05e08a002eeb4f7db2d2da1d096d6486b03ce3", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(deleteSecretMenuItem, "60c810bc0ce80aa166c50eda23642390059c3bda5c", null);
}),
"[project]/.next-internal/server/app/dashboard/personal/page/actions.js { ACTIONS_MODULE0 => \"[project]/lib/actions/business-actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$actions$2f$business$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/actions/business-actions.ts [app-rsc] (ecmascript)");
;
}),
"[project]/.next-internal/server/app/dashboard/personal/page/actions.js { ACTIONS_MODULE0 => \"[project]/lib/actions/business-actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "60dd086945378090aa5100c49572622dd4b6e2e0f2",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$actions$2f$business$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["updateBusinessInfo"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$dashboard$2f$personal$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$lib$2f$actions$2f$business$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/dashboard/personal/page/actions.js { ACTIONS_MODULE0 => "[project]/lib/actions/business-actions.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$actions$2f$business$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/actions/business-actions.ts [app-rsc] (ecmascript)");
}),
"[project]/app/favicon.ico.mjs { IMAGE => \"[project]/app/favicon.ico (static in ecmascript)\" } [app-rsc] (structured image object, ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/app/favicon.ico.mjs { IMAGE => \"[project]/app/favicon.ico (static in ecmascript)\" } [app-rsc] (structured image object, ecmascript)"));
}),
"[project]/app/layout.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/app/layout.tsx [app-rsc] (ecmascript)"));
}),
"[project]/lib/supabase/server.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createClient",
    ()=>createClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$supabase$2b$ssr$40$0$2e$7$2e$0_$40$supabase$2b$supabase$2d$js$40$2$2e$57$2e$4$2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/@supabase+ssr@0.7.0_@supabase+supabase-js@2.57.4/node_modules/@supabase/ssr/dist/module/index.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$supabase$2b$ssr$40$0$2e$7$2e$0_$40$supabase$2b$supabase$2d$js$40$2$2e$57$2e$4$2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/@supabase+ssr@0.7.0_@supabase+supabase-js@2.57.4/node_modules/@supabase/ssr/dist/module/createServerClient.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.3_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/headers.js [app-rsc] (ecmascript)");
;
;
async function createClient() {
    const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cookies"])();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$supabase$2b$ssr$40$0$2e$7$2e$0_$40$supabase$2b$supabase$2d$js$40$2$2e$57$2e$4$2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createServerClient"])(("TURBOPACK compile-time value", "https://iiiciapavjonpmldytxf.supabase.co"), ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpaWNpYXBhdmpvbnBtbGR5dHhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MzA1ODksImV4cCI6MjA3MzUwNjU4OX0.-3jyL2wuM7dHMZlgBhuP4FRhn_F6V0GAS1ZHCXqrJyU"), {
        cookies: {
            getAll () {
                return cookieStore.getAll();
            },
            setAll (cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options })=>cookieStore.set(name, value, options));
                } catch  {
                // ignore when running inside a Server Component
                }
            }
        }
    });
}
}),
"[project]/components/dashboard/dashboard-layout.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "DashboardLayout",
    ()=>DashboardLayout
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.3_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const DashboardLayout = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call DashboardLayout() from the server but DashboardLayout is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/dashboard/dashboard-layout.tsx <module evaluation>", "DashboardLayout");
}),
"[project]/components/dashboard/dashboard-layout.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "DashboardLayout",
    ()=>DashboardLayout
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.3_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const DashboardLayout = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call DashboardLayout() from the server but DashboardLayout is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/dashboard/dashboard-layout.tsx", "DashboardLayout");
}),
"[project]/components/dashboard/dashboard-layout.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$dashboard$2d$layout$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/components/dashboard/dashboard-layout.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$dashboard$2d$layout$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/components/dashboard/dashboard-layout.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$dashboard$2d$layout$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/components/dashboard/personal-info-page.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "PersonalInfoPage",
    ()=>PersonalInfoPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.3_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const PersonalInfoPage = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call PersonalInfoPage() from the server but PersonalInfoPage is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/dashboard/personal-info-page.tsx <module evaluation>", "PersonalInfoPage");
}),
"[project]/components/dashboard/personal-info-page.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "PersonalInfoPage",
    ()=>PersonalInfoPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.3_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const PersonalInfoPage = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call PersonalInfoPage() from the server but PersonalInfoPage is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/dashboard/personal-info-page.tsx", "PersonalInfoPage");
}),
"[project]/components/dashboard/personal-info-page.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$personal$2d$info$2d$page$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/components/dashboard/personal-info-page.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$personal$2d$info$2d$page$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/components/dashboard/personal-info-page.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$personal$2d$info$2d$page$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/app/dashboard/personal/page.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>DashboardPersonalPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.3_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$api$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.3_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/api/navigation.react-server.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.3_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/client/components/navigation.react-server.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/server.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$dashboard$2d$layout$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/dashboard/dashboard-layout.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$personal$2d$info$2d$page$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/dashboard/personal-info-page.tsx [app-rsc] (ecmascript)");
;
;
;
;
;
async function DashboardPersonalPage() {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])('/auth/login');
    }
    const { data: profileData, error: profileError } = await supabase.from('profiles').select('*').eq('user_id', data.claims.sub).single();
    if (profileError || !profileData) {
        console.error('Error fetching profile:', profileError);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])('/onboarding');
    }
    const profile = profileData;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$dashboard$2d$layout$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["DashboardLayout"], {
        currentSection: "personal",
        profile: profile,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$dashboard$2f$personal$2d$info$2d$page$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PersonalInfoPage"], {
            profile: profile
        }, void 0, false, {
            fileName: "[project]/app/dashboard/personal/page.tsx",
            lineNumber: 30,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/app/dashboard/personal/page.tsx",
        lineNumber: 29,
        columnNumber: 5
    }, this);
}
}),
"[project]/app/dashboard/personal/page.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/app/dashboard/personal/page.tsx [app-rsc] (ecmascript)"));
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__0a072884._.js.map