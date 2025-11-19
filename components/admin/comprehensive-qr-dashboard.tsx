'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { getApprovedBusinessesForQR, QRBusiness } from '@/lib/actions/qr-management-actions'
import { debugBusinessData } from '@/lib/actions/debug-businesses'
import { QRCodeCanvas as QRCode } from 'qrcode.react'
import { useElegantModal } from '@/components/ui/elegant-modal'
import { Download, Search, Filter, Eye } from 'lucide-react'

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
  qr_category: 'qwikker-marketing' | 'static-business' | 'intent-routing'
  qr_subtype: string
  business_name?: string
  business_id?: string
  generated_url: string
  created_at: string
  scans_7d: number
  scans_30d: number
  scans_60d: number
}

interface ComprehensiveQRDashboardProps {
  city: string
}

export function ComprehensiveQRDashboard({ city }: ComprehensiveQRDashboardProps) {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [generatedCodes, setGeneratedCodes] = useState<GeneratedQR[]>([])
  const [loading, setLoading] = useState(false)
  const [activeSection, setActiveSection] = useState<'qwikker-marketing' | 'static-business' | 'intent-routing'>('qwikker-marketing')
  
  // Generator State
  const [selectedBusiness, setSelectedBusiness] = useState('')
  const [qrType, setQrType] = useState<'discover' | 'offers' | 'secret-menu' | 'other'>('discover')
  const [qrSubtype, setQrSubtype] = useState('')
  const [targetUrl, setTargetUrl] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generatedQrData, setGeneratedQrData] = useState<string | null>(null)
  
  // Search and Filter
  const [searchTerm, setSearchTerm] = useState('')
  const [businessSearch, setBusinessSearch] = useState('')
  const [showBusinessDropdown, setShowBusinessDropdown] = useState(false)
  
  // Edit URL functionality
  const [editingCode, setEditingCode] = useState<GeneratedQR | null>(null)
  const [editUrl, setEditUrl] = useState('')

  const { showSuccess, showError, ModalComponent } = useElegantModal()

  useEffect(() => {
    fetchAllBusinesses()
    fetchGeneratedCodes()
  }, [city])

  // Auto-refresh businesses every 30 seconds to catch tier upgrades
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAllBusinesses()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [city])

  // Refresh businesses data periodically or when needed
  const refreshBusinesses = async () => {
    await fetchAllBusinesses()
    showSuccess('Business list refreshed!')
  }

  const fetchAllBusinesses = async () => {
    setLoading(true)
    
    try {
      console.log(`🔍 Fetching businesses for city: ${city}`)
      
      // 🐛 DEBUG: Check what businesses actually exist
      const debugData = await debugBusinessData()
      console.log('🐛 DEBUG DATA:', debugData)
      
      // Use server action to fetch businesses (bypasses RLS issues)
      const businesses = await getApprovedBusinessesForQR(city)
      
      console.log('📊 Server action result:', { 
        count: businesses.length,
        city: city.toLowerCase(),
        businesses: businesses.map(b => b.business_name)
      })
      
      if (businesses.length > 0) {
        console.log(`✅ Found ${businesses.length} businesses for ${city}:`, businesses.map(b => b.business_name))
        setBusinesses(businesses)
      } else {
        console.log(`ℹ️ No approved businesses found for ${city}`)
        // If no businesses found, show what we have in debug data
        if (debugData.allBusinesses.length > 0) {
          console.log('🔍 But we found these businesses in debug:', debugData.allBusinesses)
        }
        setBusinesses([])
      }
    } catch (error) {
      console.error('❌ Error fetching businesses:', error)
      setBusinesses([])
    } finally {
      setLoading(false)
    }
  }

  const fetchGeneratedCodes = async () => {
    // Always start with mock data for now since database structure is inconsistent
    const mockCodes: GeneratedQR[] = [
      {
        id: '1',
        code_name: 'qwikker-marketing-flyers-001',
        qr_type: 'other',
        qr_category: 'qwikker-marketing',
        qr_subtype: 'flyers',
        generated_url: 'https://bournemouth.qwikker.com/join',
        created_at: new Date().toLocaleDateString(),
        scans_7d: 45,
        scans_30d: 156,
        scans_60d: 289
      },
        {
          id: '2',
          code_name: 'fuck-cursor-offers-001',
          qr_type: 'offers',
          qr_category: 'intent-routing',
          qr_subtype: 'offers',
          business_name: "Fuck Cursor",
          business_id: 'fuck-cursor-id',
          generated_url: 'https://bournemouth.qwikker.com/user/offers?highlight=fuck-cursor',
          created_at: new Date().toLocaleDateString(),
          scans_7d: 23,
          scans_30d: 89,
          scans_60d: 145
        },
      {
        id: '3',
        code_name: 'static-business-window-stickers-001',
        qr_type: 'other',
        qr_category: 'static-business',
        qr_subtype: 'window-stickers',
        generated_url: 'https://bournemouth.qwikker.com/discover',
        created_at: new Date().toLocaleDateString(),
        scans_7d: 12,
        scans_30d: 67,
        scans_60d: 134
      }
    ]

    setGeneratedCodes(mockCodes)

    // Fetch from database using CORRECT table name (qr_codes)
    try {
      const supabase = createClientComponentClient()
      
      const { data, error } = await supabase
        .from('qr_codes')
        .select(`
          id,
          qr_code,
          name,
          qr_type,
          category,
          current_target_url,
          business_id,
          city,
          total_scans,
          created_at
        `)
        .eq('city', city)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
      
      if (data && data.length > 0) {
        console.log('✅ Found QR codes in database:', data.length)
        
        // Transform database data to UI format
        const transformedCodes: GeneratedQR[] = data.map(qr => ({
          id: qr.id,
          code_name: qr.qr_code,
          qr_type: qr.qr_type === 'marketing' ? 'other' : qr.qr_type as any,
          qr_category: qr.qr_type === 'marketing' ? 'qwikker-marketing' : 'static-business',
          qr_subtype: qr.category,
          business_id: qr.business_id || undefined,
          generated_url: qr.current_target_url,
          created_at: new Date(qr.created_at).toLocaleDateString(),
          scans_7d: qr.total_scans || 0,
          scans_30d: qr.total_scans || 0,
          scans_60d: qr.total_scans || 0
        }))
        
        setGeneratedCodes(transformedCodes)
        return
      }
    } catch (error) {
      console.error('❌ Error fetching QR codes:', error)
    }
  }

  // Download QR code as high-resolution image with optional logo
  const downloadQRCode = (url: string, filename: string, size: number = 2000, logo?: string) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      showError('Unable to create high-resolution QR code. Please try again.')
      return
    }

    canvas.width = size
    canvas.height = size
    
    import('qrcode').then(QRCodeLib => {
      QRCodeLib.toCanvas(canvas, url, {
        width: size,
        margin: 4,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'H' // High error correction for logo overlay
      }, (error) => {
        if (error) {
          showError('Failed to generate high-resolution QR code.')
          return
        }

        // Add logo if provided
        if (logo) {
          const logoImg = new Image()
          logoImg.crossOrigin = 'anonymous'
          logoImg.onload = () => {
            const logoSize = size * 0.2 // Logo is 20% of QR size
            const logoX = (size - logoSize) / 2
            const logoY = (size - logoSize) / 2
            
            // Draw white circle background for logo
            ctx.fillStyle = '#FFFFFF'
            ctx.beginPath()
            ctx.arc(size / 2, size / 2, logoSize / 2 + 10, 0, 2 * Math.PI)
            ctx.fill()
            
            // Draw logo
            ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize)
            
            saveCanvas()
          }
          logoImg.onerror = () => {
            console.warn('Failed to load logo, saving QR without logo')
            saveCanvas()
          }
          logoImg.src = logo
        } else {
          saveCanvas()
        }

        function saveCanvas() {
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
        }
      })
    }).catch(() => {
      showError('QR code library not available. Please try again.')
    })
  }

  const generateQRCode = async () => {
    if (activeSection === 'intent-routing' && !selectedBusiness) {
      showError('Please select a business for Intent Routing QR codes')
      return
    }
    
    if (!qrSubtype) {
      showError('Please select a QR subtype')
      return
    }

    if (activeSection !== 'intent-routing' && !targetUrl) {
      showError('Please enter a target URL')
      return
    }

    setGenerating(true)
    
    try {
      // Auto-generate code name and URL based on type
      let codeName = ''
      let generatedUrl = ''
      let businessName = ''
      
      // ALWAYS use redirect endpoint for editability!
      codeName = `QWK-${city.substring(0, 3).toUpperCase()}-${qrSubtype.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`
      
      // QR always points to our redirect (EDITABLE!)
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://bournemouth.qwikker.com'
      generatedUrl = `${baseUrl}/api/qr/scan/${codeName}`
      
      // Determine target URL
      let finalTargetUrl = targetUrl
      if (activeSection === 'intent-routing' && selectedBusiness) {
        const selectedBusinessData = businesses.find(b => b.id === selectedBusiness)
        businessName = selectedBusinessData?.business_name || 'Unknown Business'
        const businessSlug = businessName.toLowerCase().replace(/[^a-z0-9]/g, '-')
        
        switch (qrSubtype) {
          case 'discover':
            finalTargetUrl = `https://${city}.qwikker.com/user/dashboard?highlight=${businessSlug}`
            break
          case 'offers':
            finalTargetUrl = `https://${city}.qwikker.com/user/offers?highlight=${businessSlug}`
            break
          case 'secret-menu':
            finalTargetUrl = `https://${city}.qwikker.com/user/secret-menu?highlight=${businessSlug}`
            break
          default:
            finalTargetUrl = `https://${city}.qwikker.com/user/dashboard?highlight=${businessSlug}`
        }
      }

      // Create new QR code object for local state
      const newQRCode: GeneratedQR = {
        id: `temp-${Date.now()}`,
        code_name: codeName,
        qr_type: qrSubtype as any,
        qr_category: activeSection,
        qr_subtype: qrSubtype,
        business_name: businessName || undefined,
        business_id: selectedBusiness || undefined,
        generated_url: generatedUrl,
        created_at: new Date().toLocaleDateString(),
        scans_7d: 0,
        scans_30d: 0,
        scans_60d: 0
      }

      // Save to database using CORRECT table (qr_codes)
      try {
        const supabase = createClientComponentClient()
        
        // Determine QR type based on activeSection
        let qrType: 'marketing' | 'business_static' | 'business_dynamic' = 'marketing'
        if (activeSection === 'static-business') qrType = 'business_static'
        if (activeSection === 'intent-routing') qrType = 'business_dynamic'
        
        const insertData = {
          qr_code: codeName,
          qr_type: qrType,
          name: codeName.replace(/-/g, ' ').toUpperCase(),
          description: `${qrSubtype} QR code`,
          category: qrSubtype,
          current_target_url: finalTargetUrl, // ACTUAL target (editable)
          default_target_url: finalTargetUrl, // Fallback
          business_id: selectedBusiness || null,
          city: city,
          status: 'active'
        }

        const { data, error } = await supabase
          .from('qr_codes')
          .insert(insertData)
          .select()
          .single()

        if (error) {
          console.error('❌ Database error:', error)
          throw error
        }

        if (data) {
          newQRCode.id = data.id
          console.log('✅ QR Code saved to database:', data.qr_code)
          showSuccess('QR Code saved to database!')
        }
      } catch (dbError) {
        console.error('❌ Failed to save QR to database:', dbError)
        showError('QR generated but not saved to database. It will work locally only.')
      }

      // Add to local state
      setGeneratedCodes(prev => [newQRCode, ...prev])
      setGeneratedQrData(generatedUrl)
      showSuccess('QR Code generated successfully!')
      
      // Reset form
      setQrSubtype('')
      setTargetUrl('')
      setLogoUrl('')
      if (activeSection !== 'intent-routing') {
        setSelectedBusiness('')
      }
      
    } catch (error) {
      console.error('Error generating QR code:', error)
      showError('Failed to generate QR code')
    } finally {
      setGenerating(false)
    }
  }

  const updateQRCode = async (qrCode: GeneratedQR, newUrl: string) => {
    try {
      const supabase = createClientComponentClient()
      
      // Update in database first using CORRECT table and column names
      const { error } = await supabase
        .from('qr_codes')
        .update({
          current_target_url: newUrl, // CORRECT column name
          updated_at: new Date().toISOString()
        })
        .eq('id', qrCode.id)

      if (error) {
        console.error('❌ Database update error:', error)
        throw error
      }

      // Update local state after successful database update
      const updatedCodes = generatedCodes.map(code => 
        code.id === qrCode.id ? { ...code, generated_url: newUrl } : code
      )
      setGeneratedCodes(updatedCodes)
      setEditingCode(null)
      setEditUrl('')
      showSuccess('QR Code URL updated successfully!')
      
    } catch (error) {
      console.error('❌ Failed to update QR code:', error)
      showError('Failed to update QR code URL')
    }
  }

  const deleteQRCode = async (qrCode: GeneratedQR) => {
    if (!confirm(`Delete QR code "${qrCode.code_name}"?\n\nThis cannot be undone. Any printed QR codes will stop working!`)) {
      return
    }

    try {
      const supabase = createClientComponentClient()
      
      const { error } = await supabase
        .from('qr_codes')
        .delete()
        .eq('id', qrCode.id)

      if (error) {
        console.error('❌ Database delete error:', error)
        throw error
      }

      // Remove from local state
      setGeneratedCodes(generatedCodes.filter(code => code.id !== qrCode.id))
      showSuccess('QR Code deleted successfully!')
      
    } catch (error) {
      console.error('❌ Failed to delete QR code:', error)
      showError('Failed to delete QR code')
    }
  }

  const getSubtypeOptions = () => {
    switch (activeSection) {
      case 'qwikker-marketing':
        return ['Flyers', 'Leaflets', 'Promo Packs', 'Other']
      case 'static-business':
        return ['Window Stickers', 'Offers', 'Secret Menus', 'Other']
      case 'intent-routing':
        return ['Discover', 'Offers', 'Secret Menu', 'Other']
      default:
        return ['Other']
    }
  }

  const filteredCodes = generatedCodes.filter(code => {
    const matchesSection = code.qr_category === activeSection
    const matchesSearch = searchTerm === '' || 
      code.code_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      code.business_name?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSection && matchesSearch
  })

  const filteredBusinesses = businesses.filter(business =>
    business.business_name.toLowerCase().includes(businessSearch.toLowerCase())
  )

  const getSectionStats = (category: string) => {
    const sectionCodes = generatedCodes.filter(code => code.qr_category === category)
    return {
      total: sectionCodes.length,
      scans_7d: sectionCodes.reduce((sum, code) => sum + code.scans_7d, 0),
      scans_30d: sectionCodes.reduce((sum, code) => sum + code.scans_30d, 0),
      scans_60d: sectionCodes.reduce((sum, code) => sum + code.scans_60d, 0)
    }
  }

  return (
    <div className="space-y-6">
      {/* Instructions Section */}
      <Card className="bg-gradient-to-r from-indigo-500/10 to-purple-600/10 border border-indigo-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            How to Use QR Code Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Qwikker Marketing */}
            <div className="bg-slate-800/50 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <h3 className="text-green-400 font-semibold">Qwikker Marketing</h3>
              </div>
              <ul className="text-sm text-slate-300 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">•</span>
                  <span><strong>Use for:</strong> Flyers, leaflets, promo packs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">•</span>
                  <span><strong>Purpose:</strong> Drive general traffic to Qwikker platform</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">•</span>
                  <span><strong>URL:</strong> Enter your marketing landing page</span>
                </li>
              </ul>
            </div>

            {/* Static Business */}
            <div className="bg-slate-800/50 border border-orange-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <h3 className="text-orange-400 font-semibold">Static Business QR</h3>
              </div>
              <ul className="text-sm text-slate-300 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-orange-400 mt-1">•</span>
                  <span><strong>Use for:</strong> Window stickers, offers, secret menus</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-400 mt-1">•</span>
                  <span><strong>Purpose:</strong> Link to specific external content</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-400 mt-1">•</span>
                  <span><strong>URL:</strong> Enter any external website/PDF link</span>
                </li>
              </ul>
            </div>

            {/* Intent Routing */}
            <div className="bg-slate-800/50 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <h3 className="text-blue-400 font-semibold">Intent Routing</h3>
              </div>
              <ul className="text-sm text-slate-300 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span><strong>Use for:</strong> Business-specific QR codes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span><strong>Purpose:</strong> Route users to specific business pages</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span><strong>URL:</strong> Auto-generated based on business selection</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="bg-slate-800/30 border border-slate-600/50 rounded-lg p-4 mt-4">
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Quick Tips
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-300">
              <div className="space-y-2">
                <p><strong className="text-indigo-400">Logo Upload:</strong> Add your business logo for branded QR codes (optional)</p>
                <p><strong className="text-indigo-400">Test First:</strong> Always test QR codes before printing using the "Test" button</p>
              </div>
              <div className="space-y-2">
                <p><strong className="text-indigo-400">High-Res Download:</strong> Use "Download" for print-ready PNG files</p>
                <p><strong className="text-indigo-400">Analytics:</strong> Track scans with 7d, 30d, and 60d metrics</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-700 pb-2">
        <button
          onClick={() => setActiveSection('qwikker-marketing')}
          className={`px-4 py-2 rounded-t-lg font-semibold transition-colors ${
            activeSection === 'qwikker-marketing'
              ? 'bg-green-500 text-white'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Qwikker Marketing
        </button>
        <button
          onClick={() => setActiveSection('static-business')}
          className={`px-4 py-2 rounded-t-lg font-semibold transition-colors ${
            activeSection === 'static-business'
              ? 'bg-orange-500 text-white'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Static Business
        </button>
        <button
          onClick={() => setActiveSection('intent-routing')}
          className={`px-4 py-2 rounded-t-lg font-semibold transition-colors ${
            activeSection === 'intent-routing'
              ? 'bg-blue-500 text-white'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Intent Routing
        </button>
      </div>

      {/* Section Analytics */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className={
            activeSection === 'qwikker-marketing' ? 'text-green-400' :
            activeSection === 'static-business' ? 'text-orange-400' : 'text-blue-400'
          }>
            {activeSection === 'qwikker-marketing' && 'Qwikker Marketing Analytics'}
            {activeSection === 'static-business' && 'Static Business QR Analytics'}
            {activeSection === 'intent-routing' && 'Intent Routing QR Analytics'}
          </CardTitle>
          <p className="text-slate-400 text-sm">
            {activeSection === 'qwikker-marketing' && 'Flyers, Leaflets, Promo Packs, Other'}
            {activeSection === 'static-business' && 'Window Stickers, Offers, Secret Menus, Other'}
            {activeSection === 'intent-routing' && 'Spotlight Tier, Deep Linking, Intent Routing'}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{getSectionStats(activeSection).scans_7d}</div>
              <div className="text-slate-400 text-sm">Last 7 Days</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{getSectionStats(activeSection).scans_30d}</div>
              <div className="text-slate-400 text-sm">Last 30 Days</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{getSectionStats(activeSection).scans_60d}</div>
              <div className="text-slate-400 text-sm">Last 60 Days</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{getSectionStats(activeSection).total}</div>
              <div className="text-slate-400 text-sm">Total Codes</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QR Code Generator */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            QR Code Generator
            <Badge className={
              activeSection === 'qwikker-marketing' ? 'bg-green-500' :
              activeSection === 'static-business' ? 'bg-orange-500' : 'bg-blue-500'
            }>
              {activeSection.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Badge>
          </CardTitle>
          <p className="text-slate-400 text-sm">
            Generate trackable QR codes for {activeSection.replace('-', ' ')} campaigns
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Form Section */}
            <div className="space-y-4">
              {/* QR Category Selection */}
              <div className="space-y-2">
                <Label className="text-slate-300">QR Category</Label>
                <select
                  value={activeSection}
                  onChange={(e) => setActiveSection(e.target.value as 'qwikker-marketing' | 'static-business' | 'intent-routing')}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
                >
                  <option value="qwikker-marketing">Qwikker Marketing ({getSectionStats('qwikker-marketing').total} codes)</option>
                  <option value="static-business">Static Business QR ({getSectionStats('static-business').total} codes)</option>
                  <option value="intent-routing">Intent Routing QR ({getSectionStats('intent-routing').total} codes)</option>
                </select>
                <p className="text-slate-400 text-xs">
                  {activeSection === 'qwikker-marketing' && 'Flyers, Leaflets, Promo Packs, Other'}
                  {activeSection === 'static-business' && 'Window Stickers, Offers, Secret Menus, Other'}
                  {activeSection === 'intent-routing' && 'Deep Linking, Intent Routing - Available for all tiers (Upsell opportunity for Starter/Featured)'}
                </p>
              </div>

              {/* Business Selection (Intent Routing Only) */}
              {activeSection === 'intent-routing' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-slate-300">Select Business</Label>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={refreshBusinesses}
                      className="text-slate-400 hover:text-white text-xs"
                    >
                      Refresh List
                    </Button>
                  </div>
                  
                  {/* Dropdown with Search */}
                  <div className="space-y-2">
                    <select
                      value={selectedBusiness}
                      onChange={(e) => {
                        setSelectedBusiness(e.target.value)
                        const business = businesses.find(b => b.id === e.target.value)
                        setBusinessSearch(business?.business_name || '')
                      }}
                      className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    >
                      <option value="">Select a business...</option>
                      {businesses.map(business => (
                        <option key={business.id} value={business.id}>
                          {business.business_name} ({business.business_tier.charAt(0).toUpperCase() + business.business_tier.slice(1)})
                        </option>
                      ))}
                    </select>
                    
                    {/* Search Input */}
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Or search businesses..."
                        value={businessSearch}
                        onChange={(e) => {
                          setBusinessSearch(e.target.value)
                          setShowBusinessDropdown(true)
                          // Clear selection if searching
                          if (e.target.value && selectedBusiness) {
                            const business = businesses.find(b => b.id === selectedBusiness)
                            if (business && !business.business_name.toLowerCase().includes(e.target.value.toLowerCase())) {
                              setSelectedBusiness('')
                            }
                          }
                        }}
                        onFocus={() => setShowBusinessDropdown(true)}
                        className="bg-slate-800 border-slate-700 text-white pr-10"
                      />
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                      
                      {showBusinessDropdown && businessSearch && filteredBusinesses.length > 0 && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setShowBusinessDropdown(false)}
                          />
                          <div className="absolute top-full left-0 right-0 z-20 bg-slate-800 border border-slate-700 rounded-lg mt-1 max-h-60 overflow-y-auto">
                            {filteredBusinesses.map((business) => (
                              <Button
                                key={business.id}
                                variant="ghost"
                                className="w-full justify-start text-left hover:bg-slate-700 text-white"
                                onClick={() => {
                                  setSelectedBusiness(business.id)
                                  setBusinessSearch(business.business_name)
                                  setShowBusinessDropdown(false)
                                }}
                              >
                                {business.business_name}
                              </Button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    
                    {selectedBusiness && (
                      <div className="p-2 bg-slate-800 border border-slate-700 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-green-400 text-sm">
                              Selected: {businesses.find(b => b.id === selectedBusiness)?.business_name}
                            </span>
                            {businesses.find(b => b.id === selectedBusiness)?.business_tier !== 'spotlight' && (
                              <p className="text-yellow-400 text-xs mt-1">
                                Note: This business is on {businesses.find(b => b.id === selectedBusiness)?.business_tier} tier - Intent Routing QR codes can be used as an upsell opportunity
                              </p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedBusiness('')
                              setBusinessSearch('')
                            }}
                            className="text-slate-400 hover:text-white"
                          >
                            Clear
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* QR Subtype */}
              <div className="space-y-2">
                <Label className="text-slate-300">QR Code Type</Label>
                <select
                  value={qrSubtype}
                  onChange={(e) => setQrSubtype(e.target.value)}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
                >
                  <option value="">Select type...</option>
                  {getSubtypeOptions().map(option => (
                    <option key={option} value={option.toLowerCase().replace(' ', '-')}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target URL (Non-Intent Routing Only) */}
              {activeSection !== 'intent-routing' && (
                <div className="space-y-2">
                  <Label className="text-slate-300">Target URL</Label>
                  <Input
                    type="url"
                    placeholder="https://example.com"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              )}

              {/* Auto-Generated URL Preview (Intent Routing Only) */}
              {activeSection === 'intent-routing' && selectedBusiness && qrSubtype && (
                <div className="space-y-2">
                  <Label className="text-slate-300">Auto-Generated URL</Label>
                  <div className="p-3 bg-slate-800 border border-slate-700 rounded-lg">
                    <p className="text-green-400 text-sm font-mono break-all">
                      {(() => {
                        const selectedBusinessData = businesses.find(b => b.id === selectedBusiness)
                        const businessSlug = selectedBusinessData?.business_name.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'business'
                        
                        switch (qrSubtype) {
                          case 'discover':
                            return `https://${city}.qwikker.com/user/dashboard?highlight=${businessSlug}`
                          case 'offers':
                            return `https://${city}.qwikker.com/user/offers?highlight=${businessSlug}`
                          case 'secret-menu':
                            return `https://${city}.qwikker.com/user/secret-menu?highlight=${businessSlug}`
                          default:
                            return `https://${city}.qwikker.com/user/dashboard?highlight=${businessSlug}`
                        }
                      })()}
                    </p>
                    <p className="text-slate-400 text-xs mt-1">
                      This URL will auto-scroll and highlight {businesses.find(b => b.id === selectedBusiness)?.business_name} on the user dashboard
                    </p>
                  </div>
                </div>
              )}

              {/* Logo Options */}
              <div className="space-y-3">
                <Label className="text-slate-300 font-semibold">QR Code Logo</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setLogoUrl('/icon-192x192.png')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      logoUrl === '/icon-192x192.png'
                        ? 'border-[#00d083] bg-[#00d083]/10'
                        : 'border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 bg-white rounded-lg p-2 flex items-center justify-center">
                        <img src="/icon-192x192.png" alt="Qwikker" className="w-full h-full object-contain" />
                      </div>
                      <span className="text-white text-sm font-medium">Qwikker Logo</span>
                      {logoUrl === '/icon-192x192.png' && (
                        <span className="text-[#00d083] text-xs">✓ Selected</span>
                      )}
                    </div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setLogoUrl('')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      !logoUrl
                        ? 'border-slate-600 bg-slate-700/50'
                        : 'border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center">
                        <span className="text-slate-600 text-2xl">∅</span>
                      </div>
                      <span className="text-white text-sm font-medium">No Logo</span>
                      {!logoUrl && (
                        <span className="text-slate-400 text-xs">✓ Selected</span>
                      )}
                    </div>
                  </button>
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={generateQRCode}
                disabled={generating}
                className="w-full bg-[#00d083] hover:bg-[#00b570] text-white py-3 text-lg font-semibold"
              >
                {generating ? 'Generating...' : 'Generate QR Code'}
              </Button>
            </div>

            {/* Preview Section */}
            <div className="space-y-4">
              {generatedQrData ? (
                <div className="text-center p-6 bg-slate-800 border border-slate-700 rounded-lg">
                  <h4 className="text-white text-lg font-semibold mb-4">
                    QR Code Generated! {logoUrl && <span className="text-[#00d083] text-sm">✓ With Logo</span>}
                  </h4>
                  <div className="bg-white p-4 inline-block rounded-lg mb-4 relative">
                    <QRCode 
                      value={generatedQrData} 
                      size={200} 
                      level="H" 
                      includeMargin={true}
                      imageSettings={logoUrl ? {
                        src: logoUrl,
                        excavate: true,
                        width: 40,
                        height: 40
                      } : undefined}
                    />
                  </div>
                  <p className="text-slate-400 text-sm break-all mb-4">{generatedQrData}</p>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 mb-4">
                    <Button
                      onClick={() => window.open(generatedQrData, '_blank')}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2"
                    >
                      Test QR Code
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
                        const selectedBusinessData = activeSection === 'intent-routing' 
                          ? businesses.find(b => b.id === selectedBusiness)
                          : null
                        const filename = selectedBusinessData
                          ? `qr-${selectedBusinessData.business_name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${qrType}-print-ready`
                          : `qr-${activeSection}-${qrSubtype}-print-ready`
                        downloadQRCode(generatedQrData, filename, 2000, logoUrl || undefined)
                      }}
                      className="bg-[#00d083] hover:bg-[#00b570] text-white px-4 py-2 flex items-center justify-center gap-2"
                    >
                      <Download size={16} />
                      Download Print-Ready {logoUrl ? '(with logo)' : ''}
                    </Button>
                  </div>
                  
                  <p className="text-[#00d083] text-xs">Ready to print! 2000px high-resolution PNG</p>
                </div>
              ) : (
                <div className="text-center p-12 bg-slate-800 border border-slate-700 border-dashed rounded-lg">
                  <div className="text-slate-400 mb-4">
                    <div className="w-24 h-24 mx-auto mb-4 bg-slate-700 rounded-lg flex items-center justify-center">
                      <div className="w-12 h-12 bg-slate-600 rounded"></div>
                    </div>
                    <h4 className="text-lg font-semibold text-slate-300 mb-2">QR Code Preview</h4>
                    <p className="text-sm">Fill out the form and click generate to see your QR code here</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generated Codes List */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">
              Generated QR Codes ({filteredCodes.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search codes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white pr-10 w-64"
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCodes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400">No QR codes generated for this section yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCodes.map(code => (
                <div key={code.id} className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-white font-semibold">{code.business_name || code.code_name}</h4>
                        <Badge className={
                          code.qr_category === 'qwikker-marketing' ? 'bg-green-500' :
                          code.qr_category === 'static-business' ? 'bg-orange-500' : 'bg-blue-500'
                        }>
                          {code.qr_subtype}
                        </Badge>
                      </div>
                      <p className="text-slate-400 text-sm mb-1">{code.code_name}</p>
                      <p className="text-slate-500 text-xs">
                        Generated: {code.created_at} • 
                        7d: {code.scans_7d} • 
                        30d: {code.scans_30d} • 
                        60d: {code.scans_60d} scans
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div className="bg-white p-2 rounded-lg">
                        <QRCode value={code.generated_url} size={80} level="L" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => window.open(code.generated_url, '_blank')}
                          className="text-blue-400 border-blue-400 hover:bg-blue-400 hover:text-white"
                        >
                          <Eye size={14} className="mr-1" />
                          Test
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => {
                            const filename = code.business_name
                              ? `qr-${code.business_name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${code.qr_type}-print-ready`
                              : `qr-${code.code_name}-print-ready`
                            // TODO: Store logo URL in database for re-download with logo
                            downloadQRCode(code.generated_url, filename, 2000)
                          }}
                          className="text-[#00d083] border-[#00d083] hover:bg-[#00d083] hover:text-white"
                        >
                          <Download size={14} className="mr-1" />
                          Download
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => {
                            setEditingCode(code)
                            setEditUrl(code.generated_url)
                          }}
                          className="text-yellow-400 border-yellow-400 hover:bg-yellow-400 hover:text-black"
                        >
                          Edit URL
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => deleteQRCode(code)}
                          className="text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
                        >
                          Delete
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

      {/* Edit URL Modal */}
      {editingCode && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 max-w-lg w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-lg font-semibold">Edit QR Code URL</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingCode(null)
                  setEditUrl('')
                }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-slate-300 text-sm mb-2">
                  <strong>QR Code:</strong> {editingCode.business_name || editingCode.code_name}
                </p>
                <p className="text-slate-400 text-xs mb-4">
                  {editingCode.qr_category} • {editingCode.qr_subtype}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-slate-300">New URL</Label>
                <Input
                  type="url"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="https://example.com"
                />
              </div>
              
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingCode(null)
                    setEditUrl('')
                  }}
                  className="text-slate-300 border-slate-600 hover:bg-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => updateQRCode(editingCode, editUrl)}
                  disabled={!editUrl || editUrl === editingCode.generated_url}
                  className="bg-[#00d083] hover:bg-[#00b570] text-white"
                >
                  Update URL
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ModalComponent />
    </div>
  )
}
