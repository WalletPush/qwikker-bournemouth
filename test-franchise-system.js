// Quick test of the new franchise geography system
import { getFranchiseForArea, getAreasForFranchise } from './lib/utils/franchise-geography.ts'

async function testFranchiseSystem() {
  console.log('🧪 Testing Franchise Geography System...\n')
  
  // Test 1: Get franchise for different areas
  console.log('📍 Test 1: Area to Franchise Mapping')
  const testAreas = ['bournemouth', 'christchurch', 'poole', 'boscombe', 'calgary', 'london']
  
  for (const area of testAreas) {
    const franchise = await getFranchiseForArea(area)
    console.log(`   ${area} → ${franchise || 'NOT FOUND'}`)
  }
  
  console.log('\n🏢 Test 2: Franchise to Areas Mapping')
  const testFranchises = ['bournemouth', 'calgary', 'london']
  
  for (const franchise of testFranchises) {
    const areas = await getAreasForFranchise(franchise)
    console.log(`   ${franchise} → [${areas.join(', ')}]`)
  }
  
  console.log('\n✅ Franchise system test complete!')
}

testFranchiseSystem().catch(console.error)

