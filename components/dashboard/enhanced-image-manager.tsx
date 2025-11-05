'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/ui/loading-button'
import { ImageCarousel } from '@/components/ui/image-carousel'
import { SubmissionNotificationModal } from '@/components/ui/submission-notification-modal'
import { useElegantModal } from '@/components/ui/elegant-modal'
import { ImageTransform } from '@/types/profiles'

interface EnhancedImageManagerProps {
  images: string[]
  businessStatus?: 'incomplete' | 'pending_review' | 'approved'
  onUpload: (files: File[]) => Promise<void>
  onDelete: (imageUrl: string, index: number) => Promise<void>
  onReorder: (fromIndex: number, toIndex: number) => Promise<void>
  isUploading: boolean
  maxImages?: number
  title?: string
  description?: string
}

export function EnhancedImageManager({
  images = [],
  businessStatus = 'approved',
  onUpload,
  onDelete,
  onReorder,
  isUploading,
  maxImages = 10,
  title = "Business Photos",
  description = "Upload high-quality photos of your business in 16:9 aspect ratio (1920×1080px recommended). These will be the hero images customers see on your business card."
}: EnhancedImageManagerProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [showNotification, setShowNotification] = useState(false)
  const [uploadedCount, setUploadedCount] = useState(0)
  
  const { showConfirm, ModalComponent } = useElegantModal()

  const handleDeleteImage = async (imageUrl: string, index: number) => {
    const isLastImage = images.length === 1
    
    const confirmMessage = isLastImage
      ? "Are you sure you want to delete this image? You must have at least one image uploaded for your profile to be displayed correctly to customers. Your business card will not appear in search results without images."
      : `Are you sure you want to delete this image? This action cannot be undone.`
    
    const confirmed = await showConfirm(confirmMessage)
    
    if (confirmed) {
      await onDelete(imageUrl, index)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setUploadedCount(files.length)
      onUpload(files).then(() => {
        // Show notification after successful upload
        setShowNotification(true)
      })
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    )
    
    if (files.length > 0) {
      setUploadedCount(files.length)
      onUpload(files).then(() => {
        // Show notification after successful drag & drop
        setShowNotification(true)
      })
    }
  }

  const handleImageDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleImageDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleImageDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      onReorder(draggedIndex, dropIndex)
    }
    
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const triggerFileInput = () => {
    const input = document.getElementById('enhanced-image-upload') as HTMLInputElement
    input?.click()
  }

  const canAddMore = images.length < maxImages


  return (
    <>
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          {title}
          {images.length > 0 && (
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
              {images.length} uploaded
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          
          {/* Upload Info */}
          {images.length > 0 && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <div className="text-green-400 text-lg">✓</div>
                <div>
                  <h4 className="text-sm font-medium text-white">Images Uploaded</h4>
                  <p className="text-xs text-slate-400">Your business images are uploaded and will appear on your business card. You can upload more or delete existing ones.</p>
                </div>
              </div>
            </div>
          )}

          {/* Image Grid Management */}
          {images.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-white">Manage Photos</h4>
                <p className="text-xs text-slate-400">Drag to reorder • Click × to delete</p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {images.map((imageUrl, index) => (
                  <div
                    key={`${imageUrl}-${index}`}
                    className={`relative group cursor-move rounded-lg overflow-hidden border-2 transition-all ${
                      dragOverIndex === index ? 'border-blue-400 scale-105' : 'border-slate-600'
                    }`}
                    draggable
                    onDragStart={(e) => handleImageDragStart(e, index)}
                    onDragOver={(e) => handleImageDragOver(e, index)}
                    onDrop={(e) => handleImageDrop(e, index)}
                  >
                    <img 
                      src={imageUrl} 
                      alt={`Business Photo ${index + 1}`} 
                      className="w-full h-24 object-cover"
                    />
                    
                    {/* Order indicator */}
                    <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      #{index + 1}
                    </div>
                    
                    {/* Action buttons */}
                    <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleDeleteImage(imageUrl, index)}
                        className="bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                        title="Delete image"
                      >
                        ×
                      </button>
                    </div>
                    
                    {/* Drag handle */}
                    <div className="absolute bottom-1 right-1 bg-black/70 text-white rounded px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Area */}
          {canAddMore && (
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                isDragOver 
                  ? 'border-[#00d083] bg-[#00d083]/10' 
                  : 'border-slate-600 hover:border-[#00d083]'
              }`}
              onClick={triggerFileInput}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="w-12 h-12 mx-auto mb-3 bg-slate-700 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              
              <h3 className="text-lg font-medium text-white mb-2">
                {images.length === 0 ? 'Upload Business Photos' : 'Add More Photos'}
              </h3>
              
              <p className="text-gray-400 text-sm mb-3">
                {description}
              </p>
              
              <p className="text-xs text-gray-500 mb-1">
                Drag & drop images here or click to browse
              </p>
              <p className="text-xs text-amber-400 mb-2 font-medium">
                📐 Best results: 16:9 aspect ratio (1920×1080px recommended)
              </p>
              <p className="text-xs text-gray-500">
                PNG, JPG, WEBP up to 10MB • Max {maxImages} images
              </p>
              
              {images.length > 0 && (
                <p className="text-xs text-blue-400 mt-2">
                  {maxImages - images.length} more images allowed
                </p>
              )}
            </div>
          )}

          {!canAddMore && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-center">
              <p className="text-yellow-400 text-sm">
                Maximum of {maxImages} images reached. Delete some images to add new ones.
              </p>
            </div>
          )}

          <input
            id="enhanced-image-upload"
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Upload Status */}
          {isUploading && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-blue-400 text-sm">Uploading images...</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>


    {/* Submission Notification Modal */}
    <SubmissionNotificationModal
      isOpen={showNotification}
      onClose={() => setShowNotification(false)}
      type="image"
      count={uploadedCount}
      businessStatus={businessStatus}
    />

    {/* Delete Confirmation Modal */}
    <ModalComponent />
  </>
  )
}
