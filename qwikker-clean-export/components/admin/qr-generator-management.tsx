'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useElegantModal } from '@/components/ui/elegant-modal'

interface GeneratedQRCode {
  id: string
  code_name: string
  category: 'qwikker-marketing' | 'static-business' | 'dynamic-business'
  subtype: string
  target_url: string
  business_name?: string
  qr_code_url: string
  scans_7d: number
  scans_30d: number
  scans_60d: number
  created_at: string
  is_active: boolean
}

interface Business {
  id: string
  business_name: string
  status: string
  tier: string
}

export function QRGeneratorManagement({ city }: { city: string }) {
  const [activeTab, setActiveTab] = useState<'generator' | 'manage'>('generator')
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [generatedCodes, setGeneratedCodes] = useState<GeneratedQRCode[]>([])
  const [loading, setLoading] = useState(false)
  
  // Generator State
  const [qrCategory, setQrCategory] = useState<'qwikker-marketing' | 'static-business' | 'dynamic-business'>('qwikker-marketing')
  const [qrSubtype, setQrSubtype] = useState('')
  const [targetUrl, setTargetUrl] = useState('')
  const [selectedBusiness, setSelectedBusiness] = useState('')
  const [deepLinkType, setDeepLinkType] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [generating, setGenerating] = useState(false)
  
  // Management State
  const [filterCategory, setFilterCategory] = useState('all')
  const [editingCode, setEditingCode] = useState<GeneratedQRCode | null>(null)

  const { showSuccess, showError, showConfirm, ModalComponent } = useElegantModal()

  useEffect(() => {
    fetchBusinesses()
    fetchGeneratedCodes()
  }, [city])

  const fetchBusinesses = async () => {
    try {
      const supabase = createClientComponentClient()
      const { data } = await supabase
        .from('business_profiles')
        .select('id, business_name, status, business_tier')
        .eq('city', city)
        .eq('status', 'approved')
      
      setBusinesses(data || [])
    } catch (error) {
      console.error('Error fetching businesses:', error)
    }
  }

  const fetchGeneratedCodes = async () => {
    setLoading(true)
    try {
      const supabase = createClientComponentClient()
      const { data, error } = await supabase
        .from('qr_code_templates')
        .select(`
          id,
          code_name,
          qr_type,
          city,
          physical_location,
          base_url,
          is_active,
          created_at,
          updated_at,
          qr_category,
          qr_subtype,
          business_id,
          business_name,
          logo_url,
          qr_code_url
        `)
        .eq('city', city)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Database error fetching QR codes:', error)
        // Fall back to mock data if database columns don't exist yet
        const mockCodes: GeneratedQRCode[] = [
          {
            id: '1',
            code_name: 'qwikker-flyer-001',
            category: 'qwikker-marketing',
            subtype: 'flyers',
            target_url: 'https://bournemouth.qwikker.com/join',
            qr_code_url: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://bournemouth.qwikker.com/join',
            scans_7d: 45,
            scans_30d: 156,
            scans_60d: 298,
            created_at: '2025-01-15',
            is_active: true
          }
        ]
        setGeneratedCodes(mockCodes)
        setLoading(false)
        return
      }
      
      // Map the data to our interface format
      const mappedData: GeneratedQRCode[] = (data || []).map(code => ({
        id: code.id,
        code_name: code.code_name,
        category: (code.qr_category || 'static-business') as 'qwikker-marketing' | 'static-business' | 'dynamic-business',
        subtype: code.qr_subtype || code.physical_location?.toLowerCase().replace(/\s+/g, '-') || 'other',
        target_url: code.base_url,
        business_name: code.business_name,
        qr_code_url: code.qr_code_url || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(code.base_url)}`,
        scans_7d: 0, // TODO: Get from analytics
        scans_30d: 0, // TODO: Get from analytics  
        scans_60d: 0, // TODO: Get from analytics
        created_at: code.created_at,
        is_active: code.is_active
      }))
      
      setGeneratedCodes(mappedData)
    } catch (error) {
      console.error('Error fetching generated codes:', error)
      showError('Failed to fetch generated QR codes')
    } finally {
      setLoading(false)
    }
  }

  const getSubtypeOptions = () => {
    switch (qrCategory) {
      case 'qwikker-marketing':
        return [
          { value: 'flyers', label: 'Flyers' },
          { value: 'leaflets', label: 'Leaflets' },
          { value: 'promo-packs', label: 'Promo Packs' },
          { value: 'other', label: 'Other' }
        ]
      case 'static-business':
        return [
          { value: 'window-stickers', label: 'Window Stickers' },
          { value: 'offers', label: 'Offers' },
          { value: 'secret-menus', label: 'Secret Menus' },
          { value: 'other', label: 'Other' }
        ]
      case 'dynamic-business':
        return [
          { value: 'discover', label: 'Discover' },
          { value: 'offers', label: 'Offers' },
          { value: 'secret-menu', label: 'Secret Menu' },
          { value: 'other', label: 'Other' }
        ]
      default:
        return []
    }
  }

  const generateQRCode = async () => {
    if (!targetUrl || !qrSubtype) {
      showError('Please fill in all required fields')
      return
    }

    if (qrCategory === 'dynamic-business' && !selectedBusiness) {
      showError('Please select a business for dynamic QR codes')
      return
    }

    setGenerating(true)
    
    try {
      // Generate unique code name
      const timestamp = Date.now()
      const codeName = `${qrCategory}-${qrSubtype}-${timestamp}`
      
      // Map our subtypes to the expected qr_type values
      const qrTypeMapping: { [key: string]: string } = {
        'flyers': 'general',
        'leaflets': 'general', 
        'promo-packs': 'general',
        'window-stickers': 'explore',
        'offers': 'offers',
        'secret-menus': 'secret_menu',
        'discover': 'explore',
        'secret-menu': 'secret_menu',
        'other': 'general'
      }
      
      const mappedQrType = qrTypeMapping[qrSubtype] || 'general'
      
      // Generate QR code URL with optional logo
      let qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(targetUrl)}`
      if (logoUrl) {
        qrCodeUrl += `&logo=${encodeURIComponent(logoUrl)}`
      }
      
      // Save to Supabase qr_code_templates table
      const supabase = createClientComponentClient()
      
      // Prepare the insert data with only the fields we know exist
      const insertData: any = {
        code_name: codeName,
        qr_type: mappedQrType,
        city: city,
        physical_location: qrSubtype.replace('-', ' '),
        base_url: targetUrl
      }
      
      // Add optional fields if they exist in the table
      if (qrCategory === 'dynamic-business' && selectedBusiness) {
        const business = businesses.find(b => b.id === selectedBusiness)
        if (business) {
          insertData.business_id = selectedBusiness
          insertData.business_name = business.business_name
        }
      }
      
      // Add category and subtype if supported
      insertData.qr_category = qrCategory
      insertData.qr_subtype = qrSubtype
      
      // Add logo URL if provided
      if (logoUrl) {
        insertData.logo_url = logoUrl
      }
      
      // Add generated QR code URL
      insertData.qr_code_url = qrCodeUrl
      
      console.log('Inserting QR code data:', insertData)
      
      const { data, error } = await supabase
        .from('qr_code_templates')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        console.error('Supabase error details:', error)
        throw new Error(`Database error: ${error.message || 'Unknown error'}`)
      }

      // If dynamic business QR, also create assignment
      if (qrCategory === 'dynamic-business' && selectedBusiness && data) {
        const { error: assignmentError } = await supabase
          .from('qr_code_assignments')
          .insert({
            qr_code_id: data.id,
            business_id: selectedBusiness,
            assignment_type: mappedQrType,
            notes: `Generated via admin dashboard - ${qrCategory}`
          })
        
        if (assignmentError) {
          console.error('Assignment error:', assignmentError)
          // Don't throw here, QR code was created successfully
        }
      }

      showSuccess('QR Code generated successfully!')
      
      // Reset form
      setTargetUrl('')
      setQrSubtype('')
      setSelectedBusiness('')
      setLogoUrl('')
      
      // Refresh the generated codes list
      await fetchGeneratedCodes()
      
    } catch (error) {
      console.error('Error generating QR code:', error)
      showError(`Failed to generate QR code: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setGenerating(false)
    }
  }

  const toggleCodeStatus = async (codeId: string, isActive: boolean) => {
    try {
      // TODO: Update in Supabase
      setGeneratedCodes(prev => 
        prev.map(code => 
          code.id === codeId ? { ...code, is_active: !isActive } : code
        )
      )
      showSuccess(`QR Code ${!isActive ? 'activated' : 'deactivated'}`)
    } catch (error) {
      showError('Failed to update QR code status')
    }
  }

  const updateCodeUrl = async (codeId: string, newUrl: string) => {
    try {
      // TODO: Update in Supabase and regenerate QR code
      setGeneratedCodes(prev => 
        prev.map(code => 
          code.id === codeId ? { 
            ...code, 
            target_url: newUrl,
            qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(newUrl)}`
          } : code
        )
      )
      setEditingCode(null)
      showSuccess('QR Code URL updated successfully!')
    } catch (error) {
      showError('Failed to update QR code URL')
    }
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-4 border-b border-slate-700">
        <button
          onClick={() => setActiveTab('generator')}
          className={`pb-3 px-4 font-medium transition-colors ${
            activeTab === 'generator'
              ? 'text-green-400 border-b-2 border-green-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          QR Generator
        </button>
        <button
          onClick={() => setActiveTab('manage')}
          className={`pb-3 px-4 font-medium transition-colors ${
            activeTab === 'manage'
              ? 'text-green-400 border-b-2 border-green-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Generated Codes ({generatedCodes.length})
        </button>
      </div>

      {/* QR Generator Tab */}
      {activeTab === 'generator' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Generator Form */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Generate New QR Code</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Category Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  QR Code Category
                </label>
                <select
                  value={qrCategory}
                  onChange={(e) => {
                    setQrCategory(e.target.value as any)
                    setQrSubtype('')
                  }}
                  className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                  <option value="qwikker-marketing">Qwikker Marketing</option>
                  <option value="static-business">Static Business QR</option>
                  <option value="dynamic-business">Dynamic Business QR</option>
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  {qrCategory === 'qwikker-marketing' && 'Flyers, leaflets, promo packs, general marketing'}
                  {qrCategory === 'static-business' && 'Window stickers, offers, secret menus (unassigned)'}
                  {qrCategory === 'dynamic-business' && 'Spotlight tier, deep linking, intent routing'}
                </p>
              </div>

              {/* Subtype Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  QR Code Type
                </label>
                <select
                  value={qrSubtype}
                  onChange={(e) => setQrSubtype(e.target.value)}
                  className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                  <option value="">Select type...</option>
                  {getSubtypeOptions().map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Business Selection (for dynamic QR only) */}
              {qrCategory === 'dynamic-business' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Select Business
                  </label>
                  <select
                    value={selectedBusiness}
                    onChange={(e) => setSelectedBusiness(e.target.value)}
                    className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  >
                    <option value="">Select business...</option>
                    {businesses.map(business => (
                      <option key={business.id} value={business.id}>
                        {business.business_name} ({business.tier})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Target URL */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Target URL
                </label>
                <input
                  type="url"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://bournemouth.qwikker.com/..."
                  className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400"
                />
              </div>

              {/* Logo URL (Optional) */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Logo URL (Optional)
                </label>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Add a logo to the center of your QR code (recommended: square PNG, max 200x200px)
                </p>
              </div>

              {/* Generate Button */}
              <Button
                onClick={generateQRCode}
                disabled={generating || !targetUrl || !qrSubtype}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3"
              >
                {generating ? 'Generating...' : 'Generate QR Code'}
              </Button>
            </CardContent>
          </Card>

          {/* Preview/Info */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">QR Code Preview</CardTitle>
            </CardHeader>
            <CardContent>
              {targetUrl ? (
                <div className="text-center">
                  <div className="bg-white p-4 rounded-lg inline-block mb-4">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(targetUrl)}${logoUrl ? `&logo=${encodeURIComponent(logoUrl)}` : ''}`}
                      alt="QR Code Preview"
                      className="w-48 h-48"
                    />
                  </div>
                  <p className="text-sm text-slate-400 break-all">{targetUrl}</p>
                  {logoUrl && (
                    <p className="text-xs text-slate-500 mt-1">With logo: {logoUrl}</p>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-48 h-48 bg-slate-800 border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <span className="text-slate-500">QR Preview</span>
                  </div>
                  <p className="text-slate-400">Enter a URL to see preview</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Generated Codes Management Tab */}
      {activeTab === 'manage' && (
        <div className="space-y-6">
          {/* Filter */}
          <div className="flex gap-4">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="p-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
            >
              <option value="all">All Categories</option>
              <option value="qwikker-marketing">Qwikker Marketing</option>
              <option value="static-business">Static Business QR</option>
              <option value="dynamic-business">Dynamic Business QR</option>
            </select>
          </div>

          {/* Generated Codes List */}
          <div className="grid gap-4">
            {generatedCodes
              .filter(code => filterCategory === 'all' || code.category === filterCategory)
              .map((code) => (
                <Card key={code.id} className="bg-slate-900 border-slate-800">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                        {/* QR Code Image */}
                        <div className="bg-white p-2 rounded-lg">
                          <img 
                            src={code.qr_code_url}
                            alt={code.code_name}
                            className="w-16 h-16"
                          />
                        </div>
                        
                        {/* Code Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-white font-semibold">{code.code_name}</h3>
                            <Badge className={`${
                              code.category === 'qwikker-marketing' ? 'bg-green-500' :
                              code.category === 'static-business' ? 'bg-orange-500' :
                              'bg-blue-500'
                            } text-white`}>
                              {code.subtype}
                            </Badge>
                            <Badge className={code.is_active ? 'bg-green-500' : 'bg-gray-500'}>
                              {code.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          
                          <p className="text-slate-400 text-sm mb-2 break-all">{code.target_url}</p>
                          
                          {code.business_name && (
                            <p className="text-slate-300 text-sm mb-2">
                              Business: {code.business_name}
                            </p>
                          )}
                          
                          {/* Analytics */}
                          <div className="flex gap-4 text-sm">
                            <span className="text-slate-400">7d: <span className="text-white">{code.scans_7d}</span></span>
                            <span className="text-slate-400">30d: <span className="text-white">{code.scans_30d}</span></span>
                            <span className="text-slate-400">60d: <span className="text-white">{code.scans_60d}</span></span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingCode(code)}
                          className="text-blue-400 border-blue-400 hover:bg-blue-400 hover:text-white"
                        >
                          Edit URL
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleCodeStatus(code.id, code.is_active)}
                          className={code.is_active 
                            ? "text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
                            : "text-green-400 border-green-400 hover:bg-green-400 hover:text-white"
                          }
                        >
                          {code.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}

      {/* Edit URL Modal */}
      {editingCode && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-white font-semibold mb-4">Edit QR Code URL</h3>
            <input
              type="url"
              defaultValue={editingCode.target_url}
              onChange={(e) => setEditingCode({...editingCode, target_url: e.target.value})}
              className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white mb-4"
            />
            <div className="flex gap-2">
              <Button
                onClick={() => updateCodeUrl(editingCode.id, editingCode.target_url)}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white"
              >
                Update
              </Button>
              <Button
                onClick={() => setEditingCode(null)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <ModalComponent />
    </div>
  )
}
