import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { UserSecretMenuPage } from '@/components/user/user-secret-menu-page'
import { createClient } from '@/lib/supabase/server'

export default async function SecretMenuPage() {
  const supabase = await createClient()
  
  // Fetch approved businesses (we'll filter for secret menus after parsing)
  const { data: approvedBusinesses, error } = await supabase
    .from('business_profiles')
    .select(`
      id,
      business_name,
      business_category,
      business_address,
      phone,
      business_images,
      additional_notes,
      status
    `)
    .eq('status', 'approved')
    .not('business_name', 'is', null)

  if (error) {
    console.error('Error fetching businesses with secret menus:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
  }

  // Debug logging
  console.log('📊 Approved businesses found:', approvedBusinesses?.length || 0)
  
  // Parse real secret menu items from approved businesses
  const realSecretMenus = (approvedBusinesses || []).map(business => {
    let secretMenuItems = []
    
    if (business.additional_notes) {
      try {
        const notes = JSON.parse(business.additional_notes)
        secretMenuItems = notes.secret_menu_items || []
        if (secretMenuItems.length > 0) {
          console.log('🤫 Found secret menu items for:', business.business_name, secretMenuItems.length, 'items')
        }
      } catch (e) {
        console.error('Error parsing additional_notes for business:', business.business_name, e)
      }
    }

    return {
      businessId: business.id,
      businessName: business.business_name,
      businessCategory: business.business_category || 'Restaurant',
      businessAddress: business.business_address,
      businessPhone: business.phone,
      businessImage: business.business_images?.[0] || null, // Get first image from array
      items: secretMenuItems.map((item: any) => ({
        name: item.itemName,
        description: item.description || 'A delicious secret item',
        price: item.price || null,
        hint: `Ask your server for "${item.itemName}" - they'll know what you mean! 😉`,
        rarity: 3, // Default rarity for real items
        pointsReward: 50,
        unlockMethods: [
          { type: 'visit', description: 'Visit the restaurant and ask for this item' },
          { type: 'points', cost: 25, description: 'Spend 25 points to unlock remotely' }
        ],
        isReal: true // Flag to identify real items
      }))
    }
  }).filter(menu => menu.items.length > 0) // Only include businesses with secret menu items

  return (
    <UserDashboardLayout>
      <UserSecretMenuPage realSecretMenus={realSecretMenus} />
    </UserDashboardLayout>
  )
}
