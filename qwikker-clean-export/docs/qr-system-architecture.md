# QR Code System Architecture - Hybrid Approach

## Overview
Two-tier QR code system that balances simplicity, cost-effectiveness, and premium features.

## System Design

### Tier 1: Universal QR Codes (Free/Starter/Featured)
- **3 QR codes total** for all non-Spotlight businesses
- **Shared routing** with business selection
- **Basic analytics** aggregated per business
- **Admin management** via simple toggle switches

### Tier 2: Dedicated QR Codes (Spotlight Only)
- **Unique QR codes** per business per type
- **Direct routing** with no business selection
- **Advanced analytics** with detailed breakdowns
- **Custom branding** and design options

## Database Schema

```sql
-- Universal QR assignments (Tier 1)
business_qr_assignments:
  - business_id
  - qr_type (explore/offers/secret)
  - tier ('starter', 'featured') -- excludes spotlight
  - is_active

-- Dedicated QR codes (Tier 2) 
dedicated_qr_codes:
  - business_id
  - qr_code (unique identifier)
  - qr_type
  - tier ('spotlight')
  - custom_design_url
  - direct_url
  - is_active

-- Analytics (both tiers)
qr_analytics:
  - qr_type
  - business_id
  - is_universal (true/false)
  - scan_data...
```

## Routing Logic

### Universal QR Scan:
1. Scan → `/intent?type=offers`
2. Detect location → Find nearby businesses with offers QR
3. Show business selection → Route to selected business
4. Log analytics for selected business

### Dedicated QR Scan:
1. Scan → `/business/jerry-burgers/offers?qr=dedicated-001`
2. Direct routing → No business selection needed
3. Log detailed analytics with QR code ID

## Admin Interface

### Universal QR Management:
```
Business List:
[x] Jerry's Burgers    | Explore: ✅ | Offers: ✅ | Secret: ❌
[x] Pizza Palace       | Explore: ✅ | Offers: ❌ | Secret: ❌
[x] Coffee Corner      | Explore: ✅ | Offers: ✅ | Secret: ✅

Bulk Actions:
- Assign all approved businesses to Explore QR
- Remove all businesses from Secret QR
```

### Dedicated QR Management (Spotlight):
```
Premium Restaurant:
- Explore QR: premium-rest-explore-001 [Generate] [Download]
- Offers QR: premium-rest-offers-001 [Generate] [Download]  
- Secret QR: premium-rest-secret-001 [Generate] [Download]

Analytics:
- 47 scans this week
- Peak times: Fri 7-9pm
- Devices: 70% mobile, 30% desktop
- Conversions: 23 offers claimed
```

## Cost Analysis

### Universal System:
- Print cost: £200 (3 QR codes for 1000 businesses)
- Per business: £0.20
- Management: Minimal (toggle switches)

### Dedicated System:
- Print cost: £5-10 per business (unique codes)
- Design cost: £20-50 per business (custom branding)
- Management: Moderate (individual QR generation)

## Business Benefits

### Starter/Featured Tiers:
- Included in existing pricing
- Professional QR code access
- Basic scan analytics
- Easy to manage

### Spotlight Tier:
- Premium feature differentiation
- Advanced analytics justify higher pricing
- Custom branding increases perceived value
- Direct routing improves user experience

## Implementation Priority

1. **Phase 1**: Build Universal QR system
   - 3 QR codes, business selection interface
   - Basic analytics aggregation
   - Simple admin toggles

2. **Phase 2**: Add Dedicated QR system
   - Unique QR generation for Spotlight
   - Advanced analytics dashboard
   - Custom design upload

3. **Phase 3**: Enhanced features
   - QR code heat mapping
   - A/B testing for QR placement
   - Integration with business dashboard

## Key Advantages

✅ **Scalable**: Universal system handles 1000+ businesses with 3 QR codes
✅ **Monetizable**: Dedicated QR codes justify Spotlight tier pricing
✅ **Simple**: Admin can manage both systems from one interface
✅ **Cost-effective**: Businesses get QR access regardless of tier
✅ **Upgradeable**: Clear path from universal to dedicated QR codes
