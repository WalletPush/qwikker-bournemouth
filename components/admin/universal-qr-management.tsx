'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useElegantModal } from '@/components/ui/elegant-modal'

interface BusinessQRStatus {
  business_id: string
  business_name: string
  business_category: string
  status: string
  city: string
  business_address: string
  has_explore_qr: boolean
  has_offers_qr: boolean
  has_secret_qr: boolean
  explore_assigned_at?: string
  offers_assigned_at?: string
  secret_assigned_at?: string
  explore_scans_30d: number
  offers_scans_30d: number
  secret_scans_30d: number
  latitude?: number
  longitude?: number
  location_accuracy?: string
}

interface UniversalQRManagementProps {
  city: string
  cityDisplayName: string
}

export function UniversalQRManagement({ city, cityDisplayName }: UniversalQRManagementProps) {
  const [businesses, setBusinesses] = useState<BusinessQRStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessQRStatus | null>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [qrTypes, setQrTypes] = useState<{
    explore: boolean
    offers: boolean
    secret: boolean
  }>({ explore: false, offers: false, secret: false })
  const [assignmentNotes, setAssignmentNotes] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const supabase = createClientComponentClient()
  const { showSuccess, showError, showConfirm, ModalComponent } = useElegantModal()

  useEffect(() => {
    fetchBusinesses()
  }, [city, filterCategory, searchQuery])

  const fetchBusinesses = async () => {
    try {
      let query = supabase
        .from('universal_qr_management_view')
        .select('*')
        .eq('city', city)

      if (filterCategory !== 'all') {
        query = query.ilike('business_category', filterCategory)
      }

      if (searchQuery.trim()) {
        query = query.ilike('business_name', `%${searchQuery.trim()}%`)
      }

      const { data, error } = await query

      if (error) throw error
      setBusinesses(data || [])
    } catch (error) {
      console.error('Error fetching businesses:', error)
      showError('Failed to load business QR status')
    } finally {
      setLoading(false)
    }
  }

  const openAssignModal = (business: BusinessQRStatus) => {
    setSelectedBusiness(business)
    setQrTypes({
      explore: business.has_explore_qr,
      offers: business.has_offers_qr,
      secret: business.has_secret_qr
    })
    setAssignmentNotes('')
    setShowAssignModal(true)
  }

  const updateQRAssignments = async () => {
    if (!selectedBusiness) return

    try {
      const qrTypesToProcess = [
        { type: 'explore', enabled: qrTypes.explore, current: selectedBusiness.has_explore_qr },
        { type: 'offers', enabled: qrTypes.offers, current: selectedBusiness.has_offers_qr },
        { type: 'secret', enabled: qrTypes.secret, current: selectedBusiness.has_secret_qr }
      ]

      for (const qr of qrTypesToProcess) {
        if (qr.enabled && !qr.current) {
          // Add new assignment
          const { error } = await supabase
            .from('business_qr_assignments')
            .insert({
              business_id: selectedBusiness.business_id,
              qr_type: qr.type,
              is_active: true,
              assignment_notes: assignmentNotes || null
            })
          
          if (error) throw error
        } else if (!qr.enabled && qr.current) {
          // Remove assignment
          const { error } = await supabase
            .from('business_qr_assignments')
            .update({ is_active: false })
            .eq('business_id', selectedBusiness.business_id)
            .eq('qr_type', qr.type)
            .eq('is_active', true)
          
          if (error) throw error
        }
      }

      showSuccess('QR code assignments updated successfully!')
      setShowAssignModal(false)
      setSelectedBusiness(null)
      fetchBusinesses()
    } catch (error) {
      console.error('Error updating QR assignments:', error)
      showError('Failed to update QR code assignments')
    }
  }

  const removeAllQRCodes = async (business: BusinessQRStatus) => {
    const confirmed = await showConfirm(
      'Remove All QR Codes',
      `Remove all QR code assignments from ${business.business_name}? Their physical QR codes will no longer work until reassigned.`
    )

    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('business_qr_assignments')
        .update({ is_active: false })
        .eq('business_id', business.business_id)
        .eq('is_active', true)

      if (error) throw error

      showSuccess('All QR codes removed successfully!')
      fetchBusinesses()
    } catch (error) {
      console.error('Error removing QR codes:', error)
      showError('Failed to remove QR codes')
    }
  }

  const getQRTypeColor = (type: string) => {
    switch (type) {
      case 'explore': return 'bg-blue-500'
      case 'offers': return 'bg-orange-500'
      case 'secret': return 'bg-purple-500'
      default: return 'bg-gray-500'
    }
  }

  const getQRTypeLabel = (type: string) => {
    switch (type) {
      case 'explore': return 'Explore'
      case 'offers': return 'Offers'
      case 'secret': return 'Secret Menu'
      default: return type
    }
  }

  const getBusinessCategories = () => {
    const categories = [...new Set(businesses.map(b => b.business_category).filter(Boolean))]
    return categories.sort()
  }

  const stats = {
    total_businesses: businesses.length,
    with_explore: businesses.filter(b => b.has_explore_qr).length,
    with_offers: businesses.filter(b => b.has_offers_qr).length,
    with_secret: businesses.filter(b => b.has_secret_qr).length,
    total_scans_30d: businesses.reduce((sum, b) => sum + b.explore_scans_30d + b.offers_scans_30d + b.secret_scans_30d, 0)
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
          <h3 className="text-lg font-semibold text-white mb-2">Universal QR Code Management</h3>
          <p className="text-slate-400 text-sm">
            Manage which businesses are assigned to the 3 universal QR codes in {cityDisplayName}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-300">
            <span className="font-semibold text-[#00d083]">{stats.total_businesses}</span> businesses
          </p>
          <p className="text-sm text-slate-400">
            {stats.total_scans_30d.toLocaleString()} scans (30 days)
          </p>
        </div>
      </div>

      {/* QR Code Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h4 className="text-white font-semibold">Explore QR</h4>
                <p className="text-slate-400 text-sm">Window Stickers</p>
              </div>
            </div>
            <div className="text-2xl font-bold text-blue-400 mb-1">{stats.with_explore}</div>
            <div className="text-slate-400 text-xs">businesses assigned</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div>
                <h4 className="text-white font-semibold">Offers QR</h4>
                <p className="text-slate-400 text-sm">Table Tents</p>
              </div>
            </div>
            <div className="text-2xl font-bold text-orange-400 mb-1">{stats.with_offers}</div>
            <div className="text-slate-400 text-xs">businesses assigned</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h4 className="text-white font-semibold">Secret Menu QR</h4>
                <p className="text-slate-400 text-sm">Secret Stickers</p>
              </div>
            </div>
            <div className="text-2xl font-bold text-purple-400 mb-1">{stats.with_secret}</div>
            <div className="text-slate-400 text-xs">businesses assigned</div>
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
            Filter by Category
          </label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
          >
            <option value="all">All Categories</option>
            {getBusinessCategories().map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Business Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {businesses.map((business) => (
          <Card key={business.business_id} className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-sm">{business.business_name}</CardTitle>
                <Badge variant="secondary" className="text-xs">{business.business_category}</Badge>
              </div>
              <p className="text-slate-400 text-xs">{business.business_address}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* QR Code Status */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300">QR Code Assignments:</span>
                </div>
                <div className="flex gap-1">
                  <Badge className={`text-xs ${business.has_explore_qr ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                    Explore
                  </Badge>
                  <Badge className={`text-xs ${business.has_offers_qr ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                    Offers
                  </Badge>
                  <Badge className={`text-xs ${business.has_secret_qr ? 'bg-purple-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                    Secret
                  </Badge>
                </div>
              </div>

              {/* Analytics */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-blue-400 font-semibold text-sm">{business.explore_scans_30d}</div>
                  <div className="text-slate-500 text-xs">Explore</div>
                </div>
                <div>
                  <div className="text-orange-400 font-semibold text-sm">{business.offers_scans_30d}</div>
                  <div className="text-slate-500 text-xs">Offers</div>
                </div>
                <div>
                  <div className="text-purple-400 font-semibold text-sm">{business.secret_scans_30d}</div>
                  <div className="text-slate-500 text-xs">Secret</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => openAssignModal(business)}
                  className="flex-1 bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#009d5f] text-black font-semibold text-xs"
                >
                  Manage QR
                </Button>
                
                {(business.has_explore_qr || business.has_offers_qr || business.has_secret_qr) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removeAllQRCodes(business)}
                    className="text-xs text-red-400 border-red-400 hover:bg-red-400 hover:text-black"
                  >
                    Remove All
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Assignment Modal */}
      {showAssignModal && selectedBusiness && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAssignModal(false)}>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-4">
              Manage QR Codes
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Business
                </label>
                <div className="bg-slate-700 border border-slate-600 rounded-lg p-3">
                  <p className="text-white font-medium">{selectedBusiness.business_name}</p>
                  <p className="text-slate-400 text-sm">{selectedBusiness.business_category}</p>
                  <p className="text-slate-400 text-xs">{selectedBusiness.business_address}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  QR Code Assignments
                </label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700">
                    <input
                      type="checkbox"
                      checked={qrTypes.explore}
                      onChange={(e) => setQrTypes(prev => ({ ...prev, explore: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-blue-500 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-500 text-white text-xs">Explore</Badge>
                        <span className="text-white text-sm">Window Sticker QR</span>
                      </div>
                      <p className="text-slate-400 text-xs mt-1">Routes to business profile page</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700">
                    <input
                      type="checkbox"
                      checked={qrTypes.offers}
                      onChange={(e) => setQrTypes(prev => ({ ...prev, offers: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-orange-500 focus:ring-orange-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-orange-500 text-white text-xs">Offers</Badge>
                        <span className="text-white text-sm">Table Tent QR</span>
                      </div>
                      <p className="text-slate-400 text-xs mt-1">Routes to offers gallery for this business</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700">
                    <input
                      type="checkbox"
                      checked={qrTypes.secret}
                      onChange={(e) => setQrTypes(prev => ({ ...prev, secret: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-purple-500 focus:ring-purple-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-purple-500 text-white text-xs">Secret</Badge>
                        <span className="text-white text-sm">Secret Menu QR</span>
                      </div>
                      <p className="text-slate-400 text-xs mt-1">Routes to secret menu for this business</p>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Assignment Notes (Optional)
                </label>
                <textarea
                  value={assignmentNotes}
                  onChange={(e) => setAssignmentNotes(e.target.value)}
                  placeholder="Add any notes about this assignment..."
                  className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 resize-none"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowAssignModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={updateQRAssignments}
                  className="flex-1 bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#009d5f] text-black font-semibold"
                >
                  Update Assignments
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
