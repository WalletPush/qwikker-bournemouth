// Simple badge tracking system - client-side only
// In a real app, this would sync with your backend

export interface BadgeProgress {
  id: string
  name: string
  description: string
  icon: string
  rarity: string
  earned: boolean
  earnedDate?: string
  progress?: {
    current: number
    target: number
  }
}

// Track user actions for badge awards
export class SimpleBadgeTracker {
  private userId: string
  private storageKey: string

  constructor(userId: string = 'default-user') {
    this.userId = userId
    this.storageKey = `qwikker-badges-${userId}`
  }

  // Get current badge progress
  getBadgeProgress(): BadgeProgress[] {
    if (typeof window === 'undefined') return []
    
    const stored = localStorage.getItem(this.storageKey)
    if (!stored) {
      return this.initializeBadges()
    }
    
    try {
      return JSON.parse(stored)
    } catch {
      return this.initializeBadges()
    }
  }

  // Initialize badges for new user
  private initializeBadges(): BadgeProgress[] {
    const badges: BadgeProgress[] = [
      // COMMON BADGES
      { id: 'welcome', name: 'Welcome!', description: 'Joined Qwikker', icon: 'star', rarity: 'common', earned: true, earnedDate: new Date().toISOString() },
      { id: 'first_offer', name: 'Deal Hunter', description: 'Claimed your first offer', icon: 'target', rarity: 'common', earned: false },
      { id: 'chat_starter', name: 'Chat Master', description: 'Used AI chat feature', icon: 'chat', rarity: 'common', earned: false },
      { id: 'browser', name: 'Window Shopper', description: 'Browsed businesses page', icon: 'eye', rarity: 'common', earned: false },
      
      // RARE BADGES
      { id: 'secret_seeker', name: 'Secret Seeker', description: 'Unlocked your first secret menu', icon: 'search', rarity: 'rare', earned: false },
      { id: 'offer_master', name: 'Offer Master', description: 'Claimed 10 different offers', icon: 'trophy', rarity: 'rare', earned: false, progress: { current: 0, target: 10 } },
      { id: 'social_sharer', name: 'Social Butterfly', description: 'Shared 5 businesses or offers', icon: 'share', rarity: 'rare', earned: false, progress: { current: 0, target: 5 } },
      { id: 'night_owl', name: 'Night Owl', description: 'Used app after midnight', icon: 'moon', rarity: 'rare', earned: false },
      { id: 'weekend_warrior', name: 'Weekend Warrior', description: 'Active every weekend for a month', icon: 'calendar', rarity: 'rare', earned: false },
      
      // EPIC BADGES
      { id: 'secret_master', name: 'Secret Master', description: 'Unlocked 25 secret menu items', icon: 'key', rarity: 'epic', earned: false, progress: { current: 0, target: 25 } },
      { id: 'deal_legend', name: 'Deal Legend', description: 'Claimed 50 offers total', icon: 'crown', rarity: 'epic', earned: false, progress: { current: 0, target: 50 } },
      { id: 'loyalty_champion', name: 'Loyalty Champion', description: 'Active for 30 consecutive days', icon: 'fire', rarity: 'epic', earned: false, progress: { current: 0, target: 30 } },
      { id: 'early_bird', name: 'Early Bird', description: 'Used app before 6am 10 times', icon: 'sunrise', rarity: 'epic', earned: false, progress: { current: 0, target: 10 } },
      { id: 'chat_enthusiast', name: 'Chat Enthusiast', description: 'Had 100+ AI chat conversations', icon: 'message', rarity: 'epic', earned: false, progress: { current: 0, target: 100 } },
      { id: 'local_expert', name: 'Local Expert', description: 'Visited 20+ different businesses', icon: 'map', rarity: 'epic', earned: false, progress: { current: 0, target: 20 } },
      
      // LEGENDARY BADGES - Ultra Rare
      { id: 'qwikker_legend', name: 'Qwikker Legend', description: 'Earned ALL other badges', icon: 'diamond', rarity: 'legendary', earned: false },
      { id: 'city_champion', name: 'City Champion', description: 'Active for 365 consecutive days', icon: 'trophy-star', rarity: 'legendary', earned: false, progress: { current: 0, target: 365 } }
    ]
    
    this.saveBadges(badges)
    return badges
  }

  // Save badges to localStorage
  private saveBadges(badges: BadgeProgress[]) {
    if (typeof window === 'undefined') return
    localStorage.setItem(this.storageKey, JSON.stringify(badges))
  }

  // Award a badge
  awardBadge(badgeId: string): boolean {
    const badges = this.getBadgeProgress()
    const badge = badges.find(b => b.id === badgeId)
    
    if (!badge || badge.earned) return false
    
    badge.earned = true
    badge.earnedDate = new Date().toISOString()
    this.saveBadges(badges)
    
    // Show notification
    this.showBadgeNotification(badge)
    return true
  }

  // Update progress for a badge
  updateProgress(badgeId: string, increment: number = 1): boolean {
    const badges = this.getBadgeProgress()
    const badge = badges.find(b => b.id === badgeId)
    
    if (!badge || badge.earned || !badge.progress) return false
    
    badge.progress.current = Math.min(badge.progress.current + increment, badge.progress.target)
    
    // Auto-award if target reached
    if (badge.progress.current >= badge.progress.target) {
      badge.earned = true
      badge.earnedDate = new Date().toISOString()
      this.showBadgeNotification(badge)
    }
    
    this.saveBadges(badges)
    return true
  }

  // Show badge notification
  private showBadgeNotification(badge: BadgeProgress) {
    if (typeof window === 'undefined') return
    
    // Create notification element
    const notification = document.createElement('div')
    notification.className = 'fixed top-4 right-4 z-50 bg-gradient-to-r from-green-500 to-emerald-500 text-white p-4 rounded-lg shadow-lg border border-green-400/50 animate-fade-in-down'
    notification.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
          <span class="text-lg">🏆</span>
        </div>
        <div>
          <h4 class="font-semibold">Badge Earned!</h4>
          <p class="text-sm opacity-90">${badge.name}</p>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" class="text-white/80 hover:text-white ml-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    `
    
    document.body.appendChild(notification)
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove()
      }
    }, 5000)
  }

  // Track specific actions
  trackAction(action: string, _data?: unknown) {
    switch (action) {
      case 'offer_claimed':
        this.awardBadge('first_offer')
        this.updateProgress('offer_master')
        this.updateProgress('deal_legend')
        break
        
      case 'ai_chat_used':
        this.awardBadge('chat_starter')
        this.updateProgress('chat_enthusiast')
        break
        
      case 'discover_page_visited':
        this.awardBadge('browser')
        break
        
      case 'secret_menu_unlocked':
        this.awardBadge('secret_seeker')
        this.updateProgress('secret_master')
        break
        
      case 'business_visited':
        this.updateProgress('local_expert')
        break
        
      case 'share_completed':
        this.updateProgress('social_sharer')
        break
        
      case 'early_morning_use':
        const hour = new Date().getHours()
        if (hour < 6) {
          this.updateProgress('early_bird')
        }
        break
        
      case 'late_night_use':
        const lateHour = new Date().getHours()
        if (lateHour >= 0 && lateHour < 6) {
          this.awardBadge('night_owl')
        }
        break
    }
  }
}

// Global instance
let globalTracker: SimpleBadgeTracker | null = null

export function getBadgeTracker(userId?: string): SimpleBadgeTracker {
  if (!globalTracker || (userId && globalTracker['userId'] !== userId)) {
    globalTracker = new SimpleBadgeTracker(userId)
  }
  return globalTracker
}
