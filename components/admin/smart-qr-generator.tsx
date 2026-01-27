'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// Using native select for simplicity
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { QRCodeCanvas as QRCode } from 'qrcode.react'
import { useElegantModal } from '@/components/ui/elegant-modal'
import { Download } from 'lucide-react'

interface Business {
  id: string
  business_name: string
  business_tier: string
  slug: string
}

interface GeneratedQR {
  id: string
  code_name: string
  qr_type: 'discover' | 'offers' | 'secret-menu' | 'other'
  business_name: string
  business_id: string
  generated_url: string
  created_at: string
  scans: number
}

interface SmartQRGeneratorProps {
  city: string
}

export function SmartQRGenerator({ city }: SmartQRGeneratorProps) {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [generatedCodes, setGeneratedCodes] = useState<GeneratedQR[]>([])
  const [loading, setLoading] = useState(false)

  // Generator State
  const [selectedBusiness, setSelectedBusiness] = useState('')
  const [qrType, setQrType] = useState<'discover' | 'offers' | 'secret-menu' | 'other'>('discover')
  const [logoUrl, setLogoUrl] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generatedQrData, setGeneratedQrData] = useState<string | null>(null)
  
  // Business search state
  const [businessSearch, setBusinessSearch] = useState('')
  const [showBusinessDropdown, setShowBusinessDropdown] = useState(false)

  const { showSuccess, showError, ModalComponent } = useElegantModal()

  // Download QR code as high-resolution image
  const downloadQRCode = (url: string, filename: string, size: number = 1000) => {
    // Create a canvas element for high-resolution QR code
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      showError('Unable to create high-resolution QR code. Please try again.')
      return
    }

    // Set high resolution canvas size
    canvas.width = size
    canvas.height = size
    
    // Create QR code using qrcode library for better print quality
    import('qrcode').then(QRCodeLib => {
      QRCodeLib.toCanvas(canvas, url, {
        width: size,
        margin: 4,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'H' // High error correction for print durability
      }, (error) => {
        if (error) {
          showError('Failed to generate high-resolution QR code.')
          return
        }

        // Convert canvas to blob and download
        canvas.toBlob((blob) => {
          if (!blob) return
          
          const downloadUrl = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = downloadUrl
          link.download = `${filename}.png`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(downloadUrl)
          
          showSuccess(`High-resolution QR code saved as ${filename}.png`)
        }, 'image/png')
      })
    }).catch(() => {
      showError('QR code library not available. Please try again.')
    })
  }

  useEffect(() => {
    fetchSpotlightBusinesses()
    fetchGeneratedCodes()
  }, [city])

  const fetchSpotlightBusinesses = async () => {
    setLoading(true)
    try {
      const supabase = createClientComponentClient()
      const { data, error } = await supabase
        .from('business_profiles')
        .select('id, business_name, business_tier, slug')
        .eq('city', city)
        .eq('status', 'approved')
        .eq('business_tier', 'spotlight') // Only Spotlight businesses get deep linking
      
      if (error) throw error
      setBusinesses(data || [])
    } catch (error) {
      console.error('Error fetching Spotlight businesses:', error)
      // Mock data for demo
      setBusinesses([
        { id: '1', business_name: "Jerry's Burgers", business_tier: 'spotlight', slug: 'jerrys-burgers' },
        { id: '2', business_name: "The Cozy Cafe", business_tier: 'spotlight', slug: 'the-cozy-cafe' }
      ])
    } finally {
      setLoading(false)
    }
  }

  const fetchGeneratedCodes = async () => {
    // For now, use mock data - we'll connect to database later
    const mockCodes: GeneratedQR[] = [
      {
        id: '1',
        code_name: 'jerry-discover-001',
        qr_type: 'discover',
        business_name: "Jerry's Burgers",
        business_id: '1',
        generated_url: 'https://bournemouth.qwikker.com/intent/jerry-discover-001',
        created_at: '2025-01-21',
        scans: 23
      },
      {
        id: '2',
        code_name: 'jerry-offers-001',
        qr_type: 'offers',
        business_name: "Jerry's Burgers", 
        business_id: '1',
        generated_url: 'https://bournemouth.qwikker.com/intent/jerry-offers-001',
        created_at: '2025-01-20',
        scans: 45
      }
    ]
    setGeneratedCodes(mockCodes)
  }

  const generateSmartQR = async () => {
    if (!selectedBusiness || !qrType) {
      showError('Please select a business and QR type')
      return
    }

    setGenerating(true)
    try {
      const business = businesses.find(b => b.id === selectedBusiness)
      if (!business) throw new Error('Business not found')

      // Auto-generate code name
      const businessSlug = business.business_name.toLowerCase().replace(/[^a-z0-9]/g, '-')
      const timestamp = Date.now().toString().slice(-3) // Last 3 digits for uniqueness
      const codeName = `${businessSlug}-${qrType}-${timestamp}`
      
      // Auto-generate URL
      const generatedUrl = `https://bournemouth.qwikker.com/intent/${codeName}`
      
      // Generate QR code image data
      let qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(generatedUrl)}`
      if (logoUrl) {
        qrImageUrl += `&logo=${encodeURIComponent(logoUrl)}`
      }

      // TODO: Save to database
      // For now, add to mock data
      const newQR: GeneratedQR = {
        id: (generatedCodes.length + 1).toString(),
        code_name: codeName,
        qr_type: qrType,
        business_name: business.business_name,
        business_id: business.id,
        generated_url: generatedUrl,
        created_at: new Date().toISOString().split('T')[0],
        scans: 0
      }

      setGeneratedCodes(prev => [newQR, ...prev])
      setGeneratedQrData(generatedUrl)
      
      showSuccess(`QR Code generated for ${business.business_name}!`)
      
      // Reset form
      setSelectedBusiness('')
      setQrType('discover')
      setLogoUrl('')
      
    } catch (error: any) {
      console.error('Error generating QR:', error)
      showError(`Failed to generate QR: ${error.message}`)
    } finally {
      setGenerating(false)
    }
  }

  const getQRTypeLabel = (type: string) => {
    switch (type) {
      case 'discover': return 'Discover Business'
      case 'offers': return 'View Offers'
      case 'secret-menu': return 'Secret Menu'
      case 'other': return 'Other'
      default: return type
    }
  }

  const getQRTypeDescription = (type: string) => {
    switch (type) {
      case 'discover': return 'Takes users to business card/hero on user dashboard'
      case 'offers': return 'Auto-scrolls to business offers page'
      case 'secret-menu': return 'Auto-scrolls to business secret menu'
      case 'other': return 'Custom routing (you can edit URL later)'
      default: return ''
    }
  }

  return (
    <div className="space-y-8">
      {/* Generator */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white text-2xl flex items-center gap-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            Smart QR Generator
          </CardTitle>
          <p className="text-slate-400">Generate deep-linking QR codes for Spotlight businesses</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Business Selection - Searchable */}
          <div className="relative">
            <Label className="text-slate-300 mb-2 block">Select Spotlight Business</Label>
            {loading ? (
              <p className="text-slate-400">Loading businesses...</p>
            ) : (
              <div className="relative">
                {/* Search Input */}
                <Input
                  type="text"
                  value={businessSearch}
                  onChange={(e) => {
                    setBusinessSearch(e.target.value)
                    setShowBusinessDropdown(true)
                  }}
                  onFocus={() => setShowBusinessDropdown(true)}
                  placeholder="Search businesses..."
                  className="bg-slate-700 border-slate-600 text-white pr-10"
                />
                
                {/* Search Icon */}
                <svg 
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400"
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>

                {/* Dropdown */}
                {showBusinessDropdown && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowBusinessDropdown(false)}
                    />
                    
                    {/* Dropdown Content */}
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto bg-slate-800 border border-slate-600 rounded-lg shadow-lg">
                      {businesses
                        .filter(business => 
                          business.business_name.toLowerCase().includes(businessSearch.toLowerCase())
                        )
                        .map(business => (
                          <button
                            key={business.id}
                            type="button"
                            onClick={() => {
                              setSelectedBusiness(business.id)
                              setBusinessSearch(business.business_name)
                              setShowBusinessDropdown(false)
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-slate-700 text-white border-b border-slate-700 last:border-b-0"
                          >
                            <div className="font-medium">{business.business_name}</div>
                            <div className="text-xs text-slate-400">Spotlight Tier</div>
                          </button>
                        ))
                      }
                      
                      {/* No results */}
                      {businesses.filter(business => 
                        business.business_name.toLowerCase().includes(businessSearch.toLowerCase())
                      ).length === 0 && (
                        <div className="px-4 py-3 text-slate-400 text-sm">
                          No businesses found matching "{businessSearch}"
                        </div>
                      )}
                    </div>
                  </>
                )}
                
                {/* Selected Business Display */}
                {selectedBusiness && !showBusinessDropdown && (
                  <div className="mt-2 p-2 bg-slate-800 border border-slate-600 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white font-medium">
                          {businesses.find(b => b.id === selectedBusiness)?.business_name}
                        </div>
                        <div className="text-xs text-slate-400">Selected for QR generation</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBusiness('')
                          setBusinessSearch('')
                        }}
                        className="text-slate-400 hover:text-white"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* QR Type Selection */}
          <div>
            <Label className="text-slate-300 mb-2 block">QR Code Type</Label>
            <select
              value={qrType}
              onChange={(e) => setQrType(e.target.value as 'discover' | 'offers' | 'secret-menu' | 'other')}
              className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
            >
              <option value="discover">Discover Business</option>
              <option value="offers">View Offers</option>
              <option value="secret-menu">Secret Menu</option>
              <option value="other">Other</option>
            </select>
            <p className="text-xs text-slate-400 mt-1">
              {getQRTypeDescription(qrType)}
            </p>
          </div>

          {/* Logo URL (Optional) */}
          <div>
            <Label className="text-slate-300 mb-2 block">Business Logo URL (Optional)</Label>
            <Input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="bg-slate-700 border-slate-600 text-white"
            />
            <p className="text-xs text-slate-400 mt-1">
              Adds business logo to center of QR code
            </p>
          </div>

          {/* Generate Button */}
          <Button
            onClick={generateSmartQR}
            disabled={generating || !selectedBusiness}
            className="w-full bg-[#00d083] hover:bg-[#00b86f] text-black font-bold py-3"
          >
            {generating ? 'Generating...' : 'Generate Smart QR Code'}
          </Button>

          {/* Preview */}
          {generatedQrData && (
            <div className="text-center p-6 bg-slate-800 border border-slate-700 rounded-lg">
              <h4 className="text-white text-lg font-semibold mb-4">✅ QR Code Generated!</h4>
              <div className="bg-white p-4 inline-block rounded-lg mb-4">
                <QRCode value={generatedQrData} size={200} level="H" includeMargin={true} />
              </div>
              <p className="text-slate-400 text-sm break-all mb-4">{generatedQrData}</p>
              
              {/* Test Button */}
              <div className="flex gap-3 justify-center mb-4">
                <Button
                  onClick={() => window.open(generatedQrData, '_blank')}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2"
                >
                  🧪 Test QR Code
                </Button>
                <Button
                  onClick={() => navigator.clipboard.writeText(generatedQrData)}
                  variant="outline"
                  className="text-slate-300 border-slate-600 hover:bg-slate-700"
                >
                  Copy URL
                </Button>
                <Button
                  onClick={() => {
                    const selectedBusinessData = businesses.find(b => b.id === selectedBusiness)
                    const filename = `qr-${selectedBusinessData?.business_name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${qrType}-print-ready`
                    downloadQRCode(generatedQrData, filename, 2000) // 2000px for high-res print
                  }}
                  className="bg-[#00d083] hover:bg-[#00b570] text-white px-4 py-2 flex items-center gap-2"
                >
                  <Download size={16} />
                  Download Print-Ready
                </Button>
              </div>
              
              <p className="text-[#00d083] text-xs">Ready to print - 2000px high-resolution PNG</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generated QR Codes List */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white text-xl flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Generated QR Codes ({generatedCodes.length})
          </CardTitle>
          <p className="text-slate-400">Manage your Spotlight business QR codes</p>
        </CardHeader>
        <CardContent>
          {generatedCodes.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No QR codes generated yet</p>
          ) : (
            <div className="space-y-4">
              {generatedCodes.map(code => (
                <div key={code.id} className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-semibold">{code.business_name}</h4>
                      <p className="text-slate-400 text-sm">{getQRTypeLabel(code.qr_type)} • {code.code_name}</p>
                      <p className="text-slate-500 text-xs">Generated: {code.created_at} • Scans: {code.scans}</p>
                    </div>
                    <div className="text-right">
                      <div className="bg-white p-2 rounded-lg inline-block mb-2">
                        <QRCode value={code.generated_url} size={80} level="L" />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => window.open(code.generated_url, '_blank')}
                          className="text-blue-400 border-blue-400 hover:bg-blue-400 hover:text-white"
                        >
                          🧪 Test
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => {
                            const filename = `qr-${code.business_name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${code.qr_type}-print-ready`
                            downloadQRCode(code.generated_url, filename, 2000)
                          }}
                          className="text-[#00d083] border-[#00d083] hover:bg-[#00d083] hover:text-white flex items-center gap-1"
                        >
                          <Download size={14} />
                          Download
                        </Button>
                        <Button size="sm" variant="outline" className="text-slate-300 border-slate-600 hover:bg-slate-700">
                          Edit
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ModalComponent />
    </div>
  )
}
