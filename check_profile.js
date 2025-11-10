require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('URL:', supabaseUrl ? 'Found' : 'Missing');
console.log('Key:', supabaseKey ? 'Found' : 'Missing');

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfile() {
  const { data, error } = await supabase
    .from('business_profiles')
    .select('business_name, business_hours, business_hours_structured, business_description, business_tagline, business_address, business_town, business_category, logo, business_images, status')
    .eq('status', 'incomplete')
    .limit(1)
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\nProfile Data:');
  console.log('business_name:', data?.business_name ? '✓' : '✗ MISSING');
  console.log('business_hours:', data?.business_hours ? '✓' : '✗');
  console.log('business_hours_structured:', data?.business_hours_structured ? '✓' : '✗');
  console.log('business_description:', data?.business_description ? '✓' : '✗ MISSING');
  console.log('business_tagline:', data?.business_tagline ? '✓' : '✗ MISSING');
  console.log('business_address:', data?.business_address ? '✓' : '✗ MISSING');
  console.log('business_town:', data?.business_town ? '✓' : '✗ MISSING');
  console.log('business_category:', data?.business_category ? '✓' : '✗ MISSING');
  console.log('logo:', data?.logo ? '✓' : '✗ MISSING');
  console.log('business_images:', Array.isArray(data?.business_images) && data.business_images.length > 0 ? `✓ (${data.business_images.length} images)` : '✗ MISSING');
  console.log('status:', data?.status);
  
  const isReady = data?.business_name && 
    (data?.business_hours || data?.business_hours_structured) &&
    data?.business_description && 
    data?.business_tagline && 
    data?.business_address && 
    data?.business_town && 
    data?.business_category && 
    data?.logo && 
    data?.business_images && 
    Array.isArray(data.business_images) && 
    data.business_images.length > 0;
    
  console.log('\n✨ isReadyForReview:', isReady ? 'TRUE (banner should show)' : 'FALSE (banner hidden)');
}

checkProfile();
