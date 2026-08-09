'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { BusinessCRMData } from '@/types/billing'
import {
  OFFER_CLAIM_AMOUNT_OPTIONS,
  OFFER_TYPE_OPTIONS,
  type MenuPreviewItem,
} from '@/types/profiles'
import { getFeaturedItemsLabels } from '@/lib/utils/featured-items-labels'
import { resolveSystemCategory } from '@/lib/utils/resolve-system-category'
import { OfferMediaManager } from '@/components/admin/offer-media-manager'
import { getMaxSecretMenuItems } from '@/lib/utils/tier-limits'
import { getBusinessImage } from '@/lib/home-feed/ranking'

interface CrmOffer {
  id: string
  offer_name: string
  offer_type?: string
  offer_value?: string
  offer_claim_amount?: string
  offer_description?: string | null
  offer_terms?: string | null
  offer_start_date?: string | null
  offer_end_date?: string | null
  offer_image?: string | null
  activation_window_minutes?: number | null
  status?: string
}

interface OfferDisplayImage {
  src: string | null
  /** True when showing dedicated offer_image; false when falling back to business/placeholder */
  isDedicated: boolean
  sourceLabel: string
}

function resolveOfferDisplayImage(
  offer: CrmOffer,
  business: BusinessCRMData
): OfferDisplayImage {
  if (offer.offer_image) {
    return {
      src: offer.offer_image,
      isDedicated: true,
      sourceLabel: 'Offer image',
    }
  }

  const { image } = getBusinessImage(
    business.business_images,
    business.logo,
    business.system_category,
    business.id,
    business.placeholder_variant,
    business.placeholder_custom_url
  )

  if (business.business_images?.[0]) {
    return {
      src: image,
      isDedicated: false,
      sourceLabel: 'Business photo (fallback)',
    }
  }
  if (business.placeholder_custom_url) {
    return {
      src: image,
      isDedicated: false,
      sourceLabel: 'Custom placeholder (fallback)',
    }
  }
  if (image) {
    return {
      src: image,
      isDedicated: false,
      sourceLabel: 'Category placeholder (fallback)',
    }
  }
  if (business.logo) {
    return {
      src: business.logo,
      isDedicated: false,
      sourceLabel: 'Logo (fallback)',
    }
  }

  return { src: null, isDedicated: false, sourceLabel: 'No image' }
}

function OfferImagePreview({
  src,
  alt,
  size = 'md',
}: {
  src?: string | null
  alt: string
  size?: 'sm' | 'md'
}) {
  // Fixed square thumbnail — never stretch to full form width
  const box = size === 'sm' ? 'h-14 w-14' : 'h-24 w-24'

  if (!src) {
    return (
      <div
        className={`${box} shrink-0 rounded-lg border border-dashed border-slate-600 bg-slate-900/50 flex items-center justify-center text-slate-500 text-[10px] text-center px-1`}
      >
        No image
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- admin preview of Cloudinary/external offer art
    <img
      src={src}
      alt={alt}
      className={`${box} shrink-0 rounded-lg border border-slate-600 object-cover bg-slate-900`}
    />
  )
}

interface SecretMenuItem {
  itemName: string
  description?: string
  price?: string
  image_url?: string
  ordering_instructions?: string
  created_at?: string
  status?: string
  approved_at?: string
}

interface OfferFormState {
  offer_name: string
  offer_type: string
  offer_value: string
  offer_claim_amount: string
  offer_description: string
  offer_terms: string
  offer_start_date: string
  offer_end_date: string
  activation_window_minutes: 30 | 60 | 120
}

interface CrmOffersContentTabProps {
  business: BusinessCRMData
  onDeleteOffer: (offer: CrmOffer) => void
  onRefresh: () => void
}

const WINDOW_OPTIONS: Array<{ value: 30 | 60 | 120; label: string; tip: string }> = [
  { value: 30, label: '30 minutes', tip: 'Drinks, takeaway, quick checkout' },
  { value: 60, label: '60 minutes', tip: 'Default — most cafés / casual' },
  { value: 120, label: '120 minutes', tip: 'Sit-down meals' },
]

function toDateInput(value?: string | null): string {
  if (!value) return ''
  return value.slice(0, 10)
}

function offerToForm(offer: CrmOffer): OfferFormState {
  const window = offer.activation_window_minutes
  return {
    offer_name: offer.offer_name || '',
    offer_type: offer.offer_type || '',
    offer_value: offer.offer_value || '',
    offer_claim_amount: offer.offer_claim_amount || 'single',
    offer_description: offer.offer_description || '',
    offer_terms: offer.offer_terms || '',
    offer_start_date: toDateInput(offer.offer_start_date),
    offer_end_date: toDateInput(offer.offer_end_date),
    activation_window_minutes:
      window === 30 || window === 60 || window === 120 ? window : 60,
  }
}

function emptyFeaturedItem(): MenuPreviewItem {
  return { name: '', price: '', description: '' }
}

function emptySecretItem(): SecretMenuItem {
  return { itemName: '', description: '', price: '' }
}

export function CrmOffersContentTab({
  business,
  onDeleteOffer,
  onRefresh,
}: CrmOffersContentTabProps) {
  const approvedOffers = useMemo(
    () =>
      ((business.business_offers || []) as CrmOffer[]).filter(
        (offer) => offer.status === 'approved'
      ),
    [business.business_offers]
  )

  const labels = getFeaturedItemsLabels(resolveSystemCategory(business))
  const tier =
    business.status === 'claimed_free' ? 'claimed_free' : (business.plan || 'starter')
  const secretLimit = getMaxSecretMenuItems(tier)

  const [editingOfferId, setEditingOfferId] = useState<string | null>(null)
  const [offerForm, setOfferForm] = useState<OfferFormState | null>(null)
  const [offerSaving, setOfferSaving] = useState(false)
  const [offerError, setOfferError] = useState<string | null>(null)
  const [offerMediaTarget, setOfferMediaTarget] = useState<{
    offerId: string
    offerName: string
  } | null>(null)

  const [featuredItems, setFeaturedItems] = useState<MenuPreviewItem[]>(
    () =>
      (business.menu_preview && business.menu_preview.length > 0
        ? business.menu_preview
        : []) as MenuPreviewItem[]
  )
  const [featuredEditing, setFeaturedEditing] = useState(false)
  const [featuredSaving, setFeaturedSaving] = useState(false)
  const [featuredError, setFeaturedError] = useState<string | null>(null)
  const [featuredMessage, setFeaturedMessage] = useState<string | null>(null)

  const [secretItems, setSecretItems] = useState<SecretMenuItem[]>(
    () => business.secret_menu_items || []
  )
  const [secretEditing, setSecretEditing] = useState(false)
  const [secretSaving, setSecretSaving] = useState(false)
  const [secretError, setSecretError] = useState<string | null>(null)
  const [secretMessage, setSecretMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!featuredEditing) {
      setFeaturedItems((business.menu_preview || []) as MenuPreviewItem[])
    }
  }, [business.menu_preview, featuredEditing])

  useEffect(() => {
    if (!secretEditing) {
      setSecretItems(business.secret_menu_items || [])
    }
  }, [business.secret_menu_items, secretEditing])

  const startEditOffer = (offer: CrmOffer) => {
    setEditingOfferId(offer.id)
    setOfferForm(offerToForm(offer))
    setOfferError(null)
  }

  const cancelEditOffer = () => {
    setEditingOfferId(null)
    setOfferForm(null)
    setOfferError(null)
  }

  const saveOffer = async () => {
    if (!editingOfferId || !offerForm) return
    setOfferSaving(true)
    setOfferError(null)
    try {
      const res = await fetch('/api/admin/offers/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId: editingOfferId,
          ...offerForm,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body.success) {
        throw new Error(body.error || 'Failed to update offer')
      }
      cancelEditOffer()
      onRefresh()
    } catch (e) {
      setOfferError(e instanceof Error ? e.message : 'Failed to update offer')
    } finally {
      setOfferSaving(false)
    }
  }

  const startFeaturedEdit = () => {
    setFeaturedItems(
      (business.menu_preview && business.menu_preview.length > 0
        ? business.menu_preview.map((item) => ({ ...item }))
        : [emptyFeaturedItem()]) as MenuPreviewItem[]
    )
    setFeaturedEditing(true)
    setFeaturedError(null)
    setFeaturedMessage(null)
  }

  const saveFeatured = async () => {
    setFeaturedSaving(true)
    setFeaturedError(null)
    setFeaturedMessage(null)
    try {
      const payload = featuredItems
        .map((item) => ({
          name: item.name.trim(),
          price: item.price?.trim() || '',
          description: item.description?.trim() || '',
          image_url: item.image_url || '',
        }))
        .filter((item) => item.name)

      const res = await fetch('/api/admin/businesses/menu-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
          menu_preview: payload,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body.success) {
        throw new Error(body.error || 'Failed to save featured items')
      }
      setFeaturedItems(body.menu_preview || payload)
      setFeaturedEditing(false)
      setFeaturedMessage('Featured items saved')
      onRefresh()
    } catch (e) {
      setFeaturedError(e instanceof Error ? e.message : 'Failed to save featured items')
    } finally {
      setFeaturedSaving(false)
    }
  }

  const startSecretEdit = () => {
    setSecretItems(
      business.secret_menu_items && business.secret_menu_items.length > 0
        ? business.secret_menu_items.map((item) => ({ ...item }))
        : [emptySecretItem()]
    )
    setSecretEditing(true)
    setSecretError(null)
    setSecretMessage(null)
  }

  const saveSecret = async () => {
    setSecretSaving(true)
    setSecretError(null)
    setSecretMessage(null)
    try {
      const payload = secretItems
        .map((item) => ({
          ...item,
          itemName: item.itemName.trim(),
          description: item.description?.trim() || '',
          price: item.price?.trim() || '',
        }))
        .filter((item) => item.itemName)

      const res = await fetch('/api/admin/businesses/secret-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
          secret_menu_items: payload,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body.success) {
        throw new Error(body.error || 'Failed to save secret menu')
      }
      setSecretItems(body.secret_menu_items || payload)
      setSecretEditing(false)
      setSecretMessage('Secret menu saved')
      onRefresh()
    } catch (e) {
      setSecretError(e instanceof Error ? e.message : 'Failed to save secret menu')
    } finally {
      setSecretSaving(false)
    }
  }

  const fieldClass =
    'w-full bg-slate-900/50 text-white border border-slate-600 focus:border-[#00d083] rounded-lg px-3 py-2 text-sm'

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Offers & Content</h3>

      {/* Offers */}
      {approvedOffers.length > 0 ? (
        <div className="space-y-3">
          {approvedOffers.map((offer, index) => {
            const isEditing = editingOfferId === offer.id && offerForm
            const displayImage = resolveOfferDisplayImage(offer, business)
            return (
              <Card
                key={offer.id || index}
                className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border-yellow-700/30"
              >
                <CardContent className="p-4 space-y-3">
                  {!isEditing ? (
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <OfferImagePreview
                          src={displayImage.src}
                          alt={offer.offer_name}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <h4 className="text-yellow-300 font-semibold">{offer.offer_name}</h4>
                          <p className="text-slate-300 text-sm mt-1">
                            {offer.offer_type?.replace('_', ' ').toUpperCase()}
                          </p>
                          <p className="text-orange-300 text-sm font-medium">{offer.offer_value}</p>
                          {offer.offer_terms && (
                            <p className="text-slate-400 text-sm mt-2">{offer.offer_terms}</p>
                          )}
                          <p className="text-slate-500 text-xs mt-2">
                            Wallet after Redeem:{' '}
                            {offer.activation_window_minutes || 60} min
                          </p>
                        </div>
                      </div>
                      <div className="text-right space-y-2 shrink-0">
                        <div className="bg-green-500/20 text-green-400 text-sm font-medium px-3 py-1 rounded-full border border-green-500/30 inline-block">
                          Active
                        </div>
                        {offer.offer_end_date && (
                          <div className="text-slate-400 text-xs">
                            Ends:{' '}
                            {new Date(offer.offer_end_date).toLocaleDateString('en-GB', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                            })}
                          </div>
                        )}
                        <div className="flex flex-col gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-slate-500 text-slate-200 hover:bg-slate-700 text-xs"
                            onClick={() => startEditOffer(offer)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white text-xs"
                            onClick={() => onDeleteOffer(offer)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
                        <Label className="text-slate-300 text-xs">Offer image</Label>
                        <div className="mt-2 flex items-start gap-3">
                          <OfferImagePreview
                            src={displayImage.src}
                            alt={offerForm.offer_name || offer.offer_name}
                            size="md"
                          />
                          <div className="space-y-2 min-w-0">
                            <p
                              className={`text-xs ${
                                displayImage.isDedicated
                                  ? 'text-green-400'
                                  : 'text-amber-300/90'
                              }`}
                            >
                              {displayImage.sourceLabel}
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="border-purple-500/50 text-purple-200 hover:bg-purple-500/20 text-xs"
                              onClick={() =>
                                setOfferMediaTarget({
                                  offerId: offer.id,
                                  offerName: offerForm.offer_name || offer.offer_name,
                                })
                              }
                            >
                              {displayImage.isDedicated ? 'Change image' : 'Set dedicated offer image'}
                            </Button>
                          </div>
                        </div>
                        <p className="text-slate-500 text-xs mt-2">
                          {displayImage.isDedicated
                            ? 'Opens the image library / framing editor. Preview updates after you save there.'
                            : 'Consumers currently see this business/placeholder photo. Set a dedicated offer image to override.'}
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-slate-300 text-xs">Offer name</Label>
                          <Input
                            className={fieldClass}
                            value={offerForm.offer_name}
                            onChange={(e) =>
                              setOfferForm({ ...offerForm, offer_name: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-slate-300 text-xs">Offer value</Label>
                          <Input
                            className={fieldClass}
                            value={offerForm.offer_value}
                            onChange={(e) =>
                              setOfferForm({ ...offerForm, offer_value: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-slate-300 text-xs">Type</Label>
                          <select
                            className={fieldClass}
                            value={offerForm.offer_type}
                            onChange={(e) =>
                              setOfferForm({ ...offerForm, offer_type: e.target.value })
                            }
                          >
                            <option value="">Select type</option>
                            {OFFER_TYPE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label className="text-slate-300 text-xs">Claim amount</Label>
                          <select
                            className={fieldClass}
                            value={offerForm.offer_claim_amount}
                            onChange={(e) =>
                              setOfferForm({
                                ...offerForm,
                                offer_claim_amount: e.target.value,
                              })
                            }
                          >
                            {OFFER_CLAIM_AMOUNT_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label className="text-slate-300 text-xs">Start date</Label>
                          {offerForm.offer_start_date ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="date"
                                className={fieldClass}
                                value={offerForm.offer_start_date}
                                onChange={(e) =>
                                  setOfferForm({
                                    ...offerForm,
                                    offer_start_date: e.target.value,
                                  })
                                }
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="border-slate-600 text-slate-300 text-xs shrink-0"
                                onClick={() =>
                                  setOfferForm({ ...offerForm, offer_start_date: '' })
                                }
                              >
                                Clear
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500 text-sm px-3 py-2 rounded-lg border border-dashed border-slate-600 bg-slate-900/30 grow">
                                Not set
                              </span>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="border-slate-600 text-slate-300 text-xs shrink-0"
                                onClick={() =>
                                  setOfferForm({
                                    ...offerForm,
                                    // Only set a date when admin explicitly chooses one
                                    offer_start_date: new Date().toISOString().slice(0, 10),
                                  })
                                }
                              >
                                Set date
                              </Button>
                            </div>
                          )}
                        </div>
                        <div>
                          <Label className="text-slate-300 text-xs">End date</Label>
                          {offerForm.offer_end_date ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="date"
                                className={fieldClass}
                                value={offerForm.offer_end_date}
                                onChange={(e) =>
                                  setOfferForm({
                                    ...offerForm,
                                    offer_end_date: e.target.value,
                                  })
                                }
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="border-slate-600 text-slate-300 text-xs shrink-0"
                                onClick={() =>
                                  setOfferForm({ ...offerForm, offer_end_date: '' })
                                }
                              >
                                Clear
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500 text-sm px-3 py-2 rounded-lg border border-dashed border-slate-600 bg-slate-900/30 grow">
                                Not set
                              </span>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="border-slate-600 text-slate-300 text-xs shrink-0"
                                onClick={() =>
                                  setOfferForm({
                                    ...offerForm,
                                    offer_end_date: new Date().toISOString().slice(0, 10),
                                  })
                                }
                              >
                                Set date
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-slate-500 text-xs -mt-1">
                        Dates are optional — leave as Not set for open-ended offers.
                      </p>
                      <div>
                        <Label className="text-slate-300 text-xs">Description</Label>
                        <textarea
                          className={`${fieldClass} min-h-[70px]`}
                          value={offerForm.offer_description}
                          onChange={(e) =>
                            setOfferForm({
                              ...offerForm,
                              offer_description: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-slate-300 text-xs">Terms</Label>
                        <textarea
                          className={`${fieldClass} min-h-[70px]`}
                          value={offerForm.offer_terms}
                          onChange={(e) =>
                            setOfferForm({ ...offerForm, offer_terms: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-slate-300 text-xs">
                          How long it stays on the customer&apos;s Wallet after they tap Redeem
                        </Label>
                        <select
                          className={fieldClass}
                          value={offerForm.activation_window_minutes}
                          onChange={(e) =>
                            setOfferForm({
                              ...offerForm,
                              activation_window_minutes: Number(e.target.value) as
                                | 30
                                | 60
                                | 120,
                            })
                          }
                        >
                          {WINDOW_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label} — {opt.tip}
                            </option>
                          ))}
                        </select>
                        <p className="text-slate-500 text-xs mt-1">
                          Stored now for Save/Redeem. Live wallet still uses the current 12h
                          path until that ships.
                        </p>
                      </div>
                      {offerError && (
                        <p className="text-red-400 text-sm">{offerError}</p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-[#00d083] text-black hover:bg-[#00b872]"
                          disabled={offerSaving}
                          onClick={() => void saveOffer()}
                        >
                          {offerSaving ? 'Saving…' : 'Save offer'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-600 text-slate-300"
                          disabled={offerSaving}
                          onClick={cancelEditOffer}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="bg-slate-800/30 border-slate-700 border-dashed">
          <CardContent className="p-6 text-center">
            <div className="text-slate-400 mb-2">No active offers</div>
            <div className="text-slate-500 text-sm">
              Encourage business to create their first offer
            </div>
          </CardContent>
        </Card>
      )}

      {/* Featured items */}
      <Card className="bg-slate-800/30 border-slate-700">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-white text-sm">{labels.sectionTitle}</CardTitle>
            {!featuredEditing ? (
              <Button
                size="sm"
                variant="outline"
                className="border-slate-500 text-slate-200 text-xs"
                onClick={startFeaturedEdit}
              >
                {featuredItems.length > 0 ? 'Edit' : 'Add'}
              </Button>
            ) : null}
          </div>
          <p className="text-slate-500 text-xs">{labels.sectionSubtitle} · max 5</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {!featuredEditing ? (
            featuredItems.length > 0 ? (
              <div className="space-y-2">
                {featuredItems.map((item, i) => (
                  <div
                    key={`${item.name}-${i}`}
                    className="rounded-lg border border-slate-700/60 bg-slate-900/40 px-3 py-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-white text-sm font-medium">{item.name}</p>
                      {item.price ? (
                        <p className="text-[#00d083] text-sm shrink-0">{item.price}</p>
                      ) : null}
                    </div>
                    {item.description ? (
                      <p className="text-slate-400 text-xs mt-1">{item.description}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">{labels.emptyBody}</p>
            )
          ) : (
            <div className="space-y-3">
              {featuredItems.map((item, index) => (
                <div
                  key={index}
                  className="space-y-2 rounded-lg border border-slate-700 p-3"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Input
                      className={fieldClass}
                      placeholder="Name"
                      value={item.name}
                      onChange={(e) => {
                        const next = [...featuredItems]
                        next[index] = { ...next[index], name: e.target.value }
                        setFeaturedItems(next)
                      }}
                    />
                    <Input
                      className={fieldClass}
                      placeholder="Price"
                      value={item.price || ''}
                      onChange={(e) => {
                        const next = [...featuredItems]
                        next[index] = { ...next[index], price: e.target.value }
                        setFeaturedItems(next)
                      }}
                    />
                  </div>
                  <Input
                    className={fieldClass}
                    placeholder="Description"
                    value={item.description || ''}
                    onChange={(e) => {
                      const next = [...featuredItems]
                      next[index] = { ...next[index], description: e.target.value }
                      setFeaturedItems(next)
                    }}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-600/50 text-red-300 text-xs"
                    onClick={() =>
                      setFeaturedItems(featuredItems.filter((_, i) => i !== index))
                    }
                  >
                    Remove
                  </Button>
                </div>
              ))}
              {featuredItems.length < 5 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-600 text-slate-300 text-xs"
                  onClick={() => setFeaturedItems([...featuredItems, emptyFeaturedItem()])}
                >
                  Add item ({featuredItems.length}/5)
                </Button>
              )}
              {featuredError && <p className="text-red-400 text-sm">{featuredError}</p>}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-[#00d083] text-black hover:bg-[#00b872]"
                  disabled={featuredSaving}
                  onClick={() => void saveFeatured()}
                >
                  {featuredSaving ? 'Saving…' : 'Save featured items'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-600 text-slate-300"
                  disabled={featuredSaving}
                  onClick={() => {
                    setFeaturedEditing(false)
                    setFeaturedItems((business.menu_preview || []) as MenuPreviewItem[])
                    setFeaturedError(null)
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
          {featuredMessage && !featuredEditing && (
            <p className="text-green-400 text-xs">{featuredMessage}</p>
          )}
        </CardContent>
      </Card>

      {/* Secret menu */}
      <Card className="bg-slate-800/30 border-slate-700">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              Secret Menu Items ({secretItems.length}
              {secretLimit > 0 ? ` / ${secretLimit}` : ''})
            </CardTitle>
            {!secretEditing ? (
              <Button
                size="sm"
                variant="outline"
                className="border-slate-500 text-slate-200 text-xs"
                onClick={startSecretEdit}
              >
                {secretItems.length > 0 ? 'Edit' : 'Add'}
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!secretEditing ? (
            secretItems.length > 0 ? (
              <div className="space-y-2">
                {secretItems.map((item, i) => (
                  <div
                    key={`${item.itemName}-${i}`}
                    className="rounded-lg border border-indigo-700/40 bg-indigo-950/20 px-3 py-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-indigo-200 text-sm font-medium">{item.itemName}</p>
                      {item.price ? (
                        <p className="text-indigo-300 text-sm shrink-0">{item.price}</p>
                      ) : null}
                    </div>
                    {item.description ? (
                      <p className="text-slate-400 text-xs mt-1">{item.description}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">
                No secret menu items yet — suggest adding exclusive content
              </p>
            )
          ) : (
            <div className="space-y-3">
              {secretItems.map((item, index) => (
                <div
                  key={index}
                  className="space-y-2 rounded-lg border border-slate-700 p-3"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Input
                      className={fieldClass}
                      placeholder="Item name"
                      value={item.itemName}
                      onChange={(e) => {
                        const next = [...secretItems]
                        next[index] = { ...next[index], itemName: e.target.value }
                        setSecretItems(next)
                      }}
                    />
                    <Input
                      className={fieldClass}
                      placeholder="Price"
                      value={item.price || ''}
                      onChange={(e) => {
                        const next = [...secretItems]
                        next[index] = { ...next[index], price: e.target.value }
                        setSecretItems(next)
                      }}
                    />
                  </div>
                  <Input
                    className={fieldClass}
                    placeholder="Description"
                    value={item.description || ''}
                    onChange={(e) => {
                      const next = [...secretItems]
                      next[index] = { ...next[index], description: e.target.value }
                      setSecretItems(next)
                    }}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-600/50 text-red-300 text-xs"
                    onClick={() => setSecretItems(secretItems.filter((_, i) => i !== index))}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              {(() => {
                const allowedMax = Math.max(secretLimit, business.secret_menu_items?.length || 0)
                const canAdd = secretItems.length < allowedMax
                return (
                  <>
                    {canAdd ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-600 text-slate-300 text-xs"
                        onClick={() => setSecretItems([...secretItems, emptySecretItem()])}
                      >
                        Add item ({secretItems.length}/{allowedMax})
                      </Button>
                    ) : (
                      <p className="text-amber-400/80 text-xs">
                        {secretLimit === 0
                          ? 'This plan allows 0 secret menu items. Upgrade the business tier to add more.'
                          : `Secret menu limit for this plan is ${secretLimit} items.`}
                      </p>
                    )}
                  </>
                )
              })()}
              {secretError && <p className="text-red-400 text-sm">{secretError}</p>}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-[#00d083] text-black hover:bg-[#00b872]"
                  disabled={secretSaving}
                  onClick={() => void saveSecret()}
                >
                  {secretSaving ? 'Saving…' : 'Save secret menu'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-600 text-slate-300"
                  disabled={secretSaving}
                  onClick={() => {
                    setSecretEditing(false)
                    setSecretItems(business.secret_menu_items || [])
                    setSecretError(null)
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
          {secretMessage && !secretEditing && (
            <p className="text-green-400 text-xs">{secretMessage}</p>
          )}
        </CardContent>
      </Card>

      {offerMediaTarget && (
        <OfferMediaManager
          offerId={offerMediaTarget.offerId}
          businessId={business.id}
          offerName={offerMediaTarget.offerName}
          onClose={() => setOfferMediaTarget(null)}
          onChanged={onRefresh}
        />
      )}
    </div>
  )
}
