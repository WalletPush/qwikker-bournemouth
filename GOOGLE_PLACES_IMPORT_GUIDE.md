# Google Places Import - Complete Guide

## 🗺️ Category Mapping

### How It Works:
1. **Admin selects:** "Restaurant" (our friendly name)
2. **We search Google for:** `types: ["restaurant", "meal_takeaway"]`
3. **Google returns businesses** with those types
4. **We store in DB:** `business_category: "Restaurant"`, `business_type: "restaurant"`

### Category Alignment:

| UI Display | Google API Types | DB Category | DB Type |
|-----------|------------------|-------------|---------|
| Restaurant | restaurant, meal_takeaway | Restaurant | restaurant |
| Cafe/Coffee Shop | cafe, coffee_shop | Cafe/Coffee Shop | cafe |
| Bar/Pub | bar, night_club | Bar/Pub | bar |
| Dessert/Ice Cream | bakery, ice_cream_shop | Dessert/Ice Cream | dessert |
| Salon/Spa | beauty_salon, spa | Salon/Spa | salon |
| Hairdresser/Barber | hair_care, barber_shop | Hairdresser/Barber | salon |
| Tattoo/Piercing | tattoo_studio | Tattoo/Piercing | salon |
| Clothing/Fashion | clothing_store, shoe_store | Clothing/Fashion | retail |
| Fitness/Gym | gym, fitness_center | Fitness/Gym | fitness |

---

## 🔑 API Keys Required

### Database Schema:
```sql
franchise_crm_configs:
  - google_places_api_key (for import + photo display)
  - resend_api_key (for verification emails)
  - slack_webhook_url (for notifications)
```

### Google Places API Costs:
- **Nearby Search:** $32/1000 requests = £0.025 per search
- **Place Details:** $17/1000 requests = £0.014 per business
- **Place Photos:** $7/1000 requests = £0.006 per photo (within 100k free tier)

**Total per business:** ~£0.039 + £0.014 = **£0.053**  
**For 200 businesses:** **~£10.60**

---

## 📸 Photo Handling (Legal)

### What We DON'T Do:
❌ Download Google photos
❌ Rehost on Cloudinary
❌ Violate Google's TOS

### What We DO:
✅ Store `google_photo_reference` from API
✅ Display via Google Photo API with attribution
✅ Replace with uploaded photos when business claims

### Implementation:
```typescript
// Store in DB
google_photo_reference: "CmRaAAAA..." // From Google Places API

// Display in UI
<img 
  src={`https://maps.googleapis.com/maps/api/place/photo
    ?maxwidth=400
    &photo_reference=${photoRef}
    &key=${GOOGLE_API_KEY}`}
  alt="Business photo"
/>
<span className="text-xs">📷 Google</span>

// After claim
logo_url: "https://res.cloudinary.com/..." // Uploaded by business
```

---

## ✅ Data Quality Checks

### Google Places API Returns:
```json
{
  "business_status": "OPERATIONAL" | "CLOSED_TEMPORARILY" | "CLOSED_PERMANENTLY",
  "rating": 4.5,
  "user_ratings_total": 234,
  "types": ["restaurant", "food"],
  "geometry": {
    "location": { "lat": 50.719, "lng": -1.880 }
  },
  "place_id": "ChIJ...",
  "permanently_closed": false
}
```

### Our Validation Rules:
```typescript
✅ rating >= 4.4 (hard requirement)
✅ business_status === "OPERATIONAL"
✅ permanently_closed !== true
✅ user_ratings_total >= 10 (has reviews)
✅ distance <= search_radius
✅ google_place_id exists (for deduplication)
✅ NOT in excluded types: ["funeral_home", "cemetery"]
```

---

## 🚀 Import Flow

### Step 1: Preview (FREE)
```
Admin fills form:
  Location: "Bournemouth, UK"
  Category: "Restaurant"
  Min Rating: 4.4★
  Radius: 5km
  Max Results: 200

Click "Preview Results (No Charge)"
  ↓
Backend calls: Nearby Search API (1 request = £0.025)
  ↓
Returns: 200 businesses (name, rating, address, distance)
  ↓
UI shows table with checkboxes
```

### Step 2: Import (PAID)
```
Admin selects 50 businesses
Click "Import 50 Selected (Est: £2.65)"
  ↓
Backend calls: Place Details API × 50 (50 requests = £0.70)
  ↓
Streams progress: 1/50... 25/50... 50/50
  ↓
Stores in database with status = 'unclaimed'
  ↓
Done! Ready for QR code printing
```

---

## 🛑 Stop/Cancel Import

### How It Works:
```
Backend: Uses AbortController
Frontend: Server-Sent Events (SSE) for real-time progress

User clicks "Stop Import"
  ↓
Send POST /api/admin/import-businesses/cancel
  ↓
Backend aborts current request
  ↓
Returns: "Imported 23/50, Cancelled by user"
```

---

## 🔒 Security

### Multi-Tenant:
- Each franchise uses their OWN Google API key
- Costs charged to THEIR Google Cloud account
- No shared keys = no cost spillover

### Rate Limiting:
- Google: 1000 requests/second (we'll never hit this)
- Our limit: 5 imports per batch (to avoid accidents)
- Cooldown: 10 seconds between batches

---

## 📊 Success Criteria

After import, each business has:
```sql
business_profiles:
  - business_name ✅
  - business_category ✅
  - business_type ✅
  - address ✅
  - phone (if available)
  - website (if available)
  - rating ✅
  - review_count ✅
  - google_place_id ✅ (for dedup)
  - google_photo_reference ✅
  - status: 'unclaimed' ✅
  - visibility: 'discover_only' ✅
  - auto_imported: true ✅
```

Ready for claim flow! 🎉

