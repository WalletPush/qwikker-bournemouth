'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { uploadToCloudinary } from '@/lib/integrations'
import { createClient } from '@/lib/supabase/client'

interface FileManagerProps {
  userId: string
  currentFiles: {
    logo?: string
    menuFiles?: string
    offerImages?: string
  }
}

export function DashboardFileManager({ userId, currentFiles }: FileManagerProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [files, setFiles] = useState(currentFiles)

  const handleFileUpload = async (type: 'logo' | 'menu' | 'offer', file: File) => {
    setIsUploading(true)
    
    try {
      // Upload to Cloudinary
      const folder = `qwikker/${type}s`
      const fileUrl = await uploadToCloudinary(file, folder)
      
      // Update Supabase profile
      const supabase = createClient()
      const updateData = {
        [type === 'menu' ? 'menuservice_url' : type === 'offer' ? 'offer_image' : 'logo']: fileUrl
      }
      
      const { error } = await supabase
        .from('business_profiles')
        .update(updateData)
        .eq('user_id', userId)
      
      if (error) throw error
      
      // Update local state
      setFiles(prev => ({
        ...prev,
        [type === 'menu' ? 'menuFiles' : type === 'offer' ? 'offerImages' : 'logo']: fileUrl
      }))
      
      alert(`${type} uploaded successfully!`)
      
    } catch (error) {
      console.error('Upload failed:', error)
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Logo Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
            Business Logo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {files.logo && (
            <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <img 
                src={files.logo} 
                alt="Business Logo" 
                className="w-16 h-16 object-cover rounded-lg border"
              />
              <div className="flex-1">
                <p className="font-medium">Current Logo</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Stored in Cloudinary</p>
              </div>
              <Button variant="outline" size="sm">
                <a href={files.logo} target="_blank" rel="noopener noreferrer">
                  View Full Size
                </a>
              </Button>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="logoFile">Upload New Logo</Label>
            <Input
              id="logoFile"
              type="file"
              accept="image/*"
              disabled={isUploading}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileUpload('logo', file)
              }}
            />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              PNG, JPG, SVG up to 10MB. Will be optimized and served via CDN.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Menu Files Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
            </svg>
            Menu & Price Lists
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {files.menuFiles && (
            <div className="space-y-2">
              {files.menuFiles.split(', ').map((url, index) => (
                <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <p className="font-medium">Menu PDF {index + 1}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Available for AI chat responses</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      View PDF
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="menuFile">Upload Menu PDF</Label>
            <Input
              id="menuFile"
              type="file"
              accept=".pdf"
              multiple
              disabled={isUploading}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileUpload('menu', file)
              }}
            />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              PDF files only, up to 10MB each. Used for AI recommendations.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Offer Images Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
            Offer Images
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {files.offerImages && (
            <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <img 
                src={files.offerImages} 
                alt="Offer Image" 
                className="w-16 h-16 object-contain rounded-lg border"
              />
              <div className="flex-1">
                <p className="font-medium">Current Offer Image</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Used in marketing materials</p>
              </div>
              <Button variant="outline" size="sm">
                <a href={files.offerImages} target="_blank" rel="noopener noreferrer">
                  View Full Size
                </a>
              </Button>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="offerFile">Upload Offer Image</Label>
            <Input
              id="offerFile"
              type="file"
              accept="image/*"
              disabled={isUploading}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileUpload('offer', file)
              }}
            />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              PNG, JPG up to 5MB. Professional designs available on request.
            </p>
          </div>
        </CardContent>
      </Card>
      
      {isUploading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
              <p>Uploading file...</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
