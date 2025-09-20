'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SyncStatusBadge } from './sync-status-badge'
import { useElegantModal } from '@/components/ui/elegant-modal'

interface Contact {
  id: string
  user_id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  business_name: string
  business_type: string
  business_category: string
  business_town: string
  business_address: string
  business_postcode: string
  status: 'incomplete' | 'pending_review' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
  last_ghl_sync: string | null
  ghl_contact_id: string | null
  website?: string
  instagram?: string
  facebook?: string
  referral_source?: string
  goals?: string
  notes?: string
  admin_notes?: string
}

interface ContactsTabProps {
  city: string
  cityDisplayName: string
}

export function ContactsTab({ city, cityDisplayName }: ContactsTabProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [syncingContacts, setSyncingContacts] = useState<Set<string>>(new Set())
  const [isUpdating, setIsUpdating] = useState(false)
  
  const { showSuccess, showError, showConfirm, ModalComponent } = useElegantModal()

  useEffect(() => {
    fetchContacts()
  }, [])

  const fetchContacts = async () => {
    try {
      const response = await fetch('/api/admin/contacts')
      const data = await response.json()
      setContacts(data.contacts || [])
    } catch (error) {
      console.error('Failed to fetch contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = !searchTerm || 
      contact.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.phone?.includes(searchTerm)
    
    const matchesStatus = filterStatus === 'all' || contact.status === filterStatus
    
    return matchesSearch && matchesStatus
  })

  const syncContactWithGHL = async (contactId: string) => {
    setSyncingContacts(prev => new Set([...prev, contactId]))
    
    try {
      const response = await fetch('/api/admin/contacts/sync-ghl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId })
      })
      
      if (response.ok) {
        showSuccess('Sync Complete', 'Contact successfully synced with GHL')
        await fetchContacts() // Refresh to show updated sync status
      } else {
        const error = await response.json()
        showError('Sync Failed', error.error || 'Failed to sync contact with GHL')
      }
    } catch (error) {
      showError('Sync Error', 'An unexpected error occurred during sync')
    } finally {
      setSyncingContacts(prev => {
        const newSet = new Set(prev)
        newSet.delete(contactId)
        return newSet
      })
    }
  }

  const bulkSyncWithGHL = async () => {
    const confirmed = await showConfirm(
      'Bulk Sync Confirmation',
      `Sync all ${filteredContacts.length} contacts with GHL? This may take a few minutes.`
    )
    
    if (!confirmed) return

    try {
      const response = await fetch('/api/admin/contacts/bulk-sync-ghl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contactIds: filteredContacts.map(c => c.id),
          city 
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        showSuccess('Bulk Sync Complete', `Successfully synced ${result.synced} contacts with GHL`)
        await fetchContacts()
      } else {
        const error = await response.json()
        showError('Bulk Sync Failed', error.error || 'Failed to sync contacts with GHL')
      }
    } catch (error) {
      showError('Bulk Sync Error', 'An unexpected error occurred during bulk sync')
    }
  }

  // 🧪 TEST FUNCTION - Remove after debugging
  const testApiCall = async () => {
    try {
      console.log('🧪 Testing API call...')
      
      const testResponse = await fetch('/api/test-contact-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: 'frontend-data' })
      })
      
      const testResult = await testResponse.json()
      console.log('🧪 Test result:', testResult)
      
      const realResponse = await fetch('/api/admin/contacts/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contactId: "247e9c1c-da54-4067-b7c7-c10b52a0d822", 
          updates: { first_name: "FRONTEND", last_name: "TEST" } 
        })
      })
      
      const realResult = await realResponse.json()
      console.log('🧪 Real API result:', realResult)
      
      // Test the simple API too
      const simpleResponse = await fetch('/api/admin/contacts/simple-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contactId: "247e9c1c-da54-4067-b7c7-c10b52a0d822", 
          updates: { first_name: "SIMPLE", last_name: "FRONTEND" } 
        })
      })
      
      const simpleResult = await simpleResponse.json()
      console.log('🧪 Simple API result:', simpleResult)
      
      showSuccess('Test Complete', 'Check console for results')
      
    } catch (error) {
      console.error('🧪 Test failed:', error)
      showError('Test Failed', 'Check console for details')
    }
  }

  const updateContact = async (contactId: string, updates: Partial<Contact>) => {
    // Prevent double-clicking/double submissions
    if (isUpdating) {
      console.log('🚫 Update already in progress, ignoring duplicate request')
      return
    }
    
    try {
      setIsUpdating(true)
      console.log('🔄 Starting contact update:', { contactId, updates })
      console.log('🌐 Current URL:', window.location.href)
      
      const requestBody = { contactId, updates }
      console.log('📤 Request body:', JSON.stringify(requestBody, null, 2))
      
      const response = await fetch(`/api/admin/contacts/update?t=${Date.now()}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify(requestBody)
      })
      
      console.log('📞 Response status:', response.status, response.statusText)
      console.log('📞 Response headers:', Object.fromEntries(response.headers.entries()))
      
      // Check if response is actually JSON
      const contentType = response.headers.get('content-type')
      console.log('📞 Content-Type:', contentType)
      
      if (!contentType || !contentType.includes('application/json')) {
        console.error('❌ Response is not JSON!', contentType)
        showError('Update Failed', 'Server returned invalid response format')
        return
      }
      
      const responseText = await response.text()
      console.log('📞 Raw response text:', responseText)
      
      if (!responseText || responseText.trim() === '') {
        console.error('❌ Empty response!')
        showError('Update Failed', 'Server returned empty response')
        return
      }
      
      let result
      try {
        result = JSON.parse(responseText)
        console.log('📞 Parsed result:', result)
      } catch (parseError) {
        console.error('💥 JSON parse error:', parseError)
        console.error('💥 Failed to parse:', responseText)
        showError('Update Failed', 'Invalid response format from server')
        return
      }
      
      if (response.ok && result && result.success) {
        console.log('✅ Update successful!')
        
        // Simple toast notification instead of modal
        const toast = document.createElement('div')
        toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full'
        toast.innerHTML = `
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span class="font-medium">Contact Updated & Synced to GHL</span>
          </div>
        `
        document.body.appendChild(toast)
        
        // Animate in
        setTimeout(() => toast.classList.remove('translate-x-full'), 100)
        
        // Remove after 3 seconds
        setTimeout(() => {
          toast.classList.add('translate-x-full')
          setTimeout(() => document.body.removeChild(toast), 300)
        }, 3000)
        
        await fetchContacts()
        setIsEditModalOpen(false)
        setSelectedContact(null)
      } else {
        console.error('❌ Update failed:', result)
        const errorMessage = result?.error || result?.message || 'Failed to update contact'
        showError('Update Failed', errorMessage)
      }
    } catch (error) {
      console.error('💥 Update error:', error)
      showError('Update Error', `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsUpdating(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500/20 text-green-300 border-green-500/30'
      case 'pending_review': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
      case 'rejected': return 'bg-red-500/20 text-red-300 border-red-500/30'
      case 'incomplete': return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d083]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">
            📞 {cityDisplayName} Contacts
          </h2>
          <p className="text-slate-400">
            Manage business contacts with GHL sync • {filteredContacts.length} contacts
          </p>
        </div>
        
        <div className="flex gap-3">
          {/* 🧪 TEMPORARY TEST BUTTON */}
          <Button
            onClick={testApiCall}
            className="bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            🧪 Test API
          </Button>
          
          <Button
            onClick={bulkSyncWithGHL}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={filteredContacts.length === 0}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Sync All with GHL
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-[#00d083]"
          />
        </div>
        
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-[#00d083]"
        >
          <option value="all">All Statuses</option>
          <option value="incomplete">Incomplete</option>
          <option value="pending_review">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Contacts Grid */}
      <div className="grid gap-4">
        {filteredContacts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No contacts found</h3>
            <p className="text-slate-400">
              {searchTerm || filterStatus !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Contacts will appear here as businesses sign up'
              }
            </p>
          </div>
        ) : (
          filteredContacts.map((contact) => (
            <Card key={contact.id} className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white truncate">
                        {contact.business_name || 'Unnamed Business'}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(contact.status)}`}>
                        {contact.status.replace('_', ' ').toUpperCase()}
                      </span>
                      {contact.ghl_contact_id && (
                        <span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30">
                          GHL Synced
                        </span>
                      )}
                    </div>

                    {/* Contact Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-slate-300">
                          <span className="font-medium">Owner:</span> {contact.first_name} {contact.last_name}
                        </p>
                        <p className="text-slate-300">
                          <span className="font-medium">Email:</span> {contact.email}
                        </p>
                        <p className="text-slate-300">
                          <span className="font-medium">Phone:</span> {contact.phone}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-300">
                          <span className="font-medium">Type:</span> {contact.business_type}
                        </p>
                        <p className="text-slate-300">
                          <span className="font-medium">Category:</span> {contact.business_category}
                        </p>
                        <p className="text-slate-300">
                          <span className="font-medium">Location:</span> {contact.business_town}
                        </p>
                      </div>
                    </div>

                    {/* Timestamps */}
                    <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                      <span>Created: {formatDate(contact.created_at)}</span>
                      <span>Updated: {formatDate(contact.updated_at)}</span>
                      {contact.last_ghl_sync && (
                        <span>Last GHL Sync: {formatDate(contact.last_ghl_sync)}</span>
                      )}
                    </div>

                    {/* Sync Status */}
                    <div className="mt-2">
                      <SyncStatusBadge
                        businessId={contact.id}
                        businessName={contact.business_name || 'Unknown Business'}
                        ghlStatus={'synced'}
                        lastSync={contact.last_ghl_sync}
                        errors={[]}
                        onForceSync={async (businessId) => {
                          await syncContactWithGHL(businessId)
                        }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedContact(contact)
                        setIsEditModalOpen(true)
                      }}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </Button>
                    
                    <Button
                      size="sm"
                      onClick={() => syncContactWithGHL(contact.id)}
                      disabled={syncingContacts.has(contact.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {syncingContacts.has(contact.id) ? (
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-1" />
                      ) : (
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      )}
                      {syncingContacts.has(contact.id) ? 'Syncing...' : 'Sync GHL'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Contact Modal */}
      {isEditModalOpen && selectedContact && (
        <ContactEditModal
          contact={selectedContact}
          isOpen={isEditModalOpen}
          isUpdating={isUpdating}
          onClose={() => {
            setIsEditModalOpen(false)
            setSelectedContact(null)
          }}
          onSave={(updates) => updateContact(selectedContact.id, updates)}
        />
      )}

      <ModalComponent />
    </div>
  )
}

// Contact Edit Modal Component
function ContactEditModal({ 
  contact, 
  isOpen, 
  isUpdating,
  onClose, 
  onSave 
}: {
  contact: Contact
  isOpen: boolean
  isUpdating: boolean
  onClose: () => void
  onSave: (updates: Partial<Contact>) => void
}) {
  const [formData, setFormData] = useState({
    first_name: contact.first_name || '',
    last_name: contact.last_name || '',
    email: contact.email || '',
    phone: contact.phone || '',
    business_name: contact.business_name || '',
    business_type: contact.business_type || '',
    business_category: contact.business_category || '',
    business_town: contact.business_town || '',
    business_address: contact.business_address || '',
    business_postcode: contact.business_postcode || '',
    website: contact.website || '',
    instagram: contact.instagram || '',
    facebook: contact.facebook || '',
    admin_notes: contact.admin_notes || ''
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-700">
          <h3 className="text-xl font-bold text-white">Edit Contact</h3>
          <p className="text-slate-400">Changes will be synced to GHL automatically</p>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">First Name</label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-[#00d083]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Last Name</label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-[#00d083]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-[#00d083]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-[#00d083]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Business Name</label>
            <input
              type="text"
              value={formData.business_name}
              onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-[#00d083]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Admin Notes</label>
            <textarea
              value={formData.admin_notes}
              onChange={(e) => setFormData({ ...formData, admin_notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-[#00d083] resize-none"
              placeholder="Internal notes (not synced to GHL)"
            />
          </div>
        </div>

        <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} className="border-slate-600 text-slate-300">
            Cancel
          </Button>
          <Button 
            onClick={() => {
              console.log('💾 Save button clicked with data:', formData)
              onSave(formData)
            }}
            disabled={isUpdating}
            className="bg-[#00d083] hover:bg-[#00b86f] text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdating ? 'Updating...' : 'Save & Sync to GHL'}
          </Button>
        </div>
      </div>
    </div>
  )
}
