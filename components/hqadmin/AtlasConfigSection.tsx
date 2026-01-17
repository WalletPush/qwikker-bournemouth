'use client'

import { useState } from 'react'

interface AtlasConfig {
  atlas_enabled: boolean
  mapbox_public_token: string
  mapbox_style_url: string
  atlas_min_rating: number
  atlas_max_results: number
  atlas_default_zoom: number
  atlas_pitch: number
  atlas_bearing: number
  lat: number | null
  lng: number | null
  onboarding_search_radius_m: number
  import_search_radius_m: number
  import_max_radius_m: number
}

interface Props {
  city: string
  initialConfig: Partial<AtlasConfig>
  onSave: (config: Partial<AtlasConfig>) => Promise<void>
}

export function AtlasConfigSection({ city, initialConfig, onSave }: Props) {
  const [config, setConfig] = useState<Partial<AtlasConfig>>({
    atlas_enabled: false,
    mapbox_public_token: '',
    mapbox_style_url: 'mapbox://styles/mapbox/dark-v11',
    atlas_min_rating: 4.4,
    atlas_max_results: 12,
    atlas_default_zoom: 13,
    atlas_pitch: 45,
    atlas_bearing: 0,
    onboarding_search_radius_m: 5000,
    import_search_radius_m: 10000,
    import_max_radius_m: 200000,
    ...initialConfig
  })
  
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  // Validation
  const isValid = (): { valid: boolean; message?: string } => {
    if (!config.atlas_enabled) return { valid: true }
    
    if (!config.mapbox_public_token?.trim()) {
      return { valid: false, message: 'Mapbox token required when Atlas enabled' }
    }
    
    if (!config.mapbox_style_url?.trim()) {
      return { valid: false, message: 'Mapbox style URL required' }
    }
    
    if (!config.lat || !config.lng) {
      return { valid: false, message: 'City center coordinates required' }
    }
    
    if ((config.atlas_min_rating ?? 0) < 0 || (config.atlas_min_rating ?? 0) > 5) {
      return { valid: false, message: 'Min rating must be 0-5' }
    }
    
    if ((config.atlas_max_results ?? 0) < 1 || (config.atlas_max_results ?? 0) > 50) {
      return { valid: false, message: 'Max results must be 1-50' }
    }
    
    if ((config.import_search_radius_m ?? 0) > (config.import_max_radius_m ?? 200000)) {
      return { valid: false, message: 'Import radius cannot exceed max radius' }
    }
    
    return { valid: true }
  }

  const handleTestConfig = async () => {
    setTesting(true)
    setTestResult(null)
    
    try {
      const res = await fetch(`/api/tenant/config?city=${city}`)
      const data = await res.json()
      
      setTestResult({
        ok: data.ok,
        atlasEnabled: data.atlas?.enabled,
        hasToken: !!data.atlas?.mapboxPublicToken,
        hasStyle: !!data.atlas?.styleUrl,
        center: data.center,
        message: data.message
      })
    } catch (error) {
      setTestResult({
        ok: false,
        message: error instanceof Error ? error.message : 'Test failed'
      })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    const validation = isValid()
    if (!validation.valid) {
      alert(validation.message)
      return
    }
    
    setSaving(true)
    try {
      await onSave(config)
    } finally {
      setSaving(false)
    }
  }

  const validation = isValid()

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-medium text-white">Atlas Configuration</h2>
          <p className="text-sm text-neutral-400 mt-1">
            Interactive map discovery mode. Uses franchise's own Mapbox account.
          </p>
        </div>
        
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-sm text-neutral-300">Enabled</span>
          <input
            type="checkbox"
            checked={config.atlas_enabled}
            onChange={(e) => setConfig({ ...config, atlas_enabled: e.target.checked })}
            className="w-4 h-4 text-[#00D083] bg-neutral-800 border-neutral-700 rounded focus:ring-[#00D083]"
          />
        </label>
      </div>

      {/* Validation Warning */}
      {config.atlas_enabled && !validation.valid && (
        <div className="mb-6 bg-orange-950/20 border border-orange-900/50 rounded-lg p-4">
          <p className="text-sm text-orange-400">⚠️ {validation.message}</p>
        </div>
      )}

      {/* Mapbox Credentials */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Mapbox Public Token {config.atlas_enabled && <span className="text-red-400">*</span>}
          </label>
          <input
            type="text"
            value={config.mapbox_public_token || ''}
            onChange={(e) => setConfig({ ...config, mapbox_public_token: e.target.value })}
            placeholder="pk.eyJ1Ijoi..."
            disabled={!config.atlas_enabled}
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white text-sm font-mono disabled:opacity-50"
          />
          <p className="text-xs text-neutral-500 mt-1">
            Get from <a href="https://account.mapbox.com" target="_blank" rel="noopener" className="text-[#00D083] hover:underline">Mapbox Dashboard</a>. Generous free tier (50k+ loads/month).
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Mapbox Style URL {config.atlas_enabled && <span className="text-red-400">*</span>}
          </label>
          <input
            type="text"
            value={config.mapbox_style_url || ''}
            onChange={(e) => setConfig({ ...config, mapbox_style_url: e.target.value })}
            placeholder="mapbox://styles/mapbox/dark-v11"
            disabled={!config.atlas_enabled}
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white text-sm font-mono disabled:opacity-50"
          />
        </div>
      </div>

      {/* City Center */}
      <div className="space-y-4 mb-6">
        <h3 className="text-sm font-medium text-white">City Center {config.atlas_enabled && <span className="text-red-400">*</span>}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Latitude</label>
            <input
              type="number"
              step="0.000001"
              value={config.lat || ''}
              onChange={(e) => setConfig({ ...config, lat: parseFloat(e.target.value) })}
              placeholder="50.7192"
              disabled={!config.atlas_enabled}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white text-sm disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Longitude</label>
            <input
              type="number"
              step="0.000001"
              value={config.lng || ''}
              onChange={(e) => setConfig({ ...config, lng: parseFloat(e.target.value) })}
              placeholder="-1.8808"
              disabled={!config.atlas_enabled}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white text-sm disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Map Settings */}
      <div className="space-y-4 mb-6">
        <h3 className="text-sm font-medium text-white">Map Display</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Min Rating</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={config.atlas_min_rating || 4.4}
              onChange={(e) => setConfig({ ...config, atlas_min_rating: parseFloat(e.target.value) })}
              disabled={!config.atlas_enabled}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white text-sm disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Max Results</label>
            <input
              type="number"
              min="1"
              max="50"
              value={config.atlas_max_results || 12}
              onChange={(e) => setConfig({ ...config, atlas_max_results: parseInt(e.target.value) })}
              disabled={!config.atlas_enabled}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white text-sm disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Default Zoom</label>
            <input
              type="number"
              min="1"
              max="20"
              value={config.atlas_default_zoom || 13}
              onChange={(e) => setConfig({ ...config, atlas_default_zoom: parseInt(e.target.value) })}
              disabled={!config.atlas_enabled}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white text-sm disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Pitch (3D angle)</label>
            <input
              type="number"
              min="0"
              max="60"
              value={config.atlas_pitch || 45}
              onChange={(e) => setConfig({ ...config, atlas_pitch: parseInt(e.target.value) })}
              disabled={!config.atlas_enabled}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white text-sm disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Import Radii */}
      <div className="space-y-4 mb-6">
        <h3 className="text-sm font-medium text-white">Import & Search Radii (meters)</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Onboarding</label>
            <input
              type="number"
              min="1000"
              max="200000"
              value={config.onboarding_search_radius_m || 5000}
              onChange={(e) => setConfig({ ...config, onboarding_search_radius_m: parseInt(e.target.value) })}
              disabled={!config.atlas_enabled}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white text-sm disabled:opacity-50"
            />
            <p className="text-xs text-neutral-500 mt-1">{((config.onboarding_search_radius_m || 5000) / 1609.34).toFixed(1)} mi</p>
          </div>
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Import Default</label>
            <input
              type="number"
              min="1000"
              max={config.import_max_radius_m || 200000}
              value={config.import_search_radius_m || 10000}
              onChange={(e) => setConfig({ ...config, import_search_radius_m: parseInt(e.target.value) })}
              disabled={!config.atlas_enabled}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white text-sm disabled:opacity-50"
            />
            <p className="text-xs text-neutral-500 mt-1">{((config.import_search_radius_m || 10000) / 1609.34).toFixed(1)} mi</p>
          </div>
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Import Max</label>
            <input
              type="number"
              min="1000"
              max="500000"
              value={config.import_max_radius_m || 200000}
              onChange={(e) => setConfig({ ...config, import_max_radius_m: parseInt(e.target.value) })}
              disabled={!config.atlas_enabled}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white text-sm disabled:opacity-50"
            />
            <p className="text-xs text-neutral-500 mt-1">{((config.import_max_radius_m || 200000) / 1609.34).toFixed(1)} mi</p>
          </div>
        </div>
      </div>

      {/* Test & Save */}
      <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleTestConfig}
            disabled={testing || !config.atlas_enabled}
            className="px-4 py-2 text-sm border border-neutral-700 text-white rounded hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testing ? 'Testing...' : 'Test Config'}
          </button>
          
          {testResult && (
            <div className={`text-sm ${testResult.ok ? 'text-[#00D083]' : 'text-red-400'}`}>
              {testResult.ok ? (
                <>✓ {testResult.atlasEnabled ? 'Atlas ready!' : 'Config valid (disabled)'}</>
              ) : (
                <>✗ {testResult.message || 'Test failed'}</>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || (config.atlas_enabled && !validation.valid)}
          className="px-6 py-2 bg-[#00D083] text-black rounded hover:bg-[#00D083]/90 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Atlas Config'}
        </button>
      </div>
    </div>
  )
}
