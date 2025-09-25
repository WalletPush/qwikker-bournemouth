# COMPLEX REWARDS SYSTEM BACKUP
*Saved on: $(date)*

## CONCEPT
- Badge-based gamification with cash rewards
- £10 credit for unlocking ALL badges
- Complex tracking and verification system

## IMPLEMENTATION CHALLENGES IDENTIFIED
- Business visit verification (GPS, QR codes)
- Offer redemption tracking (POS integration)
- Referral system fraud prevention
- Secret menu abuse prevention
- Multi-city scaling complexity
- Customer service overhead
- Payment processing and disputes

## BADGE SYSTEM LOGIC (SAVED)

### Badge Types & Requirements:
- **Common Badges:**
  - First Steps (first business visit)
  - Conversation Starter (first AI chat)
  - Deal Hunter (first offer claimed)

- **Rare Badges:**
  - Secret Seeker (first secret menu unlock)
  - Social Butterfly (3 friend referrals)
  - Local Expert (10 business visits)
  - Streak Master (7 consecutive days active)

- **Epic Badges:**
  - Secret Menu Master (25 secret items unlocked)
  - Hype Lord (10 friend referrals)
  - Point Collector (5,000 points earned)

- **Legendary Badges:**
  - Bournemouth Legend (complete all achievements)
  - Founding Member (first 100 users)

### Technical Implementation:
- SVG icon system with rarity-based styling
- Progress tracking with alternateRequirement logic
- Shield/circle badge designs
- Modal detail views
- User-specific badge states in localStorage
- Supabase badge storage in user profiles

### Reward System:
- Individual badge rewards (£4-£20 credits)
- Ultimate challenge: All badges = £10 credit
- Redemption codes and terms
- Business partner integration required

## WHY REMOVED
- Implementation complexity too high for current resources
- Fraud prevention would require significant infrastructure
- Focus needed on core features (offers, discovery, secret menus)
- Can be revisited when business has dedicated tracking resources

## SIMPLE ALTERNATIVE CHOSEN
- Visual-only badge system
- No cash rewards
- Auto-award based on simple, non-verifiable actions
- Pure gamification for engagement
- No fraud risk or complex tracking needed
