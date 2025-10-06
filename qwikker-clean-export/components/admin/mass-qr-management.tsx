'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useElegantModal } from '@/components/ui/elegant-modal'

interface QRCodeInventory {
  id: string
  qr_code: string
  qr_type: 'window_sticker' | 'offers' | 'secret_menu'
  city: string
  physical_format: string
  is_distributed: boolean
  is_assigned: boolean
  business_name?: string
  business_status?: string
  total_scans: number
  assigned_at?: string
  assignment_notes?: string
}

interface Business {
  id: string
  business_name: string
  status: string
  business_category: string
}

interface MassQRManagementProps {
  city: string
  cityDisplayName: string
}

export function MassQRManagement({ city, cityDisplayName }: MassQRManagementProps) {
  const [qrInventory, setQrInventory] = useState<QRCodeInventory[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedQR, setSelectedQR] = useState<QRCodeInventory | null>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedBusiness, setSelectedBusiness] = useState('')
  const [assignmentNotes, setAssignmentNotes] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'window_sticker' | 'offers' | 'secret_menu'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'unassigned' | 'assigned' | 'distributed'>('all')
  const supabase = createClientComponentClient()
  const { showSuccess, showError, showConfirm, ModalComponent } = useElegantModal()

  useEffect(() => {
    fetchQRInventory()
    fetchBusinesses()
  }, [city, filterType, filterStatus])

  const fetchQRInventory = async () => {
    try {
      let query = supabase
        .from('qr_code_management_view')
        .select('*')
        .eq('city', city)

      if (filterType !== 'all') {
        query = query.eq('qr_type', filterType)
      }

      if (filterStatus === 'unassigned') {
        query = query.eq('is_assigned', false)
      } else if (filterStatus === 'assigned') {
        query = query.eq('is_assigned', true)
      } else if (filterStatus === 'distributed') {
        query = query.eq('is_distributed', true)
      }

      const { data, error } = await query.order('qr_code')

      if (error) throw error
      setQrInventory(data || [])
    } catch (error) {
      console.error('Error fetching QR inventory:', error)
      showError('Failed to load QR code inventory')
    }
  }

  const fetchBusinesses = async () => {
    try {
      const { data, error } = await supabase
        .from('business_profiles')
        .select('id, business_name, status, business_category')
        .eq('city', city)
        .eq('status', 'approved')
        .order('business_name')

      if (error) throw error
      setBusinesses(data || [])
    } catch (error) {
      console.error('Error fetching businesses:', error)
    } finally {
      setLoading(false)
    }
  }

  const assignQRCode = async () => {
    if (!selectedQR || !selectedBusiness) return

    try {
      // Create assignment
      const { error: assignError } = await supabase
        .from('qr_code_assignments')
        .insert({
          qr_code_id: selectedQR.id,
          business_id: selectedBusiness,
          assignment_notes: assignmentNotes || null,
          is_active: true
        })

      if (assignError) throw assignError

      // Update inventory status
      const { error: updateError } = await supabase
        .from('qr_code_inventory')
        .update({ is_assigned: true })
        .eq('id', selectedQR.id)

      if (updateError) throw updateError

      showSuccess('QR code assigned successfully!')
      setShowAssignModal(false)
      setSelectedQR(null)
      setSelectedBusiness('')
      setAssignmentNotes('')
      fetchQRInventory()
    } catch (error) {
      console.error('Error assigning QR code:', error)
      showError('Failed to assign QR code')
    }
  }

  const unassignQRCode = async (qr: QRCodeInventory) => {
    if (!qr.is_assigned) return

    const confirmed = await showConfirm(
      'Unassign QR Code',
      `Are you sure you want to unassign "${qr.qr_code}" from ${qr.business_name}? This will make the QR code show the "Coming Soon" message when scanned.`
    )

    if (!confirmed) return

    try {
      // Deactivate assignment
      const { error: assignError } = await supabase
        .from('qr_code_assignments')
        .update({ is_active: false })
        .eq('qr_code_id', qr.id)
        .eq('is_active', true)

      if (assignError) throw assignError

      // Update inventory status
      const { error: updateError } = await supabase
        .from('qr_code_inventory')
        .update({ is_assigned: false })
        .eq('id', qr.id)

      if (updateError) throw updateError

      showSuccess('QR code unassigned successfully!')
      fetchQRInventory()
    } catch (error) {
      console.error('Error unassigning QR code:', error)
      showError('Failed to unassign QR code')
    }
  }

  const markAsDistributed = async (qr: QRCodeInventory) => {
    const confirmed = await showConfirm(
      'Mark as Distributed',
      `Mark QR code "${qr.qr_code}" as distributed to a business? This indicates the physical QR code has been given out.`
    )

    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('qr_code_inventory')
        .update({ 
          is_distributed: true,
          distributed_at: new Date().toISOString()
        })
        .eq('id', qr.id)

      if (error) throw error

      showSuccess('QR code marked as distributed!')
      fetchQRInventory()
    } catch (error) {
      console.error('Error marking QR as distributed:', error)
      showError('Failed to update QR code status')
    }
  }

  const getQRTypeColor = (type: string) => {
    switch (type) {
      case 'window_sticker': return 'bg-blue-500'
      case 'offers': return 'bg-orange-500'
      case 'secret_menu': return 'bg-purple-500'
      default: return 'bg-gray-500'
    }
  }

  const getQRTypeLabel = (type: string) => {
    switch (type) {
      case 'window_sticker': return 'Window Sticker'
      case 'offers': return 'Offers'
      case 'secret_menu': return 'Secret Menu'
      default: return type
    }
  }

  const getStatusBadge = (qr: QRCodeInventory) => {
    if (qr.is_assigned && qr.business_name) {
      return <Badge className="bg-green-500 text-white">Assigned to {qr.business_name}</Badge>
    } else if (qr.is_distributed) {
      return <Badge className="bg-yellow-500 text-black">Distributed</Badge>
    } else {
      return <Badge variant="secondary">Available</Badge>
    }
  }

  const stats = {
    total: qrInventory.length,
    assigned: qrInventory.filter(qr => qr.is_assigned).length,
    distributed: qrInventory.filter(qr => qr.is_distributed).length,
    available: qrInventory.filter(qr => !qr.is_assigned && !qr.is_distributed).length,
    total_scans: qrInventory.reduce((sum, qr) => sum + qr.total_scans, 0)
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
          <h3 className="text-lg font-semibold text-white mb-2">Mass QR Code Management</h3>
          <p className="text-slate-400 text-sm">
            Manage your pre-printed QR code inventory for {cityDisplayName}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-300">
            <span className="font-semibold text-[#00d083]">{stats.assigned}</span> assigned
          </p>
          <p className="text-sm text-slate-400">
            {stats.available} available • {stats.total_scans.toLocaleString()} total scans
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-slate-400 text-xs">Total QR Codes</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{stats.assigned}</div>
            <div className="text-slate-400 text-xs">Assigned</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">{stats.distributed}</div>
            <div className="text-slate-400 text-xs">Distributed</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{stats.available}</div>
            <div className="text-slate-400 text-xs">Available</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-400">{stats.total_scans}</div>
            <div className="text-slate-400 text-xs">Total Scans</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Filter by Type
          </label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
          >
            <option value="all">All Types</option>
            <option value="window_sticker">Window Stickers</option>
            <option value="offers">Offers</option>
            <option value="secret_menu">Secret Menu</option>
          </select>
        </div>
        
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Filter by Status
          </label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
          >
            <option value="all">All Status</option>
            <option value="unassigned">Unassigned</option>
            <option value="assigned">Assigned</option>
            <option value="distributed">Distributed</option>
          </select>
        </div>
      </div>

      {/* QR Code Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {qrInventory.map((qr) => (
          <Card key={qr.id} className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge className={`${getQRTypeColor(qr.qr_type)} text-white`}>
                  {getQRTypeLabel(qr.qr_type)}
                </Badge>
                {getStatusBadge(qr)}
              </div>
              <CardTitle className="text-white text-sm font-mono">{qr.qr_code}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs text-slate-400">
                <p><span className="font-medium">Format:</span> {qr.physical_format}</p>
                <p><span className="font-medium">Scans:</span> {qr.total_scans}</p>
                {qr.assigned_at && (
                  <p><span className="font-medium">Assigned:</span> {new Date(qr.assigned_at).toLocaleDateString()}</p>
                )}
              </div>

              <div className="flex gap-2">
                {!qr.is_assigned ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedQR(qr)
                      setSelectedBusiness('')
                      setAssignmentNotes('')
                      setShowAssignModal(true)
                    }}
                    className="flex-1 bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#009d5f] text-black font-semibold text-xs"
                  >
                    Assign
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => unassignQRCode(qr)}
                    className="flex-1 text-xs"
                  >
                    Unassign
                  </Button>
                )}
                
                {!qr.is_distributed && (
                  <Button
                    size="sm"
                    onClick={() => markAsDistributed(qr)}
                    className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-black font-semibold text-xs"
                  >
                    Mark Distributed
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Assignment Modal */}
      {showAssignModal && selectedQR && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAssignModal(false)}>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-4">
              Assign QR Code
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  QR Code
                </label>
                <div className="bg-slate-700 border border-slate-600 rounded-lg p-3">
                  <p className="text-white font-mono font-medium">{selectedQR.qr_code}</p>
                  <p className="text-slate-400 text-sm">{selectedQR.physical_format}</p>
                  <Badge className={`${getQRTypeColor(selectedQR.qr_type)} text-white mt-1`}>
                    {getQRTypeLabel(selectedQR.qr_type)}
                  </Badge>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Assign to Business
                </label>
                <select
                  value={selectedBusiness}
                  onChange={(e) => setSelectedBusiness(e.target.value)}
                  className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                  <option value="">Select a business...</option>
                  {businesses.map((business) => (
                    <option key={business.id} value={business.id}>
                      {business.business_name} ({business.business_category})
                    </option>
                  ))}
                </select>
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
                  onClick={assignQRCode}
                  disabled={!selectedBusiness}
                  className="flex-1 bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#009d5f] text-black font-semibold"
                >
                  Assign QR Code
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
