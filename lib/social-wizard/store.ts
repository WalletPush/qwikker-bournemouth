/**
 * SOCIAL WIZARD v1 — ZUSTAND STORE
 * 
 * Client-side state management for Social Wizard UI
 */

import { create } from 'zustand'
import { PostGoal, PostTone } from './promptBuilder'

export interface Variant {
  caption: string
  hashtags: string[]
  template: string
}

export interface Draft {
  id: string
  business_id: string
  campaign_id: string | null
  caption: string
  hashtags: string[]
  media_url: string | null
  template_id: string | null
  prompt_context: Record<string, any>
  created_by: string
  created_at: string
}

export interface SelectableSource {
  id: string
  name: string
  description?: string
}

export interface TextStyle {
  fontFamily: 'bold' | 'elegant' | 'modern' | 'playful'
  fontSize: number // 24-72
  color: string // hex color
  hasShadow: boolean
  align: 'left' | 'center' | 'right'
  strokeWidth: number // 0-3
  strokeColor: string
}

export interface BackgroundState {
  type: 'ai' | 'upload' | 'preset'
  url: string | null
  mood?: 'offer' | 'event' | 'menu' | 'general'
  isGenerating: boolean
}

export interface SocialWizardState {
  // Business context
  businessId: string
  businessName: string
  tier: string

  // Available sources (fetched from API)
  availableOffers: SelectableSource[]
  availableEvents: SelectableSource[]
  availableMenuItems: SelectableSource[]
  availableSecretMenuItems: SelectableSource[]

  // Selected sources
  selectedOfferId: string | null
  selectedEventId: string | null
  selectedMenuItemId: string | null
  selectedSecretMenuItemId: string | null
  includeSecretMenu: boolean

  // Generation inputs
  goal: PostGoal
  tone: PostTone
  hookTags: string[]
  pinnedSource: { type: 'offer' | 'event' | 'menu'; id: string } | null

  // Visual customization
  textStyle: TextStyle
  background: BackgroundState

  // AI generation results
  variants: Variant[]
  selectedVariantIndex: number
  isGenerating: boolean

  // Current working draft
  currentDraft: {
    caption: string
    hashtags: string[]
    media_url: string | null
    template_id: string | null
  }

  // Draft library
  drafts: Draft[]
  selectedDraftId: string | null
  searchQuery: string

  // UI state
  showVariantPicker: boolean
  canvasReady: boolean

  // Actions
  setBusinessContext: (businessId: string, businessName: string, tier: string) => void
  setAvailableSources: (sources: {
    offers: SelectableSource[]
    events: SelectableSource[]
    menuItems: SelectableSource[]
    secretMenuItems: SelectableSource[]
  }) => void
  setSelectedOfferId: (id: string | null) => void
  setSelectedEventId: (id: string | null) => void
  setSelectedMenuItemId: (id: string | null) => void
  setSelectedSecretMenuItemId: (id: string | null) => void
  setIncludeSecretMenu: (include: boolean) => void
  
  setGoal: (goal: PostGoal) => void
  setTone: (tone: PostTone) => void
  toggleHookTag: (tag: string) => void
  setPinnedSource: (source: { type: 'offer' | 'event' | 'menu'; id: string } | null) => void

  // Text style actions
  setTextStyle: (style: Partial<TextStyle>) => void
  resetTextStyle: () => void

  // Background actions
  setBackground: (background: Partial<BackgroundState>) => void
  generateAiBackground: (mood: 'offer' | 'event' | 'menu' | 'general') => Promise<void>
  setBackgroundGenerating: (isGenerating: boolean) => void
  
  setVariants: (variants: Variant[]) => void
  selectVariant: (index: number) => void
  setIsGenerating: (loading: boolean) => void

  updateCaption: (caption: string) => void
  updateHashtags: (hashtags: string[]) => void
  setMediaUrl: (url: string | null) => void
  setTemplateId: (templateId: string | null) => void

  setDrafts: (drafts: Draft[]) => void
  selectDraft: (draftId: string | null) => void
  setSearchQuery: (query: string) => void

  loadDraftIntoEditor: (draft: Draft) => void
  resetCurrentDraft: () => void
  setCanvasReady: (ready: boolean) => void
}

export const useSocialWizardStore = create<SocialWizardState>((set, get) => ({
  // Initial state
  businessId: '',
  businessName: '',
  tier: 'starter',

  availableOffers: [],
  availableEvents: [],
  availableMenuItems: [],
  availableSecretMenuItems: [],

  selectedOfferId: null,
  selectedEventId: null,
  selectedMenuItemId: null,
  selectedSecretMenuItemId: null,
  includeSecretMenu: false,

  goal: 'general_update',
  tone: 'premium',
  hookTags: [],
  pinnedSource: null,

  // Visual customization initial state
  textStyle: {
    fontFamily: 'bold',
    fontSize: 48,
    color: '#FFFFFF',
    hasShadow: true,
    align: 'center',
    strokeWidth: 0,
    strokeColor: '#000000'
  },

  background: {
    type: 'preset',
    url: null,
    mood: 'general',
    isGenerating: false
  },

  variants: [],
  selectedVariantIndex: 0,
  isGenerating: false,

  currentDraft: {
    caption: '',
    hashtags: [],
    media_url: null,
    template_id: 'general'
  },

  drafts: [],
  selectedDraftId: null,
  searchQuery: '',

  showVariantPicker: false,
  canvasReady: false,

  // Actions
  setBusinessContext: (businessId, businessName, tier) => 
    set({ businessId, businessName, tier }),

  setAvailableSources: (sources) => set({
    availableOffers: sources.offers,
    availableEvents: sources.events,
    availableMenuItems: sources.menuItems,
    availableSecretMenuItems: sources.secretMenuItems
  }),

  setSelectedOfferId: (id) => set({ selectedOfferId: id }),
  setSelectedEventId: (id) => set({ selectedEventId: id }),
  setSelectedMenuItemId: (id) => set({ selectedMenuItemId: id }),
  setSelectedSecretMenuItemId: (id) => set({ selectedSecretMenuItemId: id }),
  setIncludeSecretMenu: (include) => set({ includeSecretMenu: include }),

  setGoal: (goal) => set({ goal }),
  setTone: (tone) => set({ tone }),

  toggleHookTag: (tag) => set((state) => ({
    hookTags: state.hookTags.includes(tag)
      ? state.hookTags.filter(t => t !== tag)
      : [...state.hookTags, tag]
  })),

  setPinnedSource: (source) => set({ pinnedSource: source }),

  // Text style actions
  setTextStyle: (style) => set((state) => ({
    textStyle: { ...state.textStyle, ...style }
  })),

  resetTextStyle: () => set({
    textStyle: {
      fontFamily: 'bold',
      fontSize: 48,
      color: '#FFFFFF',
      hasShadow: true,
      align: 'center',
      strokeWidth: 0,
      strokeColor: '#000000'
    }
  }),

  // Background actions
  setBackground: (background) => set((state) => ({
    background: { ...state.background, ...background }
  })),

  generateAiBackground: async (mood) => {
    const state = get()
    set({ background: { ...state.background, isGenerating: true } })

    try {
      const response = await fetch('/api/social/ai/background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: state.businessId,
          mood,
          tone: state.tone
        })
      })

      const data = await response.json()

      if (response.ok && data.imageUrl) {
        set({
          background: {
            type: 'ai',
            url: data.imageUrl,
            mood,
            isGenerating: false
          }
        })
      } else {
        throw new Error(data.error || 'Failed to generate background')
      }
    } catch (error) {
      console.error('Background generation failed:', error)
      set((state) => ({
        background: { ...state.background, isGenerating: false }
      }))
    }
  },

  setBackgroundGenerating: (isGenerating) => set((state) => ({
    background: { ...state.background, isGenerating }
  })),

  setVariants: (variants) => set({ 
    variants, 
    selectedVariantIndex: 0,
    showVariantPicker: variants.length > 0,
    currentDraft: {
      caption: variants[0]?.caption || '',
      hashtags: variants[0]?.hashtags || [],
      media_url: null,
      template_id: variants[0]?.template || 'general'
    }
  }),

  selectVariant: (index) => {
    const state = get()
    const variant = state.variants[index]
    if (variant) {
      set({
        selectedVariantIndex: index,
        currentDraft: {
          ...state.currentDraft,
          caption: variant.caption,
          hashtags: variant.hashtags,
          template_id: variant.template
        }
      })
    }
  },

  setIsGenerating: (isGenerating) => set({ isGenerating }),

  updateCaption: (caption) => set((state) => ({
    currentDraft: { ...state.currentDraft, caption }
  })),

  updateHashtags: (hashtags) => set((state) => ({
    currentDraft: { ...state.currentDraft, hashtags }
  })),

  setMediaUrl: (media_url) => set((state) => ({
    currentDraft: { ...state.currentDraft, media_url }
  })),

  setTemplateId: (template_id) => set((state) => ({
    currentDraft: { ...state.currentDraft, template_id }
  })),

  setDrafts: (drafts) => set({ drafts }),

  selectDraft: (draftId) => set({ selectedDraftId: draftId }),

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  loadDraftIntoEditor: (draft) => set({
    selectedDraftId: draft.id,
    currentDraft: {
      caption: draft.caption,
      hashtags: draft.hashtags,
      media_url: draft.media_url,
      template_id: draft.template_id
    },
    variants: [], // Clear variants when loading existing draft
    showVariantPicker: false
  }),

  resetCurrentDraft: () => set({
    currentDraft: {
      caption: '',
      hashtags: [],
      media_url: null,
      template_id: 'general'
    },
    variants: [],
    selectedVariantIndex: 0,
    showVariantPicker: false,
    selectedDraftId: null
  }),

  setCanvasReady: (canvasReady) => set({ canvasReady })
}))
