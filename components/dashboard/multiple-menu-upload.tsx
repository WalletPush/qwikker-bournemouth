'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Trash2, Upload, FileText, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import { BusinessMenu, MENU_TYPE_OPTIONS, MenuType } from '@/types/profiles'

interface MultipleMenuUploadProps {
  businessId: string
}

interface UploadMessage {
  type: 'success' | 'error' | 'info'
  text: string
}

export function MultipleMenuUpload({ businessId }: MultipleMenuUploadProps) {
  const router = useRouter()
  const [menus, setMenus] = useState<BusinessMenu[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [uploadMessage, setUploadMessage] = useState<UploadMessage | null>(null)
  const [newMenu, setNewMenu] = useState({
    name: '',
    type: '' as MenuType | '',
    file: null as File | null
  })

  // Load existing menus
  useEffect(() => {
    loadMenus()
  }, [])

  const loadMenus = async () => {
    try {
      const response = await fetch('/api/menus/list')
      const data = await response.json()
      
      if (data.success) {
        setMenus(data.data)
      } else {
        console.error('Failed to load menus:', data.error)
      }
    } catch (error) {
      console.error('Error loading menus:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (file.type !== 'application/pdf') {
        setUploadMessage({
          type: 'error',
          text: 'Only PDF files are allowed for menus'
        })
        return
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setUploadMessage({
          type: 'error',
          text: 'File size must be less than 10MB'
        })
        return
      }

      setNewMenu(prev => ({ ...prev, file }))
      setUploadMessage(null)
    }
  }

  const handleUpload = async () => {
    if (!newMenu.file || !newMenu.name || !newMenu.type) {
      setUploadMessage({
        type: 'error',
        text: 'Please fill in all fields and select a file'
      })
      return
    }

    setIsUploading(true)
    setUploadMessage(null)

    try {
      const formData = new FormData()
      formData.append('menu', newMenu.file)
      formData.append('menuName', newMenu.name)
      formData.append('menuType', newMenu.type)

      const response = await fetch('/api/menus/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        setUploadMessage({
          type: 'success',
          text: data.message
        })
        
        // Reset form
        setNewMenu({ name: '', type: '', file: null })
        const fileInput = document.getElementById('menu-file') as HTMLInputElement
        if (fileInput) fileInput.value = ''
        
        // Reload menus
        await loadMenus()
        router.refresh()
      } else {
        setUploadMessage({
          type: 'error',
          text: data.error
        })
      }
    } catch (error) {
      console.error('Upload error:', error)
      setUploadMessage({
        type: 'error',
        text: 'Upload failed. Please try again.'
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (menuId: string, menuName: string) => {
    if (!confirm(`Are you sure you want to delete "${menuName}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch('/api/menus/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ menuId })
      })

      const data = await response.json()

      if (data.success) {
        setUploadMessage({
          type: 'success',
          text: data.message
        })
        await loadMenus()
        router.refresh()
      } else {
        setUploadMessage({
          type: 'error',
          text: data.error
        })
      }
    } catch (error) {
      console.error('Delete error:', error)
      setUploadMessage({
        type: 'error',
        text: 'Failed to delete menu. Please try again.'
      })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'needs_revision':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'needs_revision':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      {/* Upload New Menu */}
        <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Menus, Services & Events
              </CardTitle>
              <p className="text-sm text-gray-400 mt-2">
                📄 <strong>Important:</strong> PDFs must contain clear, selectable text (not images) for our AI to read and search your content. If you need help with PDF formatting, contact admin support.
              </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {uploadMessage && (
            <div className={`p-3 rounded-md ${
              uploadMessage.type === 'success' ? 'bg-green-50 text-green-700' :
              uploadMessage.type === 'error' ? 'bg-red-50 text-red-700' :
              'bg-blue-50 text-blue-700'
            }`}>
              {uploadMessage.text}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="menu-name">Menu Name</Label>
              <Input
                id="menu-name"
                placeholder="e.g., Main Menu, Drinks Menu"
                value={newMenu.name}
                onChange={(e) => setNewMenu(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="menu-type">Menu Type</Label>
              <Select value={newMenu.type} onValueChange={(value) => setNewMenu(prev => ({ ...prev, type: value as MenuType }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select menu type" />
                </SelectTrigger>
                <SelectContent>
                  {MENU_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="menu-file">Menu File (PDF)</Label>
            <Input
              id="menu-file"
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
            />
            <p className="text-sm text-gray-600">
              PDF files only, maximum 10MB. This will be used for AI recommendations.
            </p>
          </div>

          <Button 
            onClick={handleUpload} 
            disabled={isUploading || !newMenu.file || !newMenu.name || !newMenu.type}
            className="w-full"
          >
            {isUploading ? 'Uploading...' : 'Upload Menu'}
          </Button>
        </CardContent>
      </Card>

      {/* Existing Menus */}
        <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Your Files ({menus.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading menus...</p>
            </div>
          ) : menus.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No menus uploaded yet</p>
              <p className="text-sm">Upload your first menu above to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {menus.map((menu) => (
                <div key={menu.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{menu.menu_name}</h3>
                        <Badge className={getStatusColor(menu.status)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(menu.status)}
                            {menu.status.replace('_', ' ')}
                          </div>
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 capitalize">
                        {menu.menu_type.replace('_', ' ')} • {menu.original_filename}
                      </p>
                      {menu.file_size && (
                        <p className="text-xs text-gray-500">
                          {formatFileSize(menu.file_size)} • Uploaded {new Date(menu.uploaded_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {menu.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(menu.id, menu.menu_name)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {menu.admin_notes && (
                    <div className="bg-gray-50 p-3 rounded-md">
                      <p className="text-sm font-medium text-gray-700">Admin Notes:</p>
                      <p className="text-sm text-gray-600">{menu.admin_notes}</p>
                    </div>
                  )}

                  {menu.status === 'approved' && menu.approved_at && (
                    <div className="text-xs text-green-600">
                      Approved on {new Date(menu.approved_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
