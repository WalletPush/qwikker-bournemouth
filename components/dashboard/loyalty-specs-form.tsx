'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CloudinaryUploader } from '@/components/ui/cloudinary-uploader'
import { STAMP_ICONS, getLoyaltyAssetFolder, applyCloudinaryStripCrop } from '@/lib/loyalty/loyalty-utils'
import type { StampIconKey } from '@/lib/loyalty/loyalty-utils'
import type { LoyaltyProgram, LoyaltyProgramFormData } from '@/lib/loyalty/loyalty-types'
import {
  Bean, Stamp, Scissors, Flame, Hamburger, Wine,
  Pizza, Star, Heart, CakeSlice, Dumbbell, PawPrint,
  ChevronRight, ChevronLeft, Loader2, CheckCircle2, AlertTriangle,
} from 'lucide-react'

const ICON_COMPONENTS: Record<string, React.ElementType> = {
  Bean, Stamp, Scissors, Flame, Hamburger, Wine,
  Pizza, Star, Heart, CakeSlice, Dumbbell, PawPrint,
}

interface LoyaltySpecsFormProps {
  profile: any
  existingProgram: LoyaltyProgram | null
  onProgramUpdate: (program: LoyaltyProgram) => void
}

const STEPS = ['Basics', 'Rewards & Rules', 'Branding', 'Terms', 'Review & Submit'] as const
type StepIndex = 0 | 1 | 2 | 3 | 4

const TIMEZONES = [
  'Europe/London',
  'Europe/Dublin',
  'Europe/Paris',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Asia/Tokyo',
  'Australia/Sydney',
]

export function LoyaltySpecsForm({ profile, existingProgram, onProgramUpdate }: LoyaltySpecsFormProps) {
  const [step, setStep] = useState<StepIndex>(0)
  const [isSaving, setIsSaving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasNoLogo, setHasNoLogo] = useState(false)
  const [hasNoStrip, setHasNoStrip] = useState(false)

  const businessName = profile?.business_name || 'Your Business'
  const businessCity = profile?.city || 'unknown'

  const [form, setForm] = useState<LoyaltyProgramFormData>({
    program_name: existingProgram?.program_name || `${businessName} Rewards`,
    type: existingProgram?.type || 'stamps',
    reward_threshold: existingProgram?.reward_threshold || 10,
    reward_description: existingProgram?.reward_description || '',
    stamp_label: existingProgram?.stamp_label || 'Stamps',
    earn_mode: existingProgram?.earn_mode || 'per_visit',
    stamp_icon: existingProgram?.stamp_icon || 'stamp',
    earn_instructions: existingProgram?.earn_instructions || '',
    redeem_instructions: existingProgram?.redeem_instructions || '',
    primary_color: existingProgram?.primary_color || '#00d083',
    background_color: existingProgram?.background_color || '#0b0f14',
    logo_url: existingProgram?.logo_url || profile?.logo || '',
    logo_description: existingProgram?.logo_description || '',
    strip_image_url: existingProgram?.strip_image_url || '',
    strip_image_description: existingProgram?.strip_image_description || '',
    terms_and_conditions: existingProgram?.terms_and_conditions || '',
    timezone: existingProgram?.timezone || 'Europe/London',
    max_earns_per_day: existingProgram?.max_earns_per_day || 1,
    min_gap_minutes: existingProgram?.min_gap_minutes ?? 30,
  })

  const updateField = useCallback(<K extends keyof LoyaltyProgramFormData>(
    key: K, value: LoyaltyProgramFormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  const saveProgress = useCallback(async () => {
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/loyalty/program/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      if (data.program) onProgramUpdate(data.program)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsSaving(false)
    }
  }, [form, onProgramUpdate])

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      await saveProgress()
      const res = await fetch('/api/loyalty/request/submit', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submit failed')
      onProgramUpdate({ ...existingProgram!, status: 'submitted' } as LoyaltyProgram)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsSubmitting(false)
    }
  }, [saveProgress, existingProgram, onProgramUpdate])

  const goNext = useCallback(async () => {
    await saveProgress()
    setStep((s) => Math.min(s + 1, 4) as StepIndex)
  }, [saveProgress])

  const goBack = useCallback(() => {
    setStep((s) => Math.max(s - 1, 0) as StepIndex)
  }, [])

  const programId = existingProgram?.id || 'new'

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-1">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-1 flex-1">
            <button
              onClick={() => setStep(i as StepIndex)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors w-full ${
                i === step
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : i < step
                  ? 'bg-zinc-800/50 text-zinc-300 border border-zinc-700/50'
                  : 'bg-zinc-900/30 text-zinc-600 border border-zinc-800/30'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                i < step ? 'bg-emerald-500/20 text-emerald-400' : i === step ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-600'
              }`}>
                {i < step ? <CheckCircle2 className="w-3 h-3" /> : i + 1}
              </span>
              <span className="hidden sm:inline truncate">{label}</span>
            </button>
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Step 0: Basics */}
      {step === 0 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-lg">Program Basics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-zinc-300">Program Name</Label>
              <Input
                value={form.program_name}
                onChange={(e) => updateField('program_name', e.target.value)}
                className="bg-zinc-800/50 border-zinc-700 text-white"
                placeholder={`${businessName} Rewards`}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Type</Label>
              <Select value={form.type} onValueChange={(v) => {
                updateField('type', v as 'stamps' | 'points')
                updateField('stamp_label', v === 'stamps' ? 'Stamps' : 'Points')
              }}>
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="stamps">Stamps</SelectItem>
                  <SelectItem value="points">Points</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-zinc-500">
                {form.type === 'stamps'
                  ? 'Collect X stamps for a reward. Simple and easy to understand.'
                  : 'Earn points per purchase. Flexible for different reward tiers.'}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Earn Mode</Label>
              <Select value={form.earn_mode} onValueChange={(v) => updateField('earn_mode', v as 'per_visit' | 'per_transaction')}>
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="per_visit">Per Visit</SelectItem>
                  <SelectItem value="per_transaction">Per Transaction</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-zinc-500">
                {form.earn_mode === 'per_visit'
                  ? 'Your customers earn 1 stamp each time they visit. Perfect for cafes, pubs, and restaurants.'
                  : 'Your customers earn 1 stamp per purchase. Great for takeaways and shops where people might buy multiple times per visit.'}
              </p>
            </div>

            {/* Stamp Icon Picker */}
            <div className="space-y-3">
              <Label className="text-zinc-300">Choose your stamp icon</Label>
              <p className="text-xs text-zinc-500">
                This is what your customers see on their rewards card in Qwikker. Pick the one that best represents your business.
              </p>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {(Object.entries(STAMP_ICONS) as [StampIconKey, typeof STAMP_ICONS[StampIconKey]][]).map(
                  ([key, { icon, label }]) => {
                    const IconComp = ICON_COMPONENTS[icon]
                    const isSelected = form.stamp_icon === key
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => updateField('stamp_icon', key)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/30'
                            : 'border-zinc-700/50 bg-zinc-800/30 hover:border-zinc-600'
                        }`}
                      >
                        {IconComp && (
                          <IconComp className={`w-5 h-5 ${isSelected ? 'text-emerald-400' : 'text-zinc-400'}`} />
                        )}
                        <span className={`text-[10px] ${isSelected ? 'text-emerald-400' : 'text-zinc-500'}`}>
                          {label}
                        </span>
                      </button>
                    )
                  }
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Rewards & Rules */}
      {step === 1 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-lg">Rewards & Rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-zinc-300">
                How many {form.stamp_label.toLowerCase()} before they get a reward?
              </Label>
              <Input
                type="number"
                min={3}
                max={50}
                value={form.reward_threshold}
                onChange={(e) => updateField('reward_threshold', parseInt(e.target.value) || 10)}
                className="bg-zinc-800/50 border-zinc-700 text-white w-24"
              />
              <p className="text-xs text-zinc-500">Most businesses use 8-12.</p>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">What do they get?</Label>
              <Input
                value={form.reward_description}
                onChange={(e) => updateField('reward_description', e.target.value)}
                className="bg-zinc-800/50 border-zinc-700 text-white"
                placeholder="e.g., Free Coffee, 20% Off Next Visit"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Earn instructions</Label>
              <Input
                value={form.earn_instructions}
                onChange={(e) => updateField('earn_instructions', e.target.value)}
                className="bg-zinc-800/50 border-zinc-700 text-white"
                placeholder={form.earn_mode === 'per_visit' ? 'Show this to staff after ordering' : 'Scan the QR code at the till after each purchase'}
              />
              <p className="text-zinc-500 text-xs">
                Customers earn stamps by scanning your QR code at the till. This text is shown on their stamp card to remind them how.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Redeem instructions</Label>
              <Input
                value={form.redeem_instructions}
                onChange={(e) => updateField('redeem_instructions', e.target.value)}
                className="bg-zinc-800/50 border-zinc-700 text-white"
                placeholder="e.g., Valid Mon-Thu. One per person."
              />
              <p className="text-xs text-zinc-500">Any restrictions? Leave empty if none.</p>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Timezone</Label>
              <Select value={form.timezone} onValueChange={(v) => updateField('timezone', v)}>
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>{tz.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-zinc-300">
                Max stamps per day: <span className="text-emerald-400 font-semibold">{form.max_earns_per_day}</span>
              </Label>
              <Slider
                value={[form.max_earns_per_day]}
                onValueChange={([v]) => updateField('max_earns_per_day', v)}
                min={1}
                max={5}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-zinc-500">
                Customers can scan your QR code up to {form.max_earns_per_day} {form.max_earns_per_day === 1 ? 'time' : 'times'} per day.
                Once they hit this limit, they&apos;ll see a &quot;come back tomorrow&quot; message with a countdown.
              </p>
            </div>

            <div className="space-y-3">
              <Label className="text-zinc-300">
                Minimum gap between stamps: <span className="text-emerald-400 font-semibold">{form.min_gap_minutes} min</span>
              </Label>
              <Slider
                value={[form.min_gap_minutes]}
                onValueChange={([v]) => updateField('min_gap_minutes', v)}
                min={0}
                max={180}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-zinc-500">
                {form.min_gap_minutes > 0
                  ? `After earning a stamp, customers must wait ${form.min_gap_minutes} minutes before scanning again. This prevents multiple scans in one visit.`
                  : 'No waiting time between scans. Customers can earn stamps back-to-back.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Branding */}
      {step === 2 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-lg">Branding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Logo */}
            <div className="space-y-3">
              <Label className="text-zinc-300">Business Logo</Label>
              <p className="text-xs text-zinc-500">
                Your business logo. If you already uploaded one to your Qwikker profile, it&apos;s pre-filled here.
              </p>
              {!hasNoLogo ? (
                <>
                  <CloudinaryUploader
                    folder={getLoyaltyAssetFolder(businessCity, programId, 'logo')}
                    onUpload={(url) => updateField('logo_url', url)}
                    currentUrl={form.logo_url || undefined}
                    label="Upload logo"
                    previewClassName="w-14 h-14"
                  />
                  <label className="flex items-center gap-2 text-sm text-zinc-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasNoLogo}
                      onChange={(e) => {
                        setHasNoLogo(e.target.checked)
                        if (e.target.checked) updateField('logo_url', '')
                      }}
                      className="rounded border-zinc-600"
                    />
                    I don&apos;t have a logo
                  </label>
                </>
              ) : (
                <div className="space-y-2">
                  <Textarea
                    value={form.logo_description}
                    onChange={(e) => updateField('logo_description', e.target.value)}
                    className="bg-zinc-800/50 border-zinc-700 text-white"
                    placeholder="Describe your logo or business so our team can help. e.g., 'We're a coffee shop called Brew & Bean with a green colour scheme'"
                    rows={3}
                  />
                  <button
                    type="button"
                    onClick={() => setHasNoLogo(false)}
                    className="text-xs text-emerald-400 hover:text-emerald-300"
                  >
                    Actually, I have a logo to upload
                  </button>
                </div>
              )}
            </div>

            {/* Strip Image */}
            <div className="space-y-3">
              <Label className="text-zinc-300">Strip Image</Label>
              <p className="text-xs text-zinc-500">
                The wide banner across the middle of your loyalty card. Think of it like a photo of your shopfront, your signature product, or a branded background.
              </p>
              <p className="text-xs text-zinc-400 bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2">
                Recommended size: <span className="font-medium text-zinc-300">1125 x 432 pixels</span>. Landscape orientation, high quality.
              </p>
              {!hasNoStrip ? (
                <>
                  <CloudinaryUploader
                    folder={getLoyaltyAssetFolder(businessCity, programId, 'strip')}
                    onUpload={(url) => updateField('strip_image_url', applyCloudinaryStripCrop(url))}
                    currentUrl={form.strip_image_url || undefined}
                    label="Upload strip image"
                    previewClassName="max-w-xs h-16 object-cover"
                  />
                  <label className="flex items-center gap-2 text-sm text-zinc-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasNoStrip}
                      onChange={(e) => {
                        setHasNoStrip(e.target.checked)
                        if (e.target.checked) updateField('strip_image_url', '')
                      }}
                      className="rounded border-zinc-600"
                    />
                    I don&apos;t have a strip image
                  </label>
                </>
              ) : (
                <div className="space-y-2">
                  <Textarea
                    value={form.strip_image_description}
                    onChange={(e) => updateField('strip_image_description', e.target.value)}
                    className="bg-zinc-800/50 border-zinc-700 text-white"
                    placeholder="Describe what you'd like. e.g., 'A photo of our coffee shop counter' or 'A flat green background with coffee beans'"
                    rows={3}
                  />
                  <button
                    type="button"
                    onClick={() => setHasNoStrip(false)}
                    className="text-xs text-emerald-400 hover:text-emerald-300"
                  >
                    Actually, I have an image to upload
                  </button>
                </div>
              )}
            </div>

            {/* Colours */}
            <p className="text-xs text-zinc-400 bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2">
              These colours appear on your customers&apos; Apple &amp; Google Wallet card. We recommend keeping it simple &mdash; white text on a dark background or black text on a light background works best.
            </p>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-zinc-300">Text Colour</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.primary_color}
                    onChange={(e) => updateField('primary_color', e.target.value)}
                    className="w-10 h-10 rounded border border-zinc-700 cursor-pointer bg-transparent"
                  />
                  <Input
                    value={form.primary_color}
                    onChange={(e) => updateField('primary_color', e.target.value)}
                    className="bg-zinc-800/50 border-zinc-700 text-white font-mono text-sm w-28"
                    maxLength={7}
                  />
                </div>
                <p className="text-xs text-zinc-500">e.g. white (#ffffff) or black (#000000)</p>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Card Background</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.background_color}
                    onChange={(e) => updateField('background_color', e.target.value)}
                    className="w-10 h-10 rounded border border-zinc-700 cursor-pointer bg-transparent"
                  />
                  <Input
                    value={form.background_color}
                    onChange={(e) => updateField('background_color', e.target.value)}
                    className="bg-zinc-800/50 border-zinc-700 text-white font-mono text-sm w-28"
                    maxLength={7}
                  />
                </div>
                <p className="text-xs text-zinc-500">e.g. dark (#0b0f14) or white (#ffffff)</p>
              </div>
            </div>

            {/* Contrast preview */}
            <div
              className="rounded-lg p-4 border border-zinc-700/50"
              style={{ backgroundColor: form.background_color }}
            >
              <p className="text-sm font-medium" style={{ color: form.primary_color }}>
                Sample Text Preview
              </p>
              <p className="text-xs mt-1 opacity-70" style={{ color: form.primary_color }}>
                This is how text looks on your card background.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Terms */}
      {step === 3 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-lg">Terms & Conditions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-zinc-300">Terms & Conditions (optional)</Label>
              <Textarea
                value={form.terms_and_conditions}
                onChange={(e) => updateField('terms_and_conditions', e.target.value)}
                className="bg-zinc-800/50 border-zinc-700 text-white"
                placeholder="One stamp per visit. Reward cannot be exchanged for cash. Qwikker reserves the right to modify or cancel this program."
                rows={5}
              />
            </div>

            <div className="p-4 bg-zinc-800/30 border border-zinc-700/50 rounded-lg">
              <p className="text-sm text-zinc-400 font-medium mb-2">Birthday Rewards</p>
              <p className="text-xs text-zinc-500">
                Birthday rewards are coming soon. When the feature launches, you&apos;ll be able to send
                a special treat to customers on their birthday automatically.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review & Submit */}
      {step === 4 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-lg">Review & Submit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <ReviewRow label="Program Name" value={form.program_name} />
              <ReviewRow label="Type" value={form.type === 'stamps' ? 'Stamps' : 'Points'} />
              <ReviewRow label="Earn Mode" value={form.earn_mode === 'per_visit' ? 'Per Visit' : 'Per Transaction'} />
              <ReviewRow
                label="Stamp Icon"
                value={STAMP_ICONS[form.stamp_icon as StampIconKey]?.label || form.stamp_icon}
              />
              <ReviewRow
                label="Reward"
                value={`Collect ${form.reward_threshold} ${form.stamp_label.toLowerCase()} to get ${form.reward_description || '...'}`}
              />
              <ReviewRow label="Max Per Day" value={`${form.max_earns_per_day}`} />
              <ReviewRow label="Min Gap" value={form.min_gap_minutes > 0 ? `${form.min_gap_minutes} minutes` : 'None'} />
              <ReviewRow label="Timezone" value={form.timezone} />

              <div className="border-t border-zinc-800 pt-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wide mb-3">Branding</p>
                <div className="flex gap-3">
                  <div
                    className="w-8 h-8 rounded border border-zinc-700"
                    style={{ backgroundColor: form.primary_color }}
                    title={`Primary: ${form.primary_color}`}
                  />
                  <div
                    className="w-8 h-8 rounded border border-zinc-700"
                    style={{ backgroundColor: form.background_color }}
                    title={`Background: ${form.background_color}`}
                  />
                </div>
                {form.logo_url && (
                  <img src={form.logo_url} alt="Logo" className="w-16 h-16 object-contain rounded mt-3 bg-zinc-800" />
                )}
                {form.logo_description && (
                  <p className="text-xs text-zinc-500 mt-2">Logo description: {form.logo_description}</p>
                )}
                {form.strip_image_url && (
                  <img
                    src={form.strip_image_url}
                    alt="Strip"
                    className="rounded mt-3"
                    style={{ maxWidth: 320, maxHeight: 80, objectFit: 'contain' }}
                  />
                )}
                {form.strip_image_description && (
                  <p className="text-xs text-zinc-500 mt-2">Strip description: {form.strip_image_description}</p>
                )}
              </div>

              {!form.strip_image_url && !form.strip_image_description && (
                <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-400">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  You haven&apos;t uploaded a strip image. Our team will help create one based on your brand.
                </div>
              )}

              {form.terms_and_conditions && (
                <div className="border-t border-zinc-800 pt-4">
                  <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Terms</p>
                  <p className="text-sm text-zinc-400 whitespace-pre-wrap">{form.terms_and_conditions}</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-zinc-800/30 border border-zinc-700/50 rounded-lg">
              <p className="text-sm text-zinc-400">
                After you submit, our team will review your specs and build your Apple & Google Wallet loyalty card.
                You&apos;ll receive an email when it&apos;s live -- usually within 24 hours.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-center items-center gap-3 pb-16">
        <Button
          variant="outline"
          onClick={goBack}
          disabled={step === 0}
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>

        {step < 4 ? (
          <Button
            onClick={goNext}
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Save & Continue
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !form.reward_description}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Submit for Review
          </Button>
        )}
      </div>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1.5">
      <span className="text-sm text-zinc-500">{label}</span>
      <span className="text-sm text-zinc-200 font-medium">{value}</span>
    </div>
  )
}
