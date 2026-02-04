/**
 * TEXT STYLE PANEL
 * Controls for customizing post text appearance
 */

'use client'

import { useSocialWizardStore } from '@/lib/social-wizard/store'
import { Type, AlignLeft, AlignCenter, AlignRight, Sparkles } from 'lucide-react'

const FONT_FAMILIES = [
  { value: 'bold' as const, label: 'Bold', class: 'font-bold' },
  { value: 'elegant' as const, label: 'Elegant', class: 'font-serif' },
  { value: 'modern' as const, label: 'Modern', class: 'font-sans' },
  { value: 'playful' as const, label: 'Playful', class: 'font-mono' }
]

const COLOR_PRESETS = [
  { value: '#FFFFFF', label: 'White' },
  { value: '#000000', label: 'Black' },
  { value: '#10B981', label: 'Qwikker Green' },
  { value: '#F97316', label: 'Orange' },
  { value: '#EAB308', label: 'Gold' },
  { value: '#8B5CF6', label: 'Purple' }
]

export function TextStylePanel() {
  const { textStyle, setTextStyle, background, generateAiBackground } = useSocialWizardStore()

  return (
    <div className="space-y-4 p-4 bg-neutral-900/50 rounded-lg border border-neutral-800">
      <div className="flex items-center gap-2 mb-3">
        <Type className="w-4 h-4 text-emerald-500" />
        <h3 className="text-sm font-semibold text-neutral-200">Text Style</h3>
      </div>

      {/* Font Family */}
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-2">
          Font Style
        </label>
        <div className="grid grid-cols-2 gap-2">
          {FONT_FAMILIES.map(font => (
            <button
              key={font.value}
              onClick={() => setTextStyle({ fontFamily: font.value })}
              className={`px-3 py-2 rounded text-sm transition-colors ${
                textStyle.fontFamily === font.value
                  ? 'bg-emerald-600 text-white'
                  : 'bg-neutral-800/50 text-neutral-300 hover:bg-neutral-700/50'
              } ${font.class}`}
            >
              {font.label}
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-2">
          Size: {textStyle.fontSize}px
        </label>
        <input
          type="range"
          min="24"
          max="72"
          value={textStyle.fontSize}
          onChange={(e) => setTextStyle({ fontSize: parseInt(e.target.value) })}
          className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
        />
        <div className="flex justify-between text-xs text-neutral-500 mt-1">
          <span>24</span>
          <span>72</span>
        </div>
      </div>

      {/* Text Color */}
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-2">
          Color
        </label>
        <div className="grid grid-cols-3 gap-2">
          {COLOR_PRESETS.map(color => (
            <button
              key={color.value}
              onClick={() => setTextStyle({ color: color.value })}
              className={`h-10 rounded border-2 transition-all ${
                textStyle.color === color.value
                  ? 'border-emerald-500 scale-105'
                  : 'border-neutral-700 hover:border-neutral-600'
              }`}
              style={{ backgroundColor: color.value }}
              title={color.label}
            />
          ))}
        </div>
        
        {/* Custom Color Picker */}
        <div className="mt-2 flex items-center gap-2">
          <input
            type="color"
            value={textStyle.color}
            onChange={(e) => setTextStyle({ color: e.target.value })}
            className="w-full h-8 rounded cursor-pointer bg-neutral-800 border border-neutral-700"
          />
          <span className="text-xs text-neutral-400 font-mono">{textStyle.color}</span>
        </div>
      </div>

      {/* Text Alignment */}
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-2">
          Alignment
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setTextStyle({ align: 'left' })}
            className={`p-2 rounded flex items-center justify-center transition-colors ${
              textStyle.align === 'left'
                ? 'bg-emerald-600 text-white'
                : 'bg-neutral-800/50 text-neutral-300 hover:bg-neutral-700/50'
            }`}
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTextStyle({ align: 'center' })}
            className={`p-2 rounded flex items-center justify-center transition-colors ${
              textStyle.align === 'center'
                ? 'bg-emerald-600 text-white'
                : 'bg-neutral-800/50 text-neutral-300 hover:bg-neutral-700/50'
            }`}
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTextStyle({ align: 'right' })}
            className={`p-2 rounded flex items-center justify-center transition-colors ${
              textStyle.align === 'right'
                ? 'bg-emerald-600 text-white'
                : 'bg-neutral-800/50 text-neutral-300 hover:bg-neutral-700/50'
            }`}
          >
            <AlignRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Text Shadow Toggle */}
      <div>
        <label className="flex items-center justify-between cursor-pointer group">
          <span className="text-xs font-medium text-neutral-400 group-hover:text-neutral-300 transition-colors">
            Text Shadow
          </span>
          <input
            type="checkbox"
            checked={textStyle.hasShadow}
            onChange={(e) => setTextStyle({ hasShadow: e.target.checked })}
            className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0"
          />
        </label>
      </div>

      {/* AI Background Generator */}
      <div className="pt-4 border-t border-neutral-800">
        <label className="block text-xs font-medium text-neutral-400 mb-2">
          AI Background
        </label>
        <button
          onClick={() => generateAiBackground(background.mood || 'general')}
          disabled={background.isGenerating}
          className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:from-neutral-700 disabled:to-neutral-700 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg"
        >
          {background.isGenerating ? (
            <>
              <Sparkles className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate Background
            </>
          )}
        </button>
        {background.isGenerating && (
          <p className="text-xs text-neutral-400 mt-2 text-center">
            AI generating abstract background... (~5-10 sec)
          </p>
        )}
      </div>
    </div>
  )
}
