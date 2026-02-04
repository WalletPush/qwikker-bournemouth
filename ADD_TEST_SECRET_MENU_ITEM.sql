-- Add a test secret menu item to your business
-- Step 1: Find your business ID
SELECT id, business_name, plan as tier 
FROM business_profiles 
WHERE business_name ILIKE '%david%grill%' 
  OR business_name ILIKE '%grill%shack%';

-- Step 2: Insert a test secret menu item
-- Replace {BUSINESS_ID} with the UUID from above
INSERT INTO knowledge_base (
  business_id,
  title,
  content,
  metadata,
  created_at
) VALUES (
  '{BUSINESS_ID}', -- Replace with actual UUID
  'Secret Mega Burger',
  'Our off-menu creation: double patty with secret sauce, caramelized onions, loaded fries on the side. Only for those in the know.',
  '{"name": "Secret Mega Burger", "description": "Off-menu double burger with secret sauce and loaded fries", "is_secret": true, "type": "secret_menu", "price": "£15"}',
  NOW()
);

-- Step 3: Add a few more test items
INSERT INTO knowledge_base (
  business_id,
  title,
  content,
  metadata,
  created_at
) VALUES 
(
  '{BUSINESS_ID}',
  'Underground Milkshake',
  'Secret dessert: thick vanilla shake with Oreo crumbles and salted caramel drizzle',
  '{"name": "Underground Milkshake", "description": "Secret vanilla shake with Oreo and salted caramel", "is_secret": true, "type": "secret_menu", "price": "£6"}',
  NOW()
),
(
  '{BUSINESS_ID}',
  'Loaded Fries',
  'Crispy skin-on fries topped with cheese, bacon bits, and our special grill sauce',
  '{"name": "Loaded Fries", "description": "Fries with cheese, bacon, and grill sauce", "price": "£5.50"}',
  NOW()
),
(
  '{BUSINESS_ID}',
  'Classic Burger',
  'Our signature beef patty with lettuce, tomato, pickles, and house sauce',
  '{"name": "Classic Burger", "description": "Beef burger with all the classics", "price": "£9"}',
  NOW()
);

-- Step 4: Verify they were added
SELECT 
  id,
  title,
  metadata->>'name' as name,
  metadata->>'is_secret' as is_secret,
  metadata
FROM knowledge_base
WHERE business_id = '{BUSINESS_ID}'
ORDER BY created_at DESC;
