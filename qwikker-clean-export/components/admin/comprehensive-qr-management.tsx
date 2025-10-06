'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useElegantModal } from '@/components/ui/elegant-modal'

interface BusinessQRData {
  business_id: string
  business_name: string
  business_category: string
  status: string
  tier: string
  city: string
  business_address: string
  logo?: string
  slug: string
  
  // Universal QR assignments
  has_universal_explore: boolean
  has_universal_offers: boolean
  has_universal_secret: boolean
  
  // Dedicated QR codes
  dedicated_explore_id?: string
  dedicated_offers_id?: string
  dedicated_secret_id?: string
  dedicated_explore_url?: string
  dedicated_offers_url?: string
  dedicated_secret_url?: string
  explore_print_status?: string
  offers_print_status?: string
  secret_print_status?: string
  
  // Analytics
  universal_scans_30d: number
  dedicated_scans_30d: number
  total_scans_30d: number
}

interface ComprehensiveQRManagementProps {
  city: string
  cityDisplayName: string
}

export function ComprehensiveQRManagement({ city }: { city: string }) {
  const [businesses, setBusinesses] = useState<BusinessQRData[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'generator' | 'manage'>('generator')
  
  // QR Generator State
  const [qrCategory, setQrCategory] = useState<'qwikker-marketing' | 'static-business' | 'dynamic-business'>('qwikker-marketing')
  const [qrSubtype, setQrSubtype] = useState('')
  const [targetUrl, setTargetUrl] = useState('')
  const [selectedBusiness, setSelectedBusiness] = useState('')
  const [generating, setGenerating] = useState(false)
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessQRData | null>(null)
  const [showManageModal, setShowManageModal] = useState(false)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [generateQRType, setGenerateQRType] = useState<'explore' | 'offers' | 'secret'>('explore')
  const [filterTier, setFilterTier] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const supabase = createClientComponentClient()
  const { showSuccess, showError, showConfirm, ModalComponent } = useElegantModal()

  useEffect(() => {
    fetchBusinesses()
  }, [city, filterTier, searchQuery])

  const fetchBusinesses = async () => {
    try {
      let query = supabase
        .from('comprehensive_qr_management_view')
        .select('*')
        .eq('city', city)

      if (filterTier !== 'all') {
        query = query.eq('tier', filterTier)
      }

      if (searchQuery.trim()) {
        query = query.ilike('business_name', `%${searchQuery.trim()}%`)
      }

      const { data, error } = await query

      if (error) throw error
      setBusinesses(data || [])
    } catch (error) {
      console.error('Error fetching businesses:', error)
      showError('Failed to load business QR data')
    } finally {
      setLoading(false)
    }
  }

  const upgradeToSpotlight = async (business: BusinessQRData) => {
    const confirmed = await showConfirm(
      'Upgrade to Spotlight QR System',
      `Upgrade ${business.business_name} to dedicated QR codes? This will:\n\n• Generate unique QR codes for each type\n• Provide advanced analytics\n• Enable custom branding\n• Deactivate universal QR assignments`
    )

    if (!confirmed) return

    try {
      // First update business tier if needed
      if (business.tier !== 'spotlight') {
        const { error: tierError } = await supabase
          .from('business_profiles')
          .update({ tier: 'spotlight' })
          .eq('id', business.business_id)

        if (tierError) throw tierError
      }

      // Generate dedicated QR codes
      const { data, error } = await supabase.rpc('upgrade_business_to_dedicated_qr', {
        p_business_id: business.business_id
      })

      if (error) throw error

      showSuccess(`Successfully upgraded ${business.business_name} to dedicated QR codes!`)
      fetchBusinesses()
    } catch (error) {
      console.error('Error upgrading to dedicated QR:', error)
      showError('Failed to upgrade to dedicated QR codes')
    }
  }

  const generateDedicatedQR = async () => {
    if (!selectedBusiness || selectedBusiness.tier !== 'spotlight') return

    try {
      const qrCodeId = `${selectedBusiness.business_name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${generateQRType}-001`
      const directUrl = generateDirectUrl(selectedBusiness.slug, generateQRType, qrCodeId)

      const { error } = await supabase
        .from('dedicated_qr_codes')
        .insert({
          business_id: selectedBusiness.business_id,
          qr_code_id: qrCodeId,
          qr_type: generateQRType,
          business_tier: 'spotlight',
          direct_url: directUrl,
          logo_url: selectedBusiness.logo,
          qr_design_type: selectedBusiness.logo ? 'logo_overlay' : 'standard'
        })

      if (error) throw error

      showSuccess(`Generated dedicated ${generateQRType} QR code for ${selectedBusiness.business_name}!`)
      setShowGenerateModal(false)
      fetchBusinesses()
    } catch (error) {
      console.error('Error generating dedicated QR:', error)
      showError('Failed to generate dedicated QR code')
    }
  }

  const generateDirectUrl = (slug: string, qrType: string, qrCodeId: string): string => {
    switch (qrType) {
      case 'explore':
        return `/user/business/${slug}?qr=${qrCodeId}`
      case 'offers':
        return `/user/offers?business=${slug}&qr=${qrCodeId}`
      case 'secret':
        return `/user/secret-menu?business=${slug}&qr=${qrCodeId}`
      default:
        return `/user/dashboard?qr=${qrCodeId}`
    }
  }

  const toggleUniversalQR = async (business: BusinessQRData, qrType: 'explore' | 'offers' | 'secret', enable: boolean) => {
    try {
      if (enable) {
        // Add universal QR assignment
        const { error } = await supabase
          .from('business_qr_assignments')
          .insert({
            business_id: business.business_id,
            qr_type: qrType,
            is_active: true
          })
        
        if (error) throw error
      } else {
        // Remove universal QR assignment
        const { error } = await supabase
          .from('business_qr_assignments')
          .update({ is_active: false })
          .eq('business_id', business.business_id)
          .eq('qr_type', qrType)
          .eq('is_active', true)
        
        if (error) throw error
      }

      showSuccess(`${enable ? 'Added' : 'Removed'} universal ${qrType} QR for ${business.business_name}`)
      fetchBusinesses()
    } catch (error) {
      console.error('Error toggling universal QR:', error)
      showError('Failed to update universal QR assignment')
    }
  }

  const getQRTypeColor = (type: string) => {
    switch (type) {
      case 'explore': return 'blue'
      case 'offers': return 'orange'  
      case 'secret': return 'purple'
      default: return 'gray'
    }
  }

  const getQRTypeIcon = (type: string) => {
    switch (type) {
      case 'explore':
        return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      case 'offers':
        return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      case 'secret':
        return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      default:
        return null
    }
  }

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'spotlight':
        return <Badge className="bg-yellow-500 text-black">Spotlight</Badge>
      case 'featured':
        return <Badge className="bg-blue-500 text-white">Featured</Badge>
      case 'starter':
        return <Badge className="bg-green-500 text-white">Starter</Badge>
      default:
        return <Badge variant="secondary">Free Trial</Badge>
    }
  }

  const renderQRStatus = (business: BusinessQRData, qrType: 'explore' | 'offers' | 'secret') => {
    const hasUniversal = business[`has_universal_${qrType}` as keyof BusinessQRData] as boolean
    const dedicatedId = business[`dedicated_${qrType}_id` as keyof BusinessQRData] as string
    const printStatus = business[`${qrType}_print_status` as keyof BusinessQRData] as string

    if (dedicatedId) {
      return (
        <div className="flex items-center gap-2">
          <Badge className={`bg-${getQRTypeColor(qrType)}-500 text-white text-xs`}>
            Dedicated
          </Badge>
          <span className="text-xs text-slate-400 font-mono">{dedicatedId}</span>
          {printStatus && (
            <Badge variant="outline" className="text-xs">
              {printStatus.replace('_', ' ')}
            </Badge>
          )}
        </div>
      )
    } else if (hasUniversal) {
      return (
        <Badge className={`bg-${getQRTypeColor(qrType)}-500/20 text-${getQRTypeColor(qrType)}-300 border-${getQRTypeColor(qrType)}-500/30 text-xs`}>
          Universal
        </Badge>
      )
    } else {
      return (
        <Badge variant="secondary" className="text-xs opacity-50">
          Not Assigned
        </Badge>
      )
    }
  }

  const stats = {
    total_businesses: businesses.length,
    spotlight_businesses: businesses.filter(b => b.tier === 'spotlight').length,
    universal_assignments: businesses.filter(b => b.has_universal_explore || b.has_universal_offers || b.has_universal_secret).length,
    dedicated_qr_codes: businesses.filter(b => b.dedicated_explore_id || b.dedicated_offers_id || b.dedicated_secret_id).length,
    total_scans_30d: businesses.reduce((sum, b) => sum + b.total_scans_30d, 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00d083]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ModalComponent />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">QR Code Management System</h3>
          <p className="text-slate-400 text-sm">
            Manage both Universal and Dedicated QR codes for {cityDisplayName}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-300">
            <span className="font-semibold text-[#00d083]">{stats.spotlight_businesses}</span> Spotlight • 
            <span className="font-semibold text-blue-400 ml-1">{stats.universal_assignments}</span> Universal
          </p>
          <p className="text-sm text-slate-400">
            {stats.total_scans_30d.toLocaleString()} scans (30 days)
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-white">{stats.total_businesses}</div>
            <div className="text-slate-400 text-xs">Total Businesses</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">{stats.spotlight_businesses}</div>
            <div className="text-slate-400 text-xs">Spotlight Tier</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{stats.universal_assignments}</div>
            <div className="text-slate-400 text-xs">Universal QR</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-400">{stats.dedicated_qr_codes}</div>
            <div className="text-slate-400 text-xs">Dedicated QR</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-400">{stats.total_scans_30d}</div>
            <div className="text-slate-400 text-xs">Total Scans</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Search Businesses
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by business name..."
            className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400"
          />
        </div>
        
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Filter by Tier
          </label>
          <select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
          >
            <option value="all">All Tiers</option>
            <option value="spotlight">Spotlight</option>
            <option value="featured">Featured</option>
            <option value="starter">Starter</option>
            <option value="free_trial">Free Trial</option>
          </select>
        </div>
      </div>

      {/* Business Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {businesses.map((business) => (
          <Card key={business.business_id} className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle className="text-white text-base">{business.business_name}</CardTitle>
                    {getTierBadge(business.tier)}
                  </div>
                  <p className="text-slate-400 text-sm">{business.business_category}</p>
                  <p className="text-slate-500 text-xs">{business.business_address}</p>
                </div>
                {business.logo && (
                  <img src={business.logo} alt="Logo" className="w-12 h-12 rounded-lg object-cover" />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* QR Code Status */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getQRTypeIcon('explore')}
                    <span className="text-sm text-slate-300">Explore</span>
                  </div>
                  {renderQRStatus(business, 'explore')}
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getQRTypeIcon('offers')}
                    <span className="text-sm text-slate-300">Offers</span>
                  </div>
                  {renderQRStatus(business, 'offers')}
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getQRTypeIcon('secret')}
                    <span className="text-sm text-slate-300">Secret Menu</span>
                  </div>
                  {renderQRStatus(business, 'secret')}
                </div>
              </div>

              {/* Analytics */}
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-blue-400 font-semibold text-sm">{business.universal_scans_30d}</div>
                    <div className="text-slate-500 text-xs">Universal</div>
                  </div>
                  <div>
                    <div className="text-orange-400 font-semibold text-sm">{business.dedicated_scans_30d}</div>
                    <div className="text-slate-500 text-xs">Dedicated</div>
                  </div>
                  <div>
                    <div className="text-purple-400 font-semibold text-sm">{business.total_scans_30d}</div>
                    <div className="text-slate-500 text-xs">Total</div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedBusiness(business)
                    setShowManageModal(true)
                  }}
                  className="flex-1 bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#009d5f] text-black font-semibold text-xs"
                >
                  Manage QR
                </Button>
                
                {business.tier !== 'spotlight' && (
                  <Button
                    size="sm"
                    onClick={() => upgradeToSpotlight(business)}
                    className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-semibold text-xs"
                  >
                    Upgrade to Spotlight
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Management Modal */}
      {showManageModal && selectedBusiness && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowManageModal(false)}>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-2xl w-full shadow-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span>QR Code Management</span>
              {getTierBadge(selectedBusiness.tier)}
            </h3>
            
            <div className="space-y-6">
              {/* Business Info */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  {selectedBusiness.logo && (
                    <img src={selectedBusiness.logo} alt="Logo" className="w-16 h-16 rounded-lg object-cover" />
                  )}
                  <div>
                    <h4 className="text-white font-semibold">{selectedBusiness.business_name}</h4>
                    <p className="text-slate-400 text-sm">{selectedBusiness.business_category}</p>
                    <p className="text-slate-500 text-xs">{selectedBusiness.business_address}</p>
                  </div>
                </div>
              </div>

              {selectedBusiness.tier === 'spotlight' ? (
                /* Spotlight Tier - Dedicated QR Management */
                <div className="space-y-4">
                  <h4 className="text-white font-semibold flex items-center gap-2">
                    <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    Dedicated QR Codes (Spotlight Tier)
                  </h4>
                  
                  <div className="space-y-3">
                    {['explore', 'offers', 'secret'].map((qrType) => {
                      const dedicatedId = selectedBusiness[`dedicated_${qrType}_id` as keyof BusinessQRData] as string
                      const printStatus = selectedBusiness[`${qrType}_print_status` as keyof BusinessQRData] as string
                      
                      return (
                        <div key={qrType} className="bg-slate-700/30 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getQRTypeIcon(qrType)}
                              <span className="text-white font-medium capitalize">{qrType} QR</span>
                            </div>
                            {dedicatedId ? (
                              <Badge className={`bg-${getQRTypeColor(qrType)}-500 text-white`}>
                                Active
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setGenerateQRType(qrType as 'explore' | 'offers' | 'secret')
                                  setShowGenerateModal(true)
                                }}
                                className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#009d5f] text-black font-semibold text-xs"
                              >
                                Generate
                              </Button>
                            )}
                          </div>
                          
                          {dedicatedId && (
                            <div className="space-y-2">
                              <div className="text-xs text-slate-400">
                                <span className="font-medium">QR ID:</span> 
                                <span className="font-mono ml-1">{dedicatedId}</span>
                              </div>
                              <div className="text-xs text-slate-400">
                                <span className="font-medium">Status:</span> 
                                <span className="ml-1 capitalize">{printStatus?.replace('_', ' ') || 'Generated'}</span>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" className="text-xs">
                                  Download QR
                                </Button>
                                <Button size="sm" variant="outline" className="text-xs">
                                  View Analytics
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                /* Non-Spotlight Tier - Universal QR Management */
                <div className="space-y-4">
                  <h4 className="text-white font-semibold flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Universal QR Code Assignments
                  </h4>
                  
                  <div className="space-y-3">
                    {['explore', 'offers', 'secret'].map((qrType) => {
                      const hasUniversal = selectedBusiness[`has_universal_${qrType}` as keyof BusinessQRData] as boolean
                      
                      return (
                        <div key={qrType} className="bg-slate-700/30 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getQRTypeIcon(qrType)}
                              <span className="text-white font-medium capitalize">{qrType} QR</span>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => toggleUniversalQR(selectedBusiness, qrType as 'explore' | 'offers' | 'secret', !hasUniversal)}
                              className={hasUniversal 
                                ? "bg-red-600 hover:bg-red-700 text-white text-xs"
                                : "bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#009d5f] text-black font-semibold text-xs"
                              }
                            >
                              {hasUniversal ? 'Remove' : 'Assign'}
                            </Button>
                          </div>
                          
                          <p className="text-slate-400 text-xs mt-2">
                            {hasUniversal 
                              ? `Assigned to universal ${qrType} QR code`
                              : `Not assigned to universal ${qrType} QR code`
                            }
                          </p>
                        </div>
                      )
                    })}
                  </div>
                  
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-yellow-300 font-medium text-sm">Upgrade to Spotlight</p>
                        <p className="text-yellow-200 text-xs mt-1">
                          Get dedicated QR codes with advanced analytics, custom branding, and direct routing.
                        </p>
                        <Button
                          size="sm"
                          onClick={() => upgradeToSpotlight(selectedBusiness)}
                          className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-semibold text-xs mt-2"
                        >
                          Upgrade Now
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowManageModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate QR Modal */}
      {showGenerateModal && selectedBusiness && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowGenerateModal(false)}>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-4">
              Generate Dedicated QR Code
            </h3>
            
            <div className="space-y-4">
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-white font-medium">{selectedBusiness.business_name}</p>
                <p className="text-slate-400 text-sm">Spotlight Tier</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  QR Code Type
                </label>
                <div className="bg-slate-700 border border-slate-600 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    {getQRTypeIcon(generateQRType)}
                    <span className="text-white font-medium capitalize">{generateQRType} QR Code</span>
                  </div>
                  <p className="text-slate-400 text-xs mt-1">
                    {generateQRType === 'explore' && 'Routes directly to business profile page'}
                    {generateQRType === 'offers' && 'Routes directly to business offers page'}
                    {generateQRType === 'secret' && 'Routes directly to business secret menu'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Features Included
                </label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Direct routing (no business selection)
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Advanced analytics tracking
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Business logo overlay
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Unique QR code identifier
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowGenerateModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={generateDedicatedQR}
                  className="flex-1 bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#009d5f] text-black font-semibold"
                >
                  Generate QR Code
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
