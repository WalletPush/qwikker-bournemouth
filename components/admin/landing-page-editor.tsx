'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import Image from 'next/image'

function Toggle({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (val: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
        checked ? 'bg-[#00d083]' : 'bg-slate-600'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

interface SupporterLogo {
  name: string
  logo_url: string
}

interface LandingPageConfig {
  hero_headline?: string | null
  hero_subtitle?: string | null
  hero_image_url?: string | null
  sponsor_enabled?: boolean
  sponsor_name?: string | null
  sponsor_tagline?: string | null
  sponsor_logo_url?: string | null
  supporters_enabled?: boolean
  supporters_heading?: string | null
  supporter_logos?: SupporterLogo[] | null
  show_founding_counter?: boolean
  founding_member_total_spots?: number
  show_featured_businesses?: boolean
  featured_business_ids?: string[] | null
  show_pass_count?: boolean
}

interface BusinessOption {
  id: string
  business_name: string
  status?: string
}

interface LandingPageEditorProps {
  city: string
}

const CLOUDINARY_CLOUD = 'dsh32kke7'
const CLOUDINARY_PRESET = 'unsigned_qwikker'

async function uploadImageToCloudinary(file: File, folder: string): Promise<string | null> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', CLOUDINARY_PRESET)
  formData.append('folder', folder)

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
    { method: 'POST', body: formData }
  )

  if (!res.ok) return null
  const data = await res.json()
  return data.secure_url as string
}

export function LandingPageEditor({ city }: LandingPageEditorProps) {
  const [config, setConfig] = useState<LandingPageConfig>({})
  const [businesses, setBusinesses] = useState<BusinessOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [uploadingHero, setUploadingHero] = useState(false)
  const [uploadingSponsor, setUploadingSponsor] = useState(false)
  const [uploadingSupporterLogo, setUploadingSupporterLogo] = useState(false)
  const [newSupporterName, setNewSupporterName] = useState('')
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const heroFileRef = useRef<HTMLInputElement>(null)
  const sponsorFileRef = useRef<HTMLInputElement>(null)
  const supporterFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      try {
        const configRes = await fetch('/api/admin/landing-page')
        const configData = await configRes.json()
        if (configData.success) {
          setConfig(configData.config || {})
          setBusinesses(configData.businesses || [])
        }
      } catch {
        console.error('Failed to load landing page config')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [city])

  async function handleHeroImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingHero(true)
    const url = await uploadImageToCloudinary(file, `qwikker/landing/${city}`)
    if (url) {
      setConfig(prev => ({ ...prev, hero_image_url: url }))
    }
    setUploadingHero(false)
  }

  async function handleSponsorLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingSponsor(true)
    const url = await uploadImageToCloudinary(file, `qwikker/sponsors/${city}`)
    if (url) {
      setConfig(prev => ({ ...prev, sponsor_logo_url: url }))
    }
    setUploadingSponsor(false)
  }

  async function handleSupporterLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !newSupporterName.trim()) return

    const nameToAdd = newSupporterName.trim()
    setUploadingSupporterLogo(true)
    const url = await uploadImageToCloudinary(file, `qwikker/supporters/${city}`)
    if (url) {
      setConfig(prev => ({
        ...prev,
        supporter_logos: [...(prev.supporter_logos || []), { name: nameToAdd, logo_url: url }],
      }))
      setNewSupporterName('')
    }
    setUploadingSupporterLogo(false)
    if (supporterFileRef.current) supporterFileRef.current.value = ''
  }

  function removeSupporterLogo(index: number) {
    const current = config.supporter_logos || []
    setConfig(prev => ({
      ...prev,
      supporter_logos: current.filter((_, i) => i !== index),
    }))
  }

  function toggleFeaturedBusiness(id: string) {
    const current = config.featured_business_ids || []
    const updated = current.includes(id)
      ? current.filter(bid => bid !== id)
      : [...current, id]
    setConfig(prev => ({ ...prev, featured_business_ids: updated }))
  }

  async function handleSave() {
    setIsSaving(true)
    setSaveMessage(null)
    try {
      const res = await fetch('/api/admin/landing-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city, config }),
      })
      const data = await res.json()
      if (data.success) {
        setSaveMessage({ type: 'success', text: 'Landing page configuration saved' })
      } else {
        setSaveMessage({ type: 'error', text: data.error || 'Failed to save' })
      }
    } catch {
      setSaveMessage({ type: 'error', text: 'Network error' })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center py-12">
        <div className="animate-spin w-6 h-6 border-2 border-[#00d083] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Hero Section */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#00d083]/10">
              <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-white">Hero Section</CardTitle>
              <p className="text-sm text-slate-400 mt-1">Customise the headline, subtitle, and background image</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label className="text-slate-300">Headline</Label>
            <p className="text-xs text-slate-500">Leave blank for the default: &quot;[City], in your wallet&quot;</p>
            <Input
              value={config.hero_headline || ''}
              onChange={(e) => setConfig(prev => ({ ...prev, hero_headline: e.target.value || null }))}
              placeholder={`${city.charAt(0).toUpperCase() + city.slice(1)}, in your wallet`}
              maxLength={120}
              className="bg-slate-900 border-slate-600 text-white focus:border-[#00d083]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Subtitle</Label>
            <p className="text-xs text-slate-500">Leave blank for the default subtitle</p>
            <Input
              value={config.hero_subtitle || ''}
              onChange={(e) => setConfig(prev => ({ ...prev, hero_subtitle: e.target.value || null }))}
              placeholder="Local offers, secret menus, and dish-level recommendations..."
              maxLength={300}
              className="bg-slate-900 border-slate-600 text-white focus:border-[#00d083]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Background Image</Label>
            <p className="text-xs text-slate-500">Recommended: 1920x1080 or wider. Leave blank for the default city bokeh.</p>

            {config.hero_image_url && (
              <div className="relative w-full h-32 rounded-lg overflow-hidden border border-slate-600">
                <Image
                  src={config.hero_image_url}
                  alt="Hero preview"
                  fill
                  className="object-cover"
                />
                <button
                  onClick={() => setConfig(prev => ({ ...prev, hero_image_url: null }))}
                  className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white hover:bg-black/80"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            <input
              ref={heroFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleHeroImageUpload}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => heroFileRef.current?.click()}
              disabled={uploadingHero}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              {uploadingHero ? 'Uploading...' : config.hero_image_url ? 'Replace Image' : 'Upload Image'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sponsor Banner */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#00d083]/10">
              <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-white">Sponsor Banner</CardTitle>
              <p className="text-sm text-slate-400 mt-1">Display a sponsor strip at the bottom of your city landing page</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <Label className="text-slate-300">Enable Sponsor Banner</Label>
            <Toggle
              checked={config.sponsor_enabled || false}
              onCheckedChange={(val) => setConfig(prev => ({ ...prev, sponsor_enabled: val }))}
            />
          </div>

          {config.sponsor_enabled && (
            <>
              <div className="space-y-2">
                <Label className="text-slate-300">Sponsor Name</Label>
                <Input
                  value={config.sponsor_name || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, sponsor_name: e.target.value || null }))}
                  placeholder="Acme Corp"
                  maxLength={100}
                  className="bg-slate-900 border-slate-600 text-white focus:border-[#00d083]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Sponsor Tagline</Label>
                <Input
                  value={config.sponsor_tagline || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, sponsor_tagline: e.target.value || null }))}
                  placeholder="Proudly supporting local businesses"
                  maxLength={200}
                  className="bg-slate-900 border-slate-600 text-white focus:border-[#00d083]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Sponsor Logo</Label>
                <p className="text-xs text-slate-500">Recommended: transparent PNG, max 200px wide</p>

                {config.sponsor_logo_url && (
                  <div className="relative inline-block p-3 bg-slate-900 rounded-lg border border-slate-600">
                    <img
                      src={config.sponsor_logo_url}
                      alt="Sponsor logo preview"
                      className="h-10 w-auto"
                    />
                    <button
                      onClick={() => setConfig(prev => ({ ...prev, sponsor_logo_url: null }))}
                      className="absolute -top-1.5 -right-1.5 p-0.5 bg-red-500/80 rounded-full text-white hover:bg-red-500"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}

                <input
                  ref={sponsorFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleSponsorLogoUpload}
                />
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => sponsorFileRef.current?.click()}
                    disabled={uploadingSponsor}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    {uploadingSponsor ? 'Uploading...' : config.sponsor_logo_url ? 'Replace Logo' : 'Upload Logo'}
                  </Button>
                </div>
              </div>

              {/* Sponsor preview */}
              {(config.sponsor_name || config.sponsor_logo_url) && (
                <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                  <p className="text-xs text-slate-500 mb-2">Preview</p>
                  <div className="flex items-center justify-center gap-3 py-2">
                    {config.sponsor_logo_url && (
                      <img src={config.sponsor_logo_url} alt="" className="h-6 w-auto opacity-60" />
                    )}
                    <div className="text-center">
                      {config.sponsor_name && (
                        <p className="text-xs text-white/40">
                          Sponsored by {config.sponsor_name}
                        </p>
                      )}
                      {config.sponsor_tagline && (
                        <p className="text-[10px] text-white/25">{config.sponsor_tagline}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Supporters Section */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#00d083]/10">
              <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-white">Supporters</CardTitle>
              <p className="text-sm text-slate-400 mt-1">Show a &quot;Proudly supported by&quot; section with multiple logos</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <Label className="text-slate-300">Enable Supporters Section</Label>
            <Toggle
              checked={config.supporters_enabled || false}
              onCheckedChange={(val) => setConfig(prev => ({ ...prev, supporters_enabled: val }))}
            />
          </div>

          {config.supporters_enabled && (
            <>
              <div className="space-y-2">
                <Label className="text-slate-300">Section Heading</Label>
                <p className="text-xs text-slate-500">Leave blank for the default: &quot;Proudly supported by&quot;</p>
                <Input
                  value={config.supporters_heading || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, supporters_heading: e.target.value || null }))}
                  placeholder="Proudly supported by"
                  maxLength={100}
                  className="bg-slate-900 border-slate-600 text-white focus:border-[#00d083]"
                />
              </div>

              {/* Existing logos */}
              {(config.supporter_logos || []).length > 0 && (
                <div className="space-y-2">
                  <Label className="text-slate-300">Logos ({(config.supporter_logos || []).length})</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {(config.supporter_logos || []).map((supporter, idx) => (
                      <div
                        key={idx}
                        className="relative flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700"
                      >
                        <img
                          src={supporter.logo_url}
                          alt={supporter.name}
                          className="h-8 w-auto max-w-[80px] object-contain"
                        />
                        <span className="text-xs text-slate-400 truncate flex-1">{supporter.name}</span>
                        <button
                          onClick={() => removeSupporterLogo(idx)}
                          className="flex-shrink-0 p-0.5 bg-red-500/80 rounded-full text-white hover:bg-red-500"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add new supporter */}
              <div className="space-y-3 bg-slate-900/30 border border-slate-700/50 rounded-lg p-4">
                <p className="text-xs text-slate-400 font-medium">Add a supporter</p>
                <div className="space-y-2">
                  <Input
                    value={newSupporterName}
                    onChange={(e) => setNewSupporterName(e.target.value)}
                    placeholder="Supporter name"
                    maxLength={100}
                    className="bg-slate-900 border-slate-600 text-white focus:border-[#00d083]"
                  />
                </div>
                <input
                  ref={supporterFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleSupporterLogoUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => supporterFileRef.current?.click()}
                  disabled={uploadingSupporterLogo || !newSupporterName.trim()}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  {uploadingSupporterLogo ? 'Uploading...' : 'Upload Logo'}
                </Button>
                {!newSupporterName.trim() && (
                  <p className="text-xs text-slate-500">Enter a name first, then upload the logo</p>
                )}
              </div>

              {/* Supporters preview */}
              {(config.supporter_logos || []).length > 0 && (
                <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                  <p className="text-xs text-slate-500 mb-3">Preview</p>
                  <p className="text-[10px] uppercase tracking-widest text-white/30 text-center mb-3">
                    {config.supporters_heading || 'Proudly supported by'}
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 items-center justify-items-center">
                    {(config.supporter_logos || []).map((s, i) => (
                      <img key={i} src={s.logo_url} alt={s.name} className="h-5 max-w-[80px] w-auto object-contain opacity-50" />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Founding Member Counter */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#00d083]/10">
              <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-white">Founding Member Counter</CardTitle>
              <p className="text-sm text-slate-400 mt-1">Show &quot;Only X spots left&quot; on your city landing page</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-slate-300">Show Counter on Landing Page</Label>
              <p className="text-xs text-slate-500 mt-1">Displays remaining founding member spots to create urgency</p>
            </div>
            <Toggle
              checked={config.show_founding_counter || false}
              onCheckedChange={(val) => setConfig(prev => ({ ...prev, show_founding_counter: val }))}
            />
          </div>

          {config.show_founding_counter && (
            <div className="space-y-2">
              <Label className="text-slate-300">Total Founding Member Spots</Label>
              <p className="text-xs text-slate-500">How many founding member spots are available in total?</p>
              <Input
                type="number"
                min={1}
                max={10000}
                value={config.founding_member_total_spots || ''}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  founding_member_total_spots: parseInt(e.target.value) || 0,
                }))}
                placeholder="e.g. 150"
                className="bg-slate-900 border-slate-600 text-white focus:border-[#00d083]"
              />
              {(config.founding_member_total_spots || 0) > 0 && (
                <p className="text-xs text-slate-400">
                  The landing page will show &quot;Only X spots left&quot; based on how many businesses have already claimed a founding member spot.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Featured Businesses */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#00d083]/10">
              <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-white">Featured Businesses</CardTitle>
              <p className="text-sm text-slate-400 mt-1">Highlight specific businesses in a carousel on the landing page</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-slate-300">Show Featured Businesses</Label>
            <Toggle
              checked={config.show_featured_businesses || false}
              onCheckedChange={(val) => setConfig(prev => ({ ...prev, show_featured_businesses: val }))}
            />
          </div>

          {config.show_featured_businesses && (
            <>
              {businesses.length === 0 ? (
                <p className="text-sm text-slate-500">No approved businesses found for this city.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  <p className="text-xs text-slate-500">
                    Select businesses to feature ({(config.featured_business_ids || []).length} selected)
                  </p>
                  {businesses.map((biz) => {
                    const isSelected = (config.featured_business_ids || []).includes(biz.id)
                    return (
                      <button
                        key={biz.id}
                        onClick={() => toggleFeaturedBusiness(biz.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg border transition-colors flex items-center justify-between ${
                          isSelected
                            ? 'border-[#00d083]/40 bg-[#00d083]/10 text-white'
                            : 'border-slate-700 bg-slate-900/50 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <span className="text-sm">{biz.business_name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-500">{biz.status}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Pass Holder Count */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#00d083]/10">
              <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-white">Pass Holder Count</CardTitle>
              <p className="text-sm text-slate-400 mt-1">Show how many people have the city pass on your landing page</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-slate-300">Show Pass Holder Count</Label>
              <p className="text-xs text-slate-500 mt-1">Displays &quot;Join X people already exploring [city]&quot; on the landing page</p>
            </div>
            <Toggle
              checked={config.show_pass_count || false}
              onCheckedChange={(val) => setConfig(prev => ({ ...prev, show_pass_count: val }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      {saveMessage && (
        <div className={`text-sm px-4 py-3 rounded-lg ${
          saveMessage.type === 'success'
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {saveMessage.text}
        </div>
      )}

      <Button
        onClick={handleSave}
        disabled={isSaving || uploadingHero || uploadingSponsor || uploadingSupporterLogo}
        className="w-full bg-[#00d083] hover:bg-[#00b86f] text-white font-semibold"
      >
        {isSaving ? 'Saving...' : 'Save Landing Page Configuration'}
      </Button>
    </div>
  )
}
