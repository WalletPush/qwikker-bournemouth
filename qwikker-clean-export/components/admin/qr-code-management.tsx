'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useElegantModal } from '@/components/ui/elegant-modal'

interface QRCodeTemplate {
  id: string
  code_name: string
  qr_type: 'explore' | 'offers' | 'secret_menu' | 'general'
  city: string
  physical_location: string
  base_url: string
  is_active: boolean
  current_assignment?: QRAssignment
}

interface QRAssignment {
  id: string
  business_id: string
  business_name: string
  assignment_type: string
  assigned_at: string
  expires_at?: string
  notes?: string
  is_active: boolean
}

interface Business {
  id: string
  business_name: string
  status: string
  business_category: string
}

interface QRCodeManagementProps {
  city: string
  cityDisplayName: string
}

export function QRCodeManagement({ city, cityDisplayName }: QRCodeManagementProps) {
  const [qrCodes, setQrCodes] = useState<QRCodeTemplate[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedQR, setSelectedQR] = useState<QRCodeTemplate | null>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedBusiness, setSelectedBusiness] = useState('')
  const [assignmentNotes, setAssignmentNotes] = useState('')
  const supabase = createClientComponentClient()
  const { showSuccess, showError, showConfirm, ModalComponent } = useElegantModal()

  useEffect(() => {
    fetchQRCodes()
    fetchBusinesses()
  }, [city])

  const fetchQRCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('qr_code_templates')
        .select(`
          *,
          qr_code_assignments!left (
            id,
            business_id,
            assignment_type,
            assigned_at,
            expires_at,
            notes,
            is_active,
            business_profiles!inner (
              business_name
            )
          )
        `)
        .eq('city', city)
        .eq('is_active', true)
        .order('qr_type')

      if (error) throw error

      const formattedQRCodes = data.map(qr => ({
        ...qr,
        current_assignment: qr.qr_code_assignments?.[0] ? {
          ...qr.qr_code_assignments[0],
          business_name: qr.qr_code_assignments[0].business_profiles?.business_name || 'Unknown Business'
        } : undefined
      }))

      setQrCodes(formattedQRCodes)
    } catch (error) {
      console.error('Error fetching QR codes:', error)
      showError('Failed to load QR codes')
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
      // First, deactivate any existing assignment for this QR code
      if (selectedQR.current_assignment) {
        await supabase
          .from('qr_code_assignments')
          .update({ is_active: false })
          .eq('qr_code_id', selectedQR.id)
          .eq('is_active', true)
      }

      // Create new assignment
      const { error } = await supabase
        .from('qr_code_assignments')
        .insert({
          qr_code_id: selectedQR.id,
          business_id: selectedBusiness,
          assignment_type: selectedQR.qr_type,
          notes: assignmentNotes || null,
          is_active: true
        })

      if (error) throw error

      showSuccess('QR code assigned successfully!')
      setShowAssignModal(false)
      setSelectedQR(null)
      setSelectedBusiness('')
      setAssignmentNotes('')
      fetchQRCodes()
    } catch (error) {
      console.error('Error assigning QR code:', error)
      showError('Failed to assign QR code')
    }
  }

  const unassignQRCode = async (qrCode: QRCodeTemplate) => {
    if (!qrCode.current_assignment) return

    const confirmed = await showConfirm(
      'Unassign QR Code',
      `Are you sure you want to unassign "${qrCode.code_name}" from ${qrCode.current_assignment.business_name}? This will make the QR code inactive until reassigned.`
    )

    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('qr_code_assignments')
        .update({ is_active: false })
        .eq('id', qrCode.current_assignment.id)

      if (error) throw error

      showSuccess('QR code unassigned successfully!')
      fetchQRCodes()
    } catch (error) {
      console.error('Error unassigning QR code:', error)
      showError('Failed to unassign QR code')
    }
  }

  const getQRTypeColor = (type: string) => {
    switch (type) {
      case 'explore': return 'bg-blue-500'
      case 'offers': return 'bg-orange-500'
      case 'secret_menu': return 'bg-purple-500'
      case 'general': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getQRTypeLabel = (type: string) => {
    switch (type) {
      case 'explore': return 'Explore Business'
      case 'offers': return 'View Offers'
      case 'secret_menu': return 'Secret Menu'
      case 'general': return 'Join Qwikker'
      default: return type
    }
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
          <h3 className="text-lg font-semibold text-white mb-2">QR Code Management</h3>
          <p className="text-slate-400 text-sm">
            Manage dynamic QR code assignments for {cityDisplayName}. Each QR code can be linked to different businesses.
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-300">
            <span className="font-semibold text-[#00d083]">{qrCodes.filter(qr => qr.current_assignment).length}</span> assigned
          </p>
          <p className="text-sm text-slate-400">
            {qrCodes.filter(qr => !qr.current_assignment).length} available
          </p>
        </div>
      </div>

      {/* QR Code Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {qrCodes.map((qrCode) => (
          <Card key={qrCode.id} className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge className={`${getQRTypeColor(qrCode.qr_type)} text-white`}>
                  {getQRTypeLabel(qrCode.qr_type)}
                </Badge>
                <Badge variant={qrCode.current_assignment ? "default" : "secondary"}>
                  {qrCode.current_assignment ? "Assigned" : "Available"}
                </Badge>
              </div>
              <CardTitle className="text-white text-sm">{qrCode.code_name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs text-slate-400">
                <p><span className="font-medium">Location:</span> {qrCode.physical_location}</p>
                <p><span className="font-medium">Type:</span> {getQRTypeLabel(qrCode.qr_type)}</p>
              </div>

              {qrCode.current_assignment ? (
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
                  <p className="text-sm font-medium text-white mb-1">
                    {qrCode.current_assignment.business_name}
                  </p>
                  <p className="text-xs text-slate-400 mb-2">
                    Assigned {new Date(qrCode.current_assignment.assigned_at).toLocaleDateString()}
                  </p>
                  {qrCode.current_assignment.notes && (
                    <p className="text-xs text-slate-500 mb-2">
                      "{qrCode.current_assignment.notes}"
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => unassignQRCode(qrCode)}
                      className="flex-1 text-xs"
                    >
                      Unassign
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedQR(qrCode)
                        setSelectedBusiness(qrCode.current_assignment!.business_id)
                        setAssignmentNotes(qrCode.current_assignment!.notes || '')
                        setShowAssignModal(true)
                      }}
                      className="flex-1 text-xs bg-blue-600 hover:bg-blue-700"
                    >
                      Reassign
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() => {
                    setSelectedQR(qrCode)
                    setSelectedBusiness('')
                    setAssignmentNotes('')
                    setShowAssignModal(true)
                  }}
                  className="w-full bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#009d5f] text-black font-semibold"
                >
                  Assign to Business
                </Button>
              )}
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
                  <p className="text-white font-medium">{selectedQR.code_name}</p>
                  <p className="text-slate-400 text-sm">{selectedQR.physical_location}</p>
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
                  Notes (Optional)
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
