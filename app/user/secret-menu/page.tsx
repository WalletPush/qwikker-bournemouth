import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { UserSecretMenuPage } from '@/components/user/user-secret-menu-page'
import { createTenantAwareClient, getSafeCurrentCity } from '@/lib/utils/tenant-security'
import { getCityDisplayName } from '@/lib/utils/city-detection'

export const dynamic = 'force-dynamic'
import { getWalletPassCookie } from '@/lib/utils/wallet-session'
import { Suspense } from 'react'

interface SecretMenuPageProps {
  searchParams: Promise<{
    wallet_pass_id?: string
  }>
}

export default async function SecretMenuPage({ searchParams }: SecretMenuPageProps) {
  // SECURITY: Validate franchise first
  let currentCity: string
  let cityDisplayName: string
  try {
    currentCity = await getSafeCurrentCity()
    cityDisplayName = getCityDisplayName(currentCity as any)
  } catch (error) {
    console.error('❌ Invalid franchise access:', error)
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-slate-400">Invalid franchise location detected.</p>
        </div>
      </div>
    )
  }

  const supabase = await createTenantAwareClient()

  const resolvedSearchParams = await searchParams
  const urlWalletPassId = resolvedSearchParams.wallet_pass_id
  
  // Get wallet pass ID from URL or cookie
  let cookieWalletPassId = null
  try {
    cookieWalletPassId = await getWalletPassCookie()
  } catch (error) {
    // Cookie read error (safe to ignore)
  }
  
  const walletPassId = urlWalletPassId || cookieWalletPassId || null

  const { createServiceRoleClient } = await import('@/lib/supabase/server')
  const supabaseUser = createServiceRoleClient()
  
  // Get current user for the layout
  let currentUser = null
  if (walletPassId) {
    try {
      const { data: user } = await supabaseUser
        .from('app_users')
        .select('*')
        .eq('wallet_pass_id', walletPassId)
        .eq('wallet_pass_status', 'active')
        .single()
      
      if (user) {
        currentUser = {
          id: user.id,
          wallet_pass_id: user.wallet_pass_id,
          name: user.name,
          email: user.email,
          city: user.city,
          tier: user.tier,
          level: user.level
        }
      }
    } catch (error) {
      // No user found for secret menu page
    }
  }
  
  // Same scope as Offers: paid/trial (chat_eligible) + free listings (claimed_free).
  // chat_eligible alone hid claimed_free secret menus even when Discover showed the business.
  const selectCols = `
      id,
      business_name,
      system_category,
      business_address,
      phone,
      business_images,
      additional_notes,
      status,
      plan
    `
  const [{ data: paidOrTrial, error: paidErr }, { data: freeListings, error: freeErr }] =
    await Promise.all([
      supabase
        .from('business_profiles_chat_eligible')
        .select(selectCols)
        .eq('city', currentCity)
        .not('business_name', 'is', null),
      supabase
        .from('business_profiles')
        .select(selectCols)
        .eq('city', currentCity)
        .eq('status', 'claimed_free')
        .not('business_name', 'is', null),
    ])

  const error = paidErr || freeErr
  if (error) {
    console.error('Error fetching businesses with secret menus:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
  }

  const byId = new Map<string, NonNullable<typeof paidOrTrial>[number]>()
  for (const b of [...(paidOrTrial || []), ...(freeListings || [])]) {
    byId.set(b.id, b)
  }
  const approvedBusinesses = Array.from(byId.values())

  // Parse real secret menu items from approved businesses
  const realSecretMenus = (approvedBusinesses || []).map(business => {
    let secretMenuItems = []
    
    if (business.additional_notes) {
      try {
        const notes = JSON.parse(business.additional_notes)
        secretMenuItems = notes.secret_menu_items || []
      } catch (e) {
        console.error('Error parsing additional_notes for business:', business.business_name, e)
      }
    }

    // ✅ Make Spotlight tier businesses' items LEGENDARY (rarity 5)
    const isSpotlight = business.plan === 'spotlight'
    const rarity = isSpotlight ? 5 : 3

    return {
      businessId: business.id,
      businessName: business.business_name,
      businessCategory: business.system_category || 'Restaurant',
      businessAddress: business.business_address,
      businessPhone: business.phone,
      businessImage: business.business_images?.[0] || null, // Get first image from array
      items: secretMenuItems.map((item: any) => ({
        name: item.itemName,
        description: item.description || 'A delicious secret item',
        price: item.price || null,
        image_url: item.image_url || null,
        hint: `Ask your server for "${item.itemName}" - they'll know what you mean! 😉`,
        rarity: rarity,
        pointsReward: isSpotlight ? 100 : 50,
        unlockMethods: [
          { type: 'visit', description: 'Visit the restaurant and ask for this item' },
          { type: 'points', cost: isSpotlight ? 50 : 25, description: `Spend ${isSpotlight ? 50 : 25} points to unlock remotely` }
        ],
        isReal: true
      }))
    }
  }).filter(menu => menu.items.length > 0) // Only include businesses with secret menu items

  return (
    <UserDashboardLayout 
      currentSection="secret-menu"
      walletPassId={walletPassId}
      currentUser={currentUser}
      currentCity={currentCity}
      cityDisplayName={cityDisplayName}
    >
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-slate-400">Loading secret menu...</div>
        </div>
      }>
        <UserSecretMenuPage 
          realSecretMenus={realSecretMenus} 
          walletPassId={walletPassId}
          currentCity={currentCity}
          cityDisplayName={cityDisplayName}
        />
      </Suspense>
    </UserDashboardLayout>
  )
}
