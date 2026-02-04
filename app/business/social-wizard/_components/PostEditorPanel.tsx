/**
 * POST EDITOR PANEL (CENTER)
 * Variant picker, caption editor, hashtag editor, visual canvas, actions
 */

'use client'

import { useSocialWizardStore } from '@/lib/social-wizard/store'
import { Copy, Download, Save, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { VisualCanvas } from './VisualCanvas'
import { TextStylePanel } from './TextStylePanel'

export function PostEditorPanel() {
  const {
    businessId,
    variants,
    selectedVariantIndex,
    currentDraft,
    selectVariant,
    updateCaption,
    updateHashtags
  } = useSocialWizardStore()

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  const hasVariants = variants.length > 0

  async function handleSave() {
    setSaveStatus('saving')
    try {
      const response = await fetch('/api/social/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: businessId,
          caption: currentDraft.caption,
          hashtags: currentDraft.hashtags,
          template_id: currentDraft.template_id,
          media_url: currentDraft.media_url
        })
      })

      if (!response.ok) throw new Error('Failed to save')

      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err) {
      console.error('Save error:', err)
      setSaveStatus('idle')
    }
  }

  function handleCopyCaption() {
    const fullText = `${currentDraft.caption}\n\n${currentDraft.hashtags.join(' ')}`
    navigator.clipboard.writeText(fullText)
  }

  function handleHashtagsChange(value: string) {
    const tags = value.split(' ').filter(t => t.trim().length > 0)
    updateHashtags(tags)
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-bold">Post Editor</h2>

      {/* Variant Picker */}
      {hasVariants && variants.length > 1 && (
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-neutral-300">
              Variant {selectedVariantIndex + 1} of {variants.length}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => selectVariant(Math.max(0, selectedVariantIndex - 1))}
                disabled={selectedVariantIndex === 0}
                className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => selectVariant(Math.min(variants.length - 1, selectedVariantIndex + 1))}
                disabled={selectedVariantIndex === variants.length - 1}
                className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            {variants.map((_, index) => (
              <button
                key={index}
                onClick={() => selectVariant(index)}
                className={`flex-1 py-2 text-xs font-medium rounded transition-colors ${
                  selectedVariantIndex === index
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                }`}
              >
                {String.fromCharCode(65 + index)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Visual Canvas */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
        <VisualCanvas />
      </div>

      {/* Text Style Controls */}
      <TextStylePanel />

      {/* Caption Editor */}
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          Caption
        </label>
        <textarea
          value={currentDraft.caption}
          onChange={(e) => updateCaption(e.target.value)}
          placeholder="Write your caption here..."
          className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 min-h-[120px]"
        />
        <div className="mt-1 text-xs text-neutral-500">
          {currentDraft.caption.length} characters
        </div>
      </div>

      {/* Hashtag Editor */}
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          Hashtags
        </label>
        <input
          type="text"
          value={currentDraft.hashtags.join(' ')}
          onChange={(e) => handleHashtagsChange(e.target.value)}
          placeholder="#hashtag #another"
          className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={!currentDraft.caption || saveStatus === 'saving'}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
        >
          <Save className="w-5 h-5" />
          {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save Draft'}
        </button>
        <button
          onClick={handleCopyCaption}
          disabled={!currentDraft.caption}
          className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <Copy className="w-5 h-5" />
          Copy
        </button>
        <button
          disabled={!currentDraft.caption}
          className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <Download className="w-5 h-5" />
          Download
        </button>
      </div>
    </div>
  )
}
