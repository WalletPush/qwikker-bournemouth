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

  // Country to default timezone mapping
  const countryToTimezone: Record<string, string> = {
    // English-Speaking
    'GB': 'Europe/London',
    'US': 'America/New_York',
    'CA': 'America/Toronto',
    'AU': 'Australia/Sydney',
    'NZ': 'Pacific/Auckland',
    'IE': 'Europe/Dublin',
    'ZA': 'Africa/Johannesburg',
    'SG': 'Asia/Singapore',
    // Western Europe
    'FR': 'Europe/Paris',
    'DE': 'Europe/Berlin',
    'ES': 'Europe/Madrid',
    'IT': 'Europe/Rome',
    'PT': 'Europe/Lisbon',
    'NL': 'Europe/Amsterdam',
    'BE': 'Europe/Brussels',
    'CH': 'Europe/Zurich',
    'AT': 'Europe/Vienna',
    'LU': 'Europe/Luxembourg',
    // Northern Europe
    'SE': 'Europe/Stockholm',
    'NO': 'Europe/Oslo',
    'DK': 'Europe/Copenhagen',
    'FI': 'Europe/Helsinki',
    'IS': 'Atlantic/Reykjavik',
    // Eastern Europe
    'PL': 'Europe/Warsaw',
    'CZ': 'Europe/Prague',
    'HU': 'Europe/Budapest',
    'RO': 'Europe/Bucharest',
    'BG': 'Europe/Sofia',
    'HR': 'Europe/Zagreb',
    'SI': 'Europe/Ljubljana',
    'SK': 'Europe/Bratislava',
    'EE': 'Europe/Tallinn',
    'LV': 'Europe/Riga',
    'LT': 'Europe/Vilnius',
    // Asia-Pacific
    'JP': 'Asia/Tokyo',
    'KR': 'Asia/Seoul',
    'CN': 'Asia/Shanghai',
    'HK': 'Asia/Hong_Kong',
    'TW': 'Asia/Taipei',
    'IN': 'Asia/Kolkata',
    'TH': 'Asia/Bangkok',
    'MY': 'Asia/Kuala_Lumpur',
    'ID': 'Asia/Jakarta',
    'PH': 'Asia/Manila',
    'VN': 'Asia/Ho_Chi_Minh',
    // Middle East
    'AE': 'Asia/Dubai',
    'SA': 'Asia/Riyadh',
    'QA': 'Asia/Qatar',
    'IL': 'Asia/Jerusalem',
    'TR': 'Europe/Istanbul',
    // Americas
    'MX': 'America/Mexico_City',
    'BR': 'America/Sao_Paulo',
    'AR': 'America/Buenos_Aires',
    'CL': 'America/Santiago',
    'CO': 'America/Bogota',
    'PE': 'America/Lima',
    // Africa
    'EG': 'Africa/Cairo',
    'KE': 'Africa/Nairobi',
    'NG': 'Africa/Lagos',
    'MA': 'Africa/Casablanca'
  }

  // Auto-generate subdomain from city name
  const handleCityNameChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      city_name: value,
      subdomain: value.toLowerCase().replace(/[^a-z0-9]/g, '')
    }))
  }

  // Auto-select timezone when country changes
  const handleCountryChange = (countryCode: string) => {
    const defaultTimezone = countryToTimezone[countryCode] || 'Europe/London'
    setFormData(prev => ({
      ...prev,
      country: countryCode,
      timezone: defaultTimezone
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
                onChange={(e) => handleCountryChange(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00D083]"
              >
                {/* English-Speaking Countries */}
                <optgroup label="🌍 English-Speaking">
                  <option value="GB">🇬🇧 United Kingdom</option>
                  <option value="US">🇺🇸 United States</option>
                  <option value="CA">🇨🇦 Canada</option>
                  <option value="AU">🇦🇺 Australia</option>
                  <option value="NZ">🇳🇿 New Zealand</option>
                  <option value="IE">🇮🇪 Ireland</option>
                  <option value="ZA">🇿🇦 South Africa</option>
                  <option value="SG">🇸🇬 Singapore</option>
                </optgroup>
                
                {/* Western Europe */}
                <optgroup label="🇪🇺 Western Europe">
                  <option value="FR">🇫🇷 France</option>
                  <option value="DE">🇩🇪 Germany</option>
                  <option value="ES">🇪🇸 Spain</option>
                  <option value="IT">🇮🇹 Italy</option>
                  <option value="PT">🇵🇹 Portugal</option>
                  <option value="NL">🇳🇱 Netherlands</option>
                  <option value="BE">🇧🇪 Belgium</option>
                  <option value="CH">🇨🇭 Switzerland</option>
                  <option value="AT">🇦🇹 Austria</option>
                  <option value="LU">🇱🇺 Luxembourg</option>
                </optgroup>
                
                {/* Northern Europe */}
                <optgroup label="❄️ Northern Europe">
                  <option value="SE">🇸🇪 Sweden</option>
                  <option value="NO">🇳🇴 Norway</option>
                  <option value="DK">🇩🇰 Denmark</option>
                  <option value="FI">🇫🇮 Finland</option>
                  <option value="IS">🇮🇸 Iceland</option>
                </optgroup>
                
                {/* Eastern Europe */}
                <optgroup label="🏛️ Eastern Europe">
                  <option value="PL">🇵🇱 Poland</option>
                  <option value="CZ">🇨🇿 Czech Republic</option>
                  <option value="HU">🇭🇺 Hungary</option>
                  <option value="RO">🇷🇴 Romania</option>
                  <option value="BG">🇧🇬 Bulgaria</option>
                  <option value="HR">🇭🇷 Croatia</option>
                  <option value="SI">🇸🇮 Slovenia</option>
                  <option value="SK">🇸🇰 Slovakia</option>
                  <option value="EE">🇪🇪 Estonia</option>
                  <option value="LV">🇱🇻 Latvia</option>
                  <option value="LT">🇱🇹 Lithuania</option>
                </optgroup>
                
                {/* Asia-Pacific */}
                <optgroup label="🌏 Asia-Pacific">
                  <option value="JP">🇯🇵 Japan</option>
                  <option value="KR">🇰🇷 South Korea</option>
                  <option value="CN">🇨🇳 China</option>
                  <option value="HK">🇭🇰 Hong Kong</option>
                  <option value="TW">🇹🇼 Taiwan</option>
                  <option value="IN">🇮🇳 India</option>
                  <option value="TH">🇹🇭 Thailand</option>
                  <option value="MY">🇲🇾 Malaysia</option>
                  <option value="ID">🇮🇩 Indonesia</option>
                  <option value="PH">🇵🇭 Philippines</option>
                  <option value="VN">🇻🇳 Vietnam</option>
                </optgroup>
                
                {/* Middle East */}
                <optgroup label="🕌 Middle East">
                  <option value="AE">🇦🇪 UAE</option>
                  <option value="SA">🇸🇦 Saudi Arabia</option>
                  <option value="QA">🇶🇦 Qatar</option>
                  <option value="IL">🇮🇱 Israel</option>
                  <option value="TR">🇹🇷 Turkey</option>
                </optgroup>
                
                {/* Americas */}
                <optgroup label="🌎 Americas">
                  <option value="MX">🇲🇽 Mexico</option>
                  <option value="BR">🇧🇷 Brazil</option>
                  <option value="AR">🇦🇷 Argentina</option>
                  <option value="CL">🇨🇱 Chile</option>
                  <option value="CO">🇨🇴 Colombia</option>
                  <option value="PE">🇵🇪 Peru</option>
                </optgroup>
                
                {/* Africa */}
                <optgroup label="🦁 Africa">
                  <option value="EG">🇪🇬 Egypt</option>
                  <option value="KE">🇰🇪 Kenya</option>
                  <option value="NG">🇳🇬 Nigeria</option>
                  <option value="MA">🇲🇦 Morocco</option>
                </optgroup>
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
                {/* Europe */}
                <optgroup label="🇪🇺 Europe">
                  <option value="Europe/London">Europe/London (GMT+0)</option>
                  <option value="Europe/Dublin">Europe/Dublin (GMT+0)</option>
                  <option value="Europe/Lisbon">Europe/Lisbon (GMT+0)</option>
                  <option value="Atlantic/Reykjavik">Atlantic/Reykjavik (GMT+0)</option>
                  <option value="Europe/Paris">Europe/Paris (GMT+1)</option>
                  <option value="Europe/Berlin">Europe/Berlin (GMT+1)</option>
                  <option value="Europe/Rome">Europe/Rome (GMT+1)</option>
                  <option value="Europe/Madrid">Europe/Madrid (GMT+1)</option>
                  <option value="Europe/Amsterdam">Europe/Amsterdam (GMT+1)</option>
                  <option value="Europe/Brussels">Europe/Brussels (GMT+1)</option>
                  <option value="Europe/Luxembourg">Europe/Luxembourg (GMT+1)</option>
                  <option value="Europe/Zurich">Europe/Zurich (GMT+1)</option>
                  <option value="Europe/Vienna">Europe/Vienna (GMT+1)</option>
                  <option value="Europe/Stockholm">Europe/Stockholm (GMT+1)</option>
                  <option value="Europe/Copenhagen">Europe/Copenhagen (GMT+1)</option>
                  <option value="Europe/Oslo">Europe/Oslo (GMT+1)</option>
                  <option value="Europe/Warsaw">Europe/Warsaw (GMT+1)</option>
                  <option value="Europe/Prague">Europe/Prague (GMT+1)</option>
                  <option value="Europe/Budapest">Europe/Budapest (GMT+1)</option>
                  <option value="Europe/Zagreb">Europe/Zagreb (GMT+1)</option>
                  <option value="Europe/Ljubljana">Europe/Ljubljana (GMT+1)</option>
                  <option value="Europe/Bratislava">Europe/Bratislava (GMT+1)</option>
                  <option value="Europe/Sofia">Europe/Sofia (GMT+2)</option>
                  <option value="Europe/Helsinki">Europe/Helsinki (GMT+2)</option>
                  <option value="Europe/Tallinn">Europe/Tallinn (GMT+2)</option>
                  <option value="Europe/Riga">Europe/Riga (GMT+2)</option>
                  <option value="Europe/Vilnius">Europe/Vilnius (GMT+2)</option>
                  <option value="Europe/Bucharest">Europe/Bucharest (GMT+2)</option>
                  <option value="Europe/Athens">Europe/Athens (GMT+2)</option>
                  <option value="Europe/Istanbul">Europe/Istanbul (GMT+3)</option>
                </optgroup>
                
                {/* North America */}
                <optgroup label="🇺🇸 North America">
                  <option value="America/New_York">America/New_York (EST, GMT-5)</option>
                  <option value="America/Chicago">America/Chicago (CST, GMT-6)</option>
                  <option value="America/Denver">America/Denver (MST, GMT-7)</option>
                  <option value="America/Phoenix">America/Phoenix (MST, no DST)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST, GMT-8)</option>
                  <option value="America/Anchorage">America/Anchorage (AKST, GMT-9)</option>
                  <option value="Pacific/Honolulu">Pacific/Honolulu (HST, GMT-10)</option>
                  <option value="America/Toronto">America/Toronto (EST, GMT-5)</option>
                  <option value="America/Vancouver">America/Vancouver (PST, GMT-8)</option>
                  <option value="America/Edmonton">America/Edmonton (MST, GMT-7)</option>
                  <option value="America/Halifax">America/Halifax (AST, GMT-4)</option>
                  <option value="America/Mexico_City">America/Mexico_City (CST, GMT-6)</option>
                </optgroup>
                
                {/* South America */}
                <optgroup label="🌎 South America">
                  <option value="America/Sao_Paulo">America/Sao_Paulo (BRT, GMT-3)</option>
                  <option value="America/Buenos_Aires">America/Buenos_Aires (ART, GMT-3)</option>
                  <option value="America/Santiago">America/Santiago (CLT, GMT-3)</option>
                  <option value="America/Bogota">America/Bogota (COT, GMT-5)</option>
                  <option value="America/Lima">America/Lima (PET, GMT-5)</option>
                </optgroup>
                
                {/* Asia-Pacific */}
                <optgroup label="🌏 Asia-Pacific">
                  <option value="Asia/Tokyo">Asia/Tokyo (JST, GMT+9)</option>
                  <option value="Asia/Seoul">Asia/Seoul (KST, GMT+9)</option>
                  <option value="Asia/Shanghai">Asia/Shanghai (CST, GMT+8)</option>
                  <option value="Asia/Hong_Kong">Asia/Hong_Kong (HKT, GMT+8)</option>
                  <option value="Asia/Taipei">Asia/Taipei (CST, GMT+8)</option>
                  <option value="Asia/Singapore">Asia/Singapore (SGT, GMT+8)</option>
                  <option value="Asia/Kuala_Lumpur">Asia/Kuala_Lumpur (MYT, GMT+8)</option>
                  <option value="Asia/Manila">Asia/Manila (PHT, GMT+8)</option>
                  <option value="Asia/Bangkok">Asia/Bangkok (ICT, GMT+7)</option>
                  <option value="Asia/Jakarta">Asia/Jakarta (WIB, GMT+7)</option>
                  <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (ICT, GMT+7)</option>
                  <option value="Asia/Kolkata">Asia/Kolkata (IST, GMT+5:30)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST, GMT+4)</option>
                  <option value="Asia/Qatar">Asia/Qatar (AST, GMT+3)</option>
                  <option value="Asia/Riyadh">Asia/Riyadh (AST, GMT+3)</option>
                  <option value="Asia/Jerusalem">Asia/Jerusalem (IST, GMT+2)</option>
                </optgroup>
                
                {/* Oceania */}
                <optgroup label="🦘 Oceania">
                  <option value="Australia/Sydney">Australia/Sydney (AEDT, GMT+11)</option>
                  <option value="Australia/Melbourne">Australia/Melbourne (AEDT, GMT+11)</option>
                  <option value="Australia/Brisbane">Australia/Brisbane (AEST, GMT+10)</option>
                  <option value="Australia/Perth">Australia/Perth (AWST, GMT+8)</option>
                  <option value="Australia/Adelaide">Australia/Adelaide (ACDT, GMT+10:30)</option>
                  <option value="Pacific/Auckland">Pacific/Auckland (NZDT, GMT+13)</option>
                </optgroup>
                
                {/* Africa */}
                <optgroup label="🦁 Africa">
                  <option value="Africa/Cairo">Africa/Cairo (EET, GMT+2)</option>
                  <option value="Africa/Johannesburg">Africa/Johannesburg (SAST, GMT+2)</option>
                  <option value="Africa/Nairobi">Africa/Nairobi (EAT, GMT+3)</option>
                  <option value="Africa/Lagos">Africa/Lagos (WAT, GMT+1)</option>
                  <option value="Africa/Casablanca">Africa/Casablanca (WET, GMT+1)</option>
                </optgroup>
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

