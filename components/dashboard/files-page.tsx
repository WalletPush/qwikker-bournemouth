'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { updateProfileFile } from '@/lib/actions/file-actions'
import { uploadToCloudinary } from '@/lib/integrations'

interface FilesPageProps {
  profile?: any
}

export function FilesPage({ profile }: FilesPageProps) {
  const router = useRouter()
  const [uploading, setUploading] = useState<string | null>(null)
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Scroll to specific section if hash is present in URL
  useEffect(() => {
    const hash = window.location.hash.substring(1) // Remove the # symbol
    if (hash) {
      // Small delay to ensure the page has rendered
      setTimeout(() => {
        const element = document.getElementById(hash)
        if (element) {
          element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
          })
          // Add a subtle highlight effect
          element.style.boxShadow = '0 0 0 3px rgba(0, 208, 131, 0.3)'
          setTimeout(() => {
            element.style.boxShadow = ''
          }, 2000)
        }
      }, 100)
    }
  }, [])

  const handleFileUpload = async (file: File, type: 'logo' | 'menu' | 'offer' | 'business_images') => {
    if (!file) return

    // Validate file type
    const validTypes = {
      logo: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
      menu: ['application/pdf'],
      offer: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
      business_images: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    }

    if (!validTypes[type].includes(file.type)) {
      setUploadMessage({
        type: 'error',
        text: `Invalid file type for ${type}. ${type === 'menu' ? 'Only PDF files allowed.' : 'Only image files allowed.'}`
      })
      return
    }

    // Validate file size (10MB for all file types)
    const maxSize = 10 * 1024 * 1024 // 10MB for all files
    if (file.size > maxSize) {
      setUploadMessage({
        type: 'error',
        text: `File too large. Maximum size is 10MB.`
      })
      return
    }

    setUploading(type)
    setUploadMessage(null)

    try {
      // Upload to Cloudinary
      const fileUrl = await uploadToCloudinary(file, `qwikker/${type}`)
      
      // Update profile with the new file URL
      const result = await updateProfileFile(profile?.user_id, type, fileUrl)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update profile')
      }
      
      setUploadMessage({
        type: 'success',
        text: `${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully!`
      })

      // Refresh the page to show updated profile
      router.refresh()

    } catch (error) {
      console.error('Upload error:', error)
      setUploadMessage({
        type: 'error',
        text: 'Upload failed. Please try again.'
      })
    } finally {
      setUploading(null)
    }
  }

  const triggerFileInput = (inputId: string) => {
    document.getElementById(inputId)?.click()
  }

  return (
    <div className="space-y-6">
      {/* Review Process Banner */}
      <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-blue-200 mb-1">Review Process</h3>
            <p className="text-blue-100 text-sm leading-relaxed">
              Offers, menus, secret menu items, and images can take <strong>up to 48 hours</strong> to be reviewed and go live on the QWIKKER database. You'll see the status update here once reviewed.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Files Management</h1>
        <p className="text-gray-400">Upload and manage your business files</p>
      </div>

      {uploadMessage && (
        <div className={`p-4 rounded-lg border ${
          uploadMessage.type === 'success' 
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {uploadMessage.text}
        </div>
      )}

      {/* Business Logo */}
      <Card id="logo" className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Business Logo
            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full">HIGH PRIORITY</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {profile?.logo ? (
              <div className="flex items-center gap-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="w-16 h-16 bg-slate-600 rounded-lg flex items-center justify-center overflow-hidden">
                  <img src={profile.logo} alt="Business Logo" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <p className="text-white font-medium">Logo Uploaded</p>
                  </div>
                  <p className="text-green-400 text-sm">HIGH PRIORITY COMPLETE</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => triggerFileInput('logoUpload')}
                  disabled={uploading === 'logo'}
                  className="border-slate-600 text-gray-300 hover:bg-slate-700"
                >
                  {uploading === 'logo' ? 'Uploading...' : 'Replace'}
                </Button>
              </div>
            ) : (
              <div 
                className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center cursor-pointer hover:border-[#00d083] transition-colors"
                onClick={() => triggerFileInput('logoUpload')}
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-700 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Upload Business Logo</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Click to upload your business logo. This will appear in customer recommendations.
                </p>
                <p className="text-xs text-gray-500">
                  PNG, JPG, WEBP up to 10MB
                </p>
              </div>
            )}
            <input
              id="logoUpload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileUpload(file, 'logo')
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Menu/Price List */}
      <Card id="menu" className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Menu & Price List
            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full">HIGH PRIORITY</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {profile?.menu_url ? (
              <div className="flex items-center gap-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="w-16 h-16 bg-slate-600 rounded-lg flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <p className="text-white font-medium">Menu/Price List Uploaded</p>
                  </div>
                  <p className="text-green-400 text-sm">HIGH PRIORITY COMPLETE</p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(profile.menu_url, '_blank')}
                    className="border-slate-600 text-gray-300 hover:bg-slate-700"
                  >
                    View
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => triggerFileInput('menuUpload')}
                    disabled={uploading === 'menu'}
                    className="border-slate-600 text-gray-300 hover:bg-slate-700"
                  >
                    {uploading === 'menu' ? 'Uploading...' : 'Replace'}
                  </Button>
                </div>
              </div>
            ) : (
              <div 
                className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center cursor-pointer hover:border-[#00d083] transition-colors"
                onClick={() => triggerFileInput('menuUpload')}
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-700 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Upload Menu or Price List</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Upload your menu or service price list. This helps our AI recommend your business accurately.
                </p>
                <p className="text-xs text-gray-500">
                  PDF files only, up to 10MB
                </p>
              </div>
            )}
            <input
              id="menuUpload"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileUpload(file, 'menu')
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Offer Images */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            Offer Images
            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full">MEDIUM PRIORITY</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {profile?.offer_image ? (
              <div className="flex items-center gap-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="w-16 h-16 bg-slate-600 rounded-lg flex items-center justify-center overflow-hidden">
                  <img src={profile.offer_image} alt="Offer Image" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <p className="text-white font-medium">Offer Image Uploaded</p>
                  </div>
                  <p className="text-green-400 text-sm">MEDIUM PRIORITY COMPLETE</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => triggerFileInput('offerUpload')}
                  disabled={uploading === 'offer'}
                  className="border-slate-600 text-gray-300 hover:bg-slate-700"
                >
                  {uploading === 'offer' ? 'Uploading...' : 'Replace'}
                </Button>
              </div>
            ) : (
              <div 
                className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center cursor-pointer hover:border-[#00d083] transition-colors"
                onClick={() => triggerFileInput('offerUpload')}
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-700 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Upload Offer Images</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Upload images for your special offers and promotions.
                </p>
                <p className="text-xs text-gray-500">
                  PNG, JPG, WEBP up to 10MB
                </p>
              </div>
            )}
            <input
              id="offerUpload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileUpload(file, 'offer')
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Business Photos */}
      <Card id="business-images" className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Business Photos
            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full">HIGH PRIORITY</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {profile?.business_images && Array.isArray(profile.business_images) && profile.business_images.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <p className="text-white font-medium">Business Photos Uploaded ({profile.business_images.length})</p>
                  <p className="text-green-400 text-sm">HIGH PRIORITY COMPLETE</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {profile.business_images.map((imageUrl: string, index: number) => (
                    <div key={index} className="relative group">
                      <img 
                        src={imageUrl} 
                        alt={`Business Photo ${index + 1}`} 
                        className="w-full h-32 object-cover rounded-lg border border-slate-600"
                      />
                    </div>
                  ))}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => triggerFileInput('businessImagesUpload')}
                  disabled={uploading === 'business_images'}
                  className="border-slate-600 text-gray-300 hover:bg-slate-700"
                >
                  {uploading === 'business_images' ? 'Uploading...' : 'Add More Photos'}
                </Button>
              </div>
            ) : (
              <div 
                className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center cursor-pointer hover:border-[#00d083] transition-colors"
                onClick={() => triggerFileInput('businessImagesUpload')}
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-700 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Upload Business Photos</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Upload high-quality photos of your business. These will be the hero images customers see on your business card.
                </p>
                <p className="text-xs text-gray-500 mb-2">
                  Recommended: 1200x800px or larger
                </p>
                <p className="text-xs text-gray-500">
                  PNG, JPG, WEBP up to 10MB
                </p>
              </div>
            )}
            <input
              id="businessImagesUpload"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || [])
                files.forEach(file => {
                  if (file) handleFileUpload(file, 'business_images')
                })
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white mb-1">File Upload Tips</h3>
              <p className="text-sm text-gray-400">
                • Logo: High-resolution images work best for branding<br/>
                • Menu: PDF format ensures text stays readable<br/>
                • Offers: Eye-catching images drive more engagement
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
