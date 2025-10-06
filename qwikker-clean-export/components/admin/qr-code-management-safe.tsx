'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useElegantModal } from '@/components/ui/elegant-modal'

interface QRCodeTemplate {
  id: string
  code_name: string
  qr_type: 'explore' | 'offers' | 'secret_menu' | 'general'
  physical_location: string
  current_assignment?: {
    business_name: string
    assigned_at: string
    notes?: string
  }
}

interface Business {
  id: string
  business_name: string
  business_category: string
  status: string
}

interface QRCodeManagementSafeProps {
  city: string
  cityDisplayName: string
}

// MOCK DATA for safe testing
const mockQRCodes: QRCodeTemplate[] = [
  {
    id: '1',
    code_name: 'explore-bournemouth-table-tent-001',
    qr_type: 'explore',
    physical_location: 'Table Tent',
    current_assignment: {
      business_name: 'Jerry\'s Burgers',
      assigned_at: '2024-01-15',
      notes: 'Main table tent for restaurant exploration'
    }
  },
  {
    id: '2', 
    code_name: 'offers-bournemouth-window-001',
    qr_type: 'offers',
    physical_location: 'Window Sticker',
  },
  {
    id: '3',
    code_name: 'secret-menu-bournemouth-sticker-001', 
    qr_type: 'secret_menu',
    physical_location: 'Secret Sticker',
  },
  {
    id: '4',
    code_name: 'general-bournemouth-flyer-001',
    qr_type: 'general', 
    physical_location: 'Join Qwikker Flyer',
  }
]

const mockBusinesses: Business[] = [
  { id: '1', business_name: 'Jerry\'s Burgers', business_category: 'Restaurant', status: 'approved' },
  { id: '2', business_name: 'Seaside Café', business_category: 'Café', status: 'approved' },
  { id: '3', business_name: 'The Local Bistro', business_category: 'Restaurant', status: 'approved' }
]

export function QRCodeManagementSafe({ city, cityDisplayName }: QRCodeManagementSafeProps) {
  const [qrCodes] = useState<QRCodeTemplate[]>(mockQRCodes)
  const [businesses] = useState<Business[]>(mockBusinesses)
  const [selectedQR, setSelectedQR] = useState<QRCodeTemplate | null>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [selectedBusiness, setSelectedBusiness] = useState('')
  const [assignmentNotes, setAssignmentNotes] = useState('')
  const [previewMode, setPreviewMode] = useState(true) // SAFE MODE
  const { showSuccess, showError, showConfirm, ModalComponent } = useElegantModal()

  const previewAssignment = () => {
    if (!selectedQR || !selectedBusiness) return
    
    const business = businesses.find(b => b.id === selectedBusiness)
    if (!business) return

    // Show preview of what this assignment would do
    const previewUrl = generateQRUrl(selectedQR, business)
    showSuccess(`Preview: QR "${selectedQR.code_name}" would redirect to:\n${previewUrl}`)
  }

  const generateQRUrl = (qr: QRCodeTemplate, business: Business) => {
    const baseUrl = `https://${city}.qwikker.com/intent`
    const params = new URLSearchParams({
      qr: qr.id,
      type: qr.qr_type,
      business: business.id
    })
    return `${baseUrl}?${params.toString()}`
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

  const getQRTypeDescription = (type: string) => {
    switch (type) {
      case 'explore': return 'Takes users to business profile in Discover tab'
      case 'offers': return 'Takes users to business offers in Offers tab'
      case 'secret_menu': return 'Takes users to business secret menu'
      case 'general': return 'Takes users to main dashboard with business highlight'
      default: return 'General purpose QR code'
    }
  }

  return (
    <div className="space-y-6">
      <ModalComponent />
      
      {/* Header with Safe Mode Indicator */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">QR Code Management</h3>
          <p className="text-slate-400 text-sm">
            Preview and plan dynamic QR code assignments for {cityDisplayName}
          </p>
        </div>
        <div className="text-right">
          <Badge className="bg-yellow-500 text-black mb-2">
            🛡️ SAFE PREVIEW MODE
          </Badge>
          <p className="text-sm text-slate-300">
            <span className="font-semibold text-[#00d083]">{qrCodes.filter(qr => qr.current_assignment).length}</span> assigned
          </p>
          <p className="text-sm text-slate-400">
            {qrCodes.filter(qr => !qr.current_assignment).length} available
          </p>
        </div>
      </div>

      {/* Safe Mode Notice */}
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-yellow-400 font-semibold">Safe Preview Mode Active</h4>
            <p className="text-yellow-200 text-sm">
              You can preview assignments and test the interface without making actual database changes. 
              Perfect for planning and testing before going live.
            </p>
          </div>
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
                <p><span className="font-medium">Purpose:</span> {getQRTypeDescription(qrCode.qr_type)}</p>
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
                      onClick={() => showSuccess('Preview: Would unassign this QR code')}
                      className="flex-1 text-xs"
                    >
                      Preview Unassign
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedQR(qrCode)
                        setSelectedBusiness('')
                        setAssignmentNotes(qrCode.current_assignment!.notes || '')
                        setShowPreviewModal(true)
                      }}
                      className="flex-1 text-xs bg-blue-600 hover:bg-blue-700"
                    >
                      Preview Reassign
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() => {
                    setSelectedQR(qrCode)
                    setSelectedBusiness('')
                    setAssignmentNotes('')
                    setShowPreviewModal(true)
                  }}
                  className="w-full bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#009d5f] text-black font-semibold"
                >
                  Preview Assignment
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Preview Modal */}
      {showPreviewModal && selectedQR && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowPreviewModal(false)}>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-4">
              Preview QR Assignment
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  QR Code Details
                </label>
                <div className="bg-slate-700 border border-slate-600 rounded-lg p-3">
                  <p className="text-white font-medium">{selectedQR.code_name}</p>
                  <p className="text-slate-400 text-sm">{selectedQR.physical_location}</p>
                  <p className="text-slate-400 text-xs mt-1">{getQRTypeDescription(selectedQR.qr_type)}</p>
                  <Badge className={`${getQRTypeColor(selectedQR.qr_type)} text-white mt-2`}>
                    {getQRTypeLabel(selectedQR.qr_type)}
                  </Badge>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Preview Assignment to Business
                </label>
                <select
                  value={selectedBusiness}
                  onChange={(e) => setSelectedBusiness(e.target.value)}
                  className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                  <option value="">Select a business to preview...</option>
                  {businesses.map((business) => (
                    <option key={business.id} value={business.id}>
                      {business.business_name} ({business.business_category})
                    </option>
                  ))}
                </select>
              </div>

              {selectedBusiness && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <h4 className="text-blue-400 font-medium mb-2">Preview Result:</h4>
                  <p className="text-blue-200 text-sm mb-2">
                    When users scan this QR code, they will be taken to:
                  </p>
                  <code className="text-xs text-blue-100 bg-blue-900/50 p-2 rounded block break-all">
                    {generateQRUrl(selectedQR, businesses.find(b => b.id === selectedBusiness)!)}
                  </code>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Preview Notes
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
                  onClick={() => setShowPreviewModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Close Preview
                </Button>
                <Button
                  onClick={previewAssignment}
                  disabled={!selectedBusiness}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-black font-semibold"
                >
                  Test Preview URL
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
