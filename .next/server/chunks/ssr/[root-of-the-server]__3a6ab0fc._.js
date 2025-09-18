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
"[project]/lib/actions/signup-actions.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"701a993caf5c2806946ebbf615842dcce85c5ee892":"createUserAndProfile"},"",""] */ __turbopack_context__.s([
    "createUserAndProfile",
    ()=>createUserAndProfile
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.3_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/admin.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$integrations$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/integrations.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.3_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
;
async function createUserAndProfile(formData, files, referralCode) {
    const supabaseAdmin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])();
    try {
        // 1. Create user in auth.users using admin client
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: formData.email,
            password: formData.password,
            email_confirm: true,
            user_metadata: {
                first_name: formData.firstName,
                last_name: formData.lastName
            }
        });
        if (authError || !authData.user) {
            console.error('Auth user creation failed:', authError);
            throw new Error(`Account creation failed: ${authError?.message || 'Unknown error'}`);
        }
        console.log('Auth user created:', authData.user.id);
        // 2. Upload files to Cloudinary
        let logoUrl = '';
        let menuUrls = [];
        let offerImageUrl = '';
        if (files.logo) {
            logoUrl = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$integrations$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uploadToCloudinary"])(files.logo, 'qwikker/logos');
        }
        if (files.menu && files.menu.length > 0) {
            menuUrls = await Promise.all(files.menu.map((file)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$integrations$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uploadToCloudinary"])(file, 'qwikker/menus')));
        }
        if (files.offer) {
            offerImageUrl = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$integrations$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uploadToCloudinary"])(files.offer, 'qwikker/offers');
        }
        // 3. Prepare profile data
        const normalizePhoneNumber = (phone)=>{
            const cleaned = phone.trim();
            if (cleaned.startsWith('0')) {
                return '+44' + cleaned.slice(1);
            }
            return cleaned;
        };
        const mapReferralSource = (source)=>{
            if (!source) return null;
            const mapping = {
                'founding-member': 'partner_referral',
                'business-referral': 'partner_referral',
                'google-search': 'google_search',
                'social-media': 'social_media',
                'word-of-mouth': 'word_of_mouth',
                'other': 'other'
            };
            return mapping[source] || 'other';
        };
        const mapGoals = (goals)=>{
            if (!goals || goals.trim() === '') return null;
            // Map common phrases to database values
            const lowerGoals = goals.toLowerCase();
            if (lowerGoals.includes('customer') && (lowerGoals.includes('new') || lowerGoals.includes('more') || lowerGoals.includes('attract'))) {
                return 'increase_customers';
            }
            if (lowerGoals.includes('marketing') || lowerGoals.includes('advertis') || lowerGoals.includes('promot')) {
                return 'improve_marketing';
            }
            if (lowerGoals.includes('sales') || lowerGoals.includes('revenue') || lowerGoals.includes('income')) {
                return 'boost_sales';
            }
            if (lowerGoals.includes('brand') || lowerGoals.includes('awareness') || lowerGoals.includes('recognition')) {
                return 'build_brand_awareness';
            }
            if (lowerGoals.includes('retention') || lowerGoals.includes('keep') || lowerGoals.includes('loyal')) {
                return 'customer_retention';
            }
            if (lowerGoals.includes('expand') || lowerGoals.includes('grow') || lowerGoals.includes('bigger')) {
                return 'expand_business';
            }
            // Default to 'other' for anything that doesn't match
            return 'other';
        };
        const mapBusinessType = (type)=>{
            const mapping = {
                'Restaurant': 'restaurant',
                'Cafe/Coffee Shop': 'cafe',
                'Bar/Pub': 'bar',
                'Dessert/Ice Cream': 'restaurant',
                'Takeaway/Street Food': 'restaurant',
                'Salon/Spa': 'salon',
                'Hairdresser/Barber': 'salon',
                'Tattoo/Piercing': 'salon',
                'Clothing/Fashion': 'retail_shop',
                'Gift Shop': 'retail_shop',
                'Fitness/Gym': 'gym',
                'Sports/Outdoors': 'gym',
                'Hotel/BnB': 'hotel',
                'Venue/Event Space': 'hotel',
                'Entertainment/Attractions': 'other',
                'Professional Services': 'service_business',
                'Other': 'other'
            };
            return mapping[type] || 'other';
        };
        const mapBusinessTown = (town)=>{
            const cleanTown = town.toLowerCase().trim();
            const mapping = {
                'bournemouth': 'bournemouth',
                'poole': 'poole',
                'christchurch': 'christchurch',
                'wimborne': 'wimborne',
                'ferndown': 'ferndown',
                'ringwood': 'ringwood',
                'new milton': 'new_milton',
                'newmilton': 'new_milton'
            };
            return mapping[cleanTown] || 'other';
        };
        const mapOfferType = (type)=>{
            if (!type) return null;
            const mapping = {
                'percentage': 'percentage_off',
                'fixed': 'fixed_amount_off',
                'bogo': 'two_for_one',
                'free-item': 'freebie',
                'bundle': 'other',
                'other': 'other'
            };
            return mapping[type] || 'other';
        };
        const mapClaimAmount = (amount)=>{
            if (!amount) return null;
            const mapping = {
                'first_10': 'first_10',
                'first_25': 'first_25',
                'first_50': 'first_50',
                'first_100': 'first_100',
                'unlimited': 'unlimited',
                'custom': 'custom'
            };
            return mapping[amount] || 'unlimited';
        };
        const profileData = {
            user_id: authData.user.id,
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email,
            phone: normalizePhoneNumber(formData.phone),
            business_name: formData.businessName,
            business_type: mapBusinessType(formData.businessType),
            business_category: formData.businessCategory,
            business_address: formData.businessAddress,
            business_town: mapBusinessTown(formData.town),
            business_postcode: formData.postcode,
            website_url: formData.website || null,
            instagram_handle: formData.instagram || null,
            facebook_url: formData.facebook || null,
            logo: logoUrl || null,
            offer_name: formData.offerName || null,
            offer_type: mapOfferType(formData.offerType || ''),
            offer_value: formData.offerValue || null,
            offer_claim_amount: mapClaimAmount(formData.claimAmount || ''),
            offer_start_date: formData.startDate || null,
            offer_end_date: formData.endDate || null,
            offer_terms: formData.terms || null,
            offer_image: offerImageUrl || null,
            referral_source: mapReferralSource(formData.referralSource || ''),
            goals: mapGoals(formData.goals || ''),
            notes: formData.notes || null,
            plan: 'featured',
            is_founder: new Date() < new Date('2025-12-31')
        };
        // 4. Create profile
        const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').insert(profileData).select().single();
        if (profileError) {
            console.error('Profile creation failed:', profileError);
            throw new Error(`Profile creation failed: ${profileError.message}`);
        }
        console.log('Profile created:', profile.id);
        // 5. Track referral if provided
        if (referralCode) {
            try {
                const { trackReferral } = await __turbopack_context__.A("[project]/lib/actions/referral-actions.ts [app-rsc] (ecmascript, async loader)");
                await trackReferral(referralCode, authData.user.id);
            } catch (error) {
                console.error('Referral tracking failed (non-critical):', error);
            }
        }
        // Send welcome email (disabled until domain verification)
        // sendWelcomeEmail({
        //   firstName: formData.firstName,
        //   lastName: formData.lastName,
        //   email: formData.email,
        //   businessName: formData.businessName,
        //   profile: profile
        // }).catch(error => {
        //   console.error('Welcome email failed (non-blocking):', error)
        // })
        return {
            success: true,
            user: authData.user,
            profile: profile
        };
    } catch (error) {
        console.error('Signup process failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    createUserAndProfile
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(createUserAndProfile, "701a993caf5c2806946ebbf615842dcce85c5ee892", null);
}),
"[project]/.next-internal/server/app/onboarding/page/actions.js { ACTIONS_MODULE0 => \"[project]/lib/actions/signup-actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$actions$2f$signup$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/actions/signup-actions.ts [app-rsc] (ecmascript)");
;
}),
"[project]/.next-internal/server/app/onboarding/page/actions.js { ACTIONS_MODULE0 => \"[project]/lib/actions/signup-actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "701a993caf5c2806946ebbf615842dcce85c5ee892",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$actions$2f$signup$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createUserAndProfile"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$onboarding$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$lib$2f$actions$2f$signup$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/onboarding/page/actions.js { ACTIONS_MODULE0 => "[project]/lib/actions/signup-actions.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$actions$2f$signup$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/actions/signup-actions.ts [app-rsc] (ecmascript)");
}),
"[project]/app/favicon.ico.mjs { IMAGE => \"[project]/app/favicon.ico (static in ecmascript)\" } [app-rsc] (structured image object, ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/app/favicon.ico.mjs { IMAGE => \"[project]/app/favicon.ico (static in ecmascript)\" } [app-rsc] (structured image object, ecmascript)"));
}),
"[project]/app/layout.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/app/layout.tsx [app-rsc] (ecmascript)"));
}),
"[project]/components/founding-member-form.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "FoundingMemberForm",
    ()=>FoundingMemberForm
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.3_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const FoundingMemberForm = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call FoundingMemberForm() from the server but FoundingMemberForm is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/founding-member-form.tsx <module evaluation>", "FoundingMemberForm");
}),
"[project]/components/founding-member-form.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "FoundingMemberForm",
    ()=>FoundingMemberForm
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.3_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const FoundingMemberForm = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call FoundingMemberForm() from the server but FoundingMemberForm is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/founding-member-form.tsx", "FoundingMemberForm");
}),
"[project]/components/founding-member-form.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$founding$2d$member$2d$form$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/components/founding-member-form.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$founding$2d$member$2d$form$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/components/founding-member-form.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$founding$2d$member$2d$form$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/app/onboarding/page.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>OnboardingPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.3_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$founding$2d$member$2d$form$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/founding-member-form.tsx [app-rsc] (ecmascript)");
;
;
async function OnboardingPage({ searchParams }) {
    const params = await searchParams;
    const referralCode = params.ref || null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-h-screen bg-slate-950 text-white dark:bg-slate-950 dark:text-white",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "container mx-auto max-w-4xl px-4 py-8",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$founding$2d$member$2d$form$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["FoundingMemberForm"], {
                referralCode: referralCode
            }, void 0, false, {
                fileName: "[project]/app/onboarding/page.tsx",
                lineNumber: 14,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/app/onboarding/page.tsx",
            lineNumber: 13,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/app/onboarding/page.tsx",
        lineNumber: 12,
        columnNumber: 5
    }, this);
}
}),
"[project]/app/onboarding/page.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/app/onboarding/page.tsx [app-rsc] (ecmascript)"));
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__3a6ab0fc._.js.map