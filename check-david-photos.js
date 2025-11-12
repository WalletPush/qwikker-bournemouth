const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkPhotos() {
  const { data, error } = await supabase
    .from('business_profiles')
    .select('business_name, business_images, offer_image, logo')
    .ilike('business_name', '%david%grill%')
    .single()
  
  if (error) {
    console.error('Error:', error)
    return
  }
  
  console.log('Business:', data.business_name)
  console.log('\nbusiness_images:', JSON.stringify(data.business_images, null, 2))
  console.log('\noffer_image:', data.offer_image)
  console.log('\nlogo:', data.logo)
  
  // Check for duplicates
  if (Array.isArray(data.business_images)) {
    const unique = new Set(data.business_images)
    console.log('\nTotal images in array:', data.business_images.length)
    console.log('Unique images:', unique.size)
    console.log('Duplicates:', data.business_images.length - unique.size)
  }
}

checkPhotos()
