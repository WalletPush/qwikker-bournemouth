// Script to add safety flags to all placeholder variants
// Run this to update lib/constants/category-placeholders.ts

// SAFETY CLASSIFICATION RULES:
// 'safe' = Abstract, generic, works for ANY business in that category
// 'risky' = Specific cuisine/product/style that could misrepresent

const variantUpdates = {
  cafe: {
    safe: [0, 1, 2, 3, 4, 5, 6, 8, 9, 10], // Coffee-related abstracts
    risky: [7] // Latte art (implies hipster/specialty cafe)
  },
  bar: {
    safe: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], // All bar imagery is generic enough
    risky: []
  },
  pub: {
    safe: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], // All pub imagery is generic
    risky: []
  },
  bakery: {
    safe: [0, 1, 2, 3, 4, 5, 8, 9, 10], // Baking equipment/tools
    risky: [6, 7] // Croissants, artisan loaves (specific products)
  },
  fast_food: {
    safe: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], // All fast food imagery is generic enough
    risky: []
  },
  barber: {
    safe: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], // All barber tools are generic
    risky: []
  },
  dessert: {
    safe: [0, 1, 2, 3, 4, 5, 8, 9, 10], // Abstract dessert textures
    risky: [6, 7] // Berry juice, caramel (could be specific)
  },
  takeaway: {
    safe: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], // All takeaway packaging is generic
    risky: []
  },
  salon: {
    safe: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], // All salon/spa imagery is generic
    risky: []
  },
  tattoo: {
    safe: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], // All tattoo equipment is generic
    risky: []
  },
  wellness: {
    safe: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], // All wellness imagery is generic
    risky: []
  },
  retail: {
    safe: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], // All retail imagery is generic
    risky: []
  },
  fitness: {
    safe: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], // All fitness equipment is generic
    risky: []
  },
  sports: {
    safe: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], // All sports imagery is generic
    risky: []
  },
  hotel: {
    safe: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], // All hotel imagery is generic
    risky: []
  },
  venue: {
    safe: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], // All venue imagery is generic
    risky: []
  },
  entertainment: {
    safe: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], // All entertainment imagery is generic
    risky: []
  },
  professional: {
    safe: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], // All professional imagery is generic
    risky: []
  },
  other: {
    safe: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], // All generic textures
    risky: []
  }
};

export default variantUpdates;

