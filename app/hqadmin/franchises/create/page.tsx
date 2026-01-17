'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateFranchisePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    city_name: '',
    subdomain: '',
    country: 'GB',
    timezone: 'Europe/London',
    owner_first_name: '',
    owner_last_name: '',
    owner_email: '',
    owner_phone: '',
    send_invite: true,
    force_password_reset: true,
    // Atlas optional fields
    atlas_enabled: false,
    mapbox_public_token: '',
    mapbox_style_url: 'mapbox://styles/mapbox/dark-v11',
    atlas_min_rating: 4.4,
    atlas_max_results: 12,
    city_lat: null as number | null,
    city_lng: null as number | null
  })

  // Auto-generate subdomain from city name
  const handleCityNameChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      city_name: value,
      subdomain: value.toLowerCase().replace(/[^a-z0-9]/g, '')
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/hq/franchises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        // Success - redirect to franchise list
        router.push(`/hqadmin/franchises?created=${data.franchise.city}`)
      } else {
        setError(data.error || 'Failed to create franchise')
      }
    } catch (err) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="text-slate-400 hover:text-white mb-4 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        
        <h1 className="text-3xl font-bold text-white">Create Franchise</h1>
        <p className="text-slate-400 mt-1">
          Atomically create a new city franchise with admin credentials
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: City */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">City Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                City Name *
              </label>
              <input
                type="text"
                required
                value={formData.city_name}
                onChange={(e) => handleCityNameChange(e.target.value)}
                placeholder="e.g., Bournemouth"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00D083]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Subdomain *
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  required
                  value={formData.subdomain}
                  onChange={(e) => setFormData({ ...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  placeholder="bournemouth"
                  className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00D083]"
                />
                <span className="text-slate-400 text-sm">.qwikker.com</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Auto-generated from city name</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Country *
              </label>
              <select
                required
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00D083]"
              >
                <option value="GB">🇬🇧 United Kingdom</option>
                <option value="US">🇺🇸 United States</option>
                <option value="CA">🇨🇦 Canada</option>
                <option value="AU">🇦🇺 Australia</option>
                <option value="NZ">🇳🇿 New Zealand</option>
                <option value="IE">🇮🇪 Ireland</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Timezone *
              </label>
              <select
                required
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00D083]"
              >
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="America/Chicago">America/Chicago (CST)</option>
                <option value="America/Denver">America/Denver (MST)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                <option value="America/Toronto">America/Toronto</option>
                <option value="Australia/Sydney">Australia/Sydney</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Owner */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Owner Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                First Name *
              </label>
              <input
                type="text"
                required
                value={formData.owner_first_name}
                onChange={(e) => setFormData({ ...formData, owner_first_name: e.target.value })}
                placeholder="John"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00D083]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Last Name *
              </label>
              <input
                type="text"
                required
                value={formData.owner_last_name}
                onChange={(e) => setFormData({ ...formData, owner_last_name: e.target.value })}
                placeholder="Smith"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00D083]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.owner_email}
                onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })}
                placeholder="john@example.com"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00D083]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Phone (Optional)
              </label>
              <input
                type="tel"
                value={formData.owner_phone}
                onChange={(e) => setFormData({ ...formData, owner_phone: e.target.value })}
                placeholder="+44 7700 900000"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00D083]"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Access */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Access Settings</h2>
          
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.send_invite}
                onChange={(e) => setFormData({ ...formData, send_invite: e.target.checked })}
                className="w-4 h-4 text-[#00D083] bg-slate-800 border-slate-700 rounded focus:ring-[#00D083]"
              />
              <div>
                <span className="text-sm font-medium text-white">Send invite email</span>
                <p className="text-xs text-slate-400">Owner will receive email with setup instructions</p>
              </div>
            </label>
            
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.force_password_reset}
                onChange={(e) => setFormData({ ...formData, force_password_reset: e.target.checked })}
                className="w-4 h-4 text-[#00D083] bg-slate-800 border-slate-700 rounded focus:ring-[#00D083]"
              />
              <div>
                <span className="text-sm font-medium text-white">Force password reset on first login</span>
                <p className="text-xs text-slate-400">Recommended for security</p>
              </div>
            </label>
          </div>
        </div>

        {/* Section 4: Map & Atlas (Optional) */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Map & Atlas (Optional)</h2>
              <p className="text-sm text-slate-400 mt-1">
                Enable interactive map discovery mode. You can configure this later if needed.
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm text-slate-300">Enable</span>
              <input
                type="checkbox"
                checked={formData.atlas_enabled}
                onChange={(e) => setFormData({ ...formData, atlas_enabled: e.target.checked })}
                className="w-4 h-4 text-[#00D083] bg-slate-800 border-slate-700 rounded focus:ring-[#00D083]"
              />
            </label>
          </div>

          {formData.atlas_enabled && (
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-300">
                  <strong>About Mapbox:</strong> Mapbox includes a generous free tier (50,000+ web map loads/month). 
                  Most small cities stay free early on. Each Atlas open = 1 map load. You'll use your own Mapbox account (no central billing).
                </p>
                <a 
                  href="https://account.mapbox.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-[#00D083] hover:underline mt-2 inline-block"
                >
                  Get free Mapbox token →
                </a>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Mapbox Public Token *
                </label>
                <input
                  type="text"
                  required={formData.atlas_enabled}
                  value={formData.mapbox_public_token}
                  onChange={(e) => setFormData({ ...formData, mapbox_public_token: e.target.value })}
                  placeholder="pk.eyJ1Ijoi..."
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#00D083]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Mapbox Style URL (optional)
                </label>
                <input
                  type="text"
                  value={formData.mapbox_style_url}
                  onChange={(e) => setFormData({ ...formData, mapbox_style_url: e.target.value })}
                  placeholder="mapbox://styles/mapbox/dark-v11"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#00D083]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    City Center Latitude *
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    required={formData.atlas_enabled}
                    value={formData.city_lat || ''}
                    onChange={(e) => setFormData({ ...formData, city_lat: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="50.7192"
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00D083]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    City Center Longitude *
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    required={formData.atlas_enabled}
                    value={formData.city_lng || ''}
                    onChange={(e) => setFormData({ ...formData, city_lng: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="-1.8808"
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00D083]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Min Rating (0-5)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={formData.atlas_min_rating}
                    onChange={(e) => setFormData({ ...formData, atlas_min_rating: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00D083]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Max Results (1-50)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={formData.atlas_max_results}
                    onChange={(e) => setFormData({ ...formData, atlas_max_results: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00D083]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-[#00D083] hover:bg-[#00b86f] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Franchise'}
          </button>
        </div>
      </form>
    </div>
  )
}

