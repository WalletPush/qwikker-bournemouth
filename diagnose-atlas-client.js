/**
 * Browser Console Diagnostic Script
 * Paste this into the browser console on bali.qwikker.com/user/chat
 * to check what the API is returning
 */

console.log('🔍 Starting Atlas diagnostic...\n');

// Check current hostname
console.log('📍 Current hostname:', window.location.hostname);
console.log('📍 Current URL:', window.location.href);

// Fetch tenant config from API
fetch('/api/tenant/config')
  .then(response => {
    console.log('\n📡 API Response Status:', response.status, response.statusText);
    return response.json();
  })
  .then(data => {
    console.log('\n📦 API Response Data:');
    console.log(JSON.stringify(data, null, 2));
    
    console.log('\n🔍 Atlas-specific checks:');
    console.log('  - config.ok:', data.ok);
    console.log('  - config.city:', data.city);
    console.log('  - config.status:', data.status);
    console.log('  - config.atlas:', data.atlas);
    console.log('  - config.atlas?.enabled:', data.atlas?.enabled);
    console.log('  - config.atlas?.mapboxPublicToken:', data.atlas?.mapboxPublicToken ? 'EXISTS (length: ' + data.atlas.mapboxPublicToken.length + ')' : 'MISSING');
    
    console.log('\n🎯 Final verdict:');
    const atlasEnabled = data.atlas?.enabled && data.atlas?.mapboxPublicToken;
    if (atlasEnabled) {
      console.log('✅ Atlas SHOULD BE VISIBLE');
      console.log('   If you don\'t see the Atlas button, try:');
      console.log('   1. Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)');
      console.log('   2. Clear site data in DevTools');
      console.log('   3. Check for JavaScript errors in console');
    } else {
      console.log('❌ Atlas WILL NOT SHOW');
      if (!data.atlas?.enabled) {
        console.log('   Reason: atlas.enabled is false or missing');
        console.log('   This means: status != \'active\' OR atlas_enabled != true in DB');
      }
      if (!data.atlas?.mapboxPublicToken) {
        console.log('   Reason: mapboxPublicToken is missing from response');
        console.log('   This means: mapbox_public_token is NULL in DB');
      }
    }
    
    console.log('\n📍 React State Check:');
    console.log('   Look for this in your components:');
    console.log('   const atlasEnabled = tenantConfig?.atlas?.enabled && tenantConfig?.atlas?.mapboxPublicToken');
    console.log('   Expected value:', atlasEnabled);
  })
  .catch(error => {
    console.error('\n❌ API Error:', error);
    console.log('   The /api/tenant/config endpoint failed');
    console.log('   Check the Network tab for more details');
  });
