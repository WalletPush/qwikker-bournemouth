'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { addSecretMenuItem, deleteSecretMenuItem } from '@/lib/actions/business-actions'
import { Profile } from '@/types/profiles'

interface SecretMenuItem {
  id: string
  itemName: string
  description?: string
  price?: string
  created_at: string
  status?: string
  approved_at?: string
}

interface SecretMenuPageProps {
  profile: Profile
}

export function SecretMenuPage({ profile }: SecretMenuPageProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [secretMenuItems, setSecretMenuItems] = useState<SecretMenuItem[]>([])
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [formData, setFormData] = useState({
    itemName: '',
    description: '',
    price: '',
  })

  // Load existing secret menu items from additional_notes
  useEffect(() => {
    if (profile.additional_notes) {
      try {
        const notesData = JSON.parse(profile.additional_notes)
        if (notesData.secret_menu_items && Array.isArray(notesData.secret_menu_items)) {
          setSecretMenuItems(notesData.secret_menu_items)
        }
      } catch (error) {
        console.error('Error parsing secret menu items:', error)
      }
    }
  }, [profile.additional_notes])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    try {
      const result = await addSecretMenuItem(profile.user_id, formData)
      
      if (result.success) {
        setMessage({
          type: 'success',
          text: result.message || 'Secret menu item submitted for review!'
        })
        setShowCreateForm(false)
        setFormData({
          itemName: '',
          description: '',
          price: '',
        })
        
        // Add the new item to local state
        if (result.data) {
          setSecretMenuItems(prev => [...prev, {
            id: Date.now().toString(),
            itemName: result.data.itemName,
            description: result.data.description,
            price: result.data.price,
            created_at: result.data.created_at
          }])
        }
        
        router.refresh()
      } else {
        throw new Error(result.error || 'Failed to add secret menu item')
      }
    } catch (error) {
      console.error('Secret menu item creation error:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to add item. Please try again.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      itemName: '',
      description: '',
      price: '',
    })
    setShowCreateForm(false)
    setMessage(null)
  }

  const handleDeleteSecretMenuItem = async (itemId: string) => {
    setIsDeleting(true)
    setMessage(null)

    try {
      const result = await deleteSecretMenuItem(profile.user_id, itemId)
      
      if (result.success) {
        setMessage({
          type: 'success',
          text: 'Secret menu item deleted successfully!'
        })
        setShowDeleteConfirmation(null)
        // Remove item from local state
        setSecretMenuItems(prev => prev.filter(item => 
          item.created_at !== itemId && item.itemName !== itemId
        ))
        router.refresh()
      } else {
        throw new Error(result.error || 'Failed to delete secret menu item')
      }
    } catch (error) {
      console.error('Secret menu item deletion error:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to delete item. Please try again.'
      })
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirmation(null)
    }
  }

  // Plan limits
  const isFreeTrial = profile.plan === 'starter'
  const secretMenuLimit = isFreeTrial ? 3 : profile.plan === 'spotlight' ? 10 : 999
  const currentItemCount = secretMenuItems.length

  return (
    <div className="space-y-6">
      {/* Qwikker Exclusive Secret Menu Promotion Banner */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-white mb-2">
            Create Exclusive Secret Menu Items
          </h3>
          <p className="text-slate-300 mb-4 leading-relaxed max-w-3xl mx-auto">
            Build excitement and exclusivity by offering secret menu items only available to Qwikker users. 
            These hidden gems create buzz, encourage word-of-mouth marketing, and make customers feel part of an exclusive community.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
              <svg className="w-4 h-4 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Create buzz & excitement</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
              <svg className="w-4 h-4 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2v-6a2 2 0 012-2h2m-4 9h10a2 2 0 002-2V9a2 2 0 00-2-2H7a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
              <span>Encourage word-of-mouth</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
              <svg className="w-4 h-4 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <span>Build exclusive community</span>
            </div>
          </div>
        </div>
      </div>


      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Secret Menu Management</h1>
          <p className="text-gray-400">Create exclusive items that only special customers know about</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-400">
            {currentItemCount} of {secretMenuLimit} secret items
          </p>
          {isFreeTrial && (
            <p className="text-xs text-yellow-400">
              Free Trial: {secretMenuLimit} items maximum
            </p>
          )}
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success' 
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* Existing Secret Menu Items */}
      {secretMenuItems.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Your Secret Menu Items ({secretMenuItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {secretMenuItems.map((item, index) => (
              <div key={item.id || index} className="bg-slate-700/30 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">{item.itemName}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      {item.description && (
                        <div className="md:col-span-2">
                          <span className="text-gray-400">Description:</span>
                          <p className="text-white mt-1">{item.description}</p>
                        </div>
                      )}
                      {item.price && (
                        <div>
                          <span className="text-gray-400">Price:</span>
                          <span className="text-white ml-2">{item.price}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-400">Added:</span>
                        <span className="text-white ml-2">
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-600 text-gray-300 hover:bg-slate-700"
                      onClick={() => {
                        // Pre-fill form for editing
                        setFormData({
                          itemName: item.itemName,
                          description: item.description || '',
                          price: item.price || '',
                        })
                        setShowCreateForm(true)
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-600 text-red-400 hover:bg-red-600/10"
                      onClick={() => setShowDeleteConfirmation(item.created_at || item.itemName)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            {currentItemCount < secretMenuLimit && (
              <div className="pt-4 border-t border-slate-600">
                <Button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white"
                >
                  Add Another Secret Item
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create New Secret Menu Item */}
      {showCreateForm && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Secret Menu Item
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={resetForm}
                className="border-slate-600 text-gray-300 hover:bg-slate-700"
              >
                Cancel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="itemName" className="text-white">Item Name *</Label>
                  <Input
                    id="itemName"
                    value={formData.itemName}
                    onChange={(e) => handleInputChange('itemName', e.target.value)}
                    className="bg-slate-900 text-white border-slate-600 focus:border-[#00d083]"
                    placeholder="e.g., The Founder's Special, Hidden Gem Latte"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Give your secret item an intriguing name that customers will remember
                  </p>
                </div>

                <div>
                  <Label htmlFor="description" className="text-white">Description</Label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="flex w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-white placeholder:text-gray-400 focus:border-[#00d083] focus:ring-[3px] focus:ring-[#00d083]/20 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px] resize-none"
                    placeholder="Describe what makes this item special, its ingredients, or why it's exclusive..."
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Help customers understand what makes this item unique and worth trying
                  </p>
                </div>

                <div>
                  <Label htmlFor="price" className="text-white">Price</Label>
                  <Input
                    id="price"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    className="bg-slate-900 text-white border-slate-600 focus:border-[#00d083]"
                    placeholder="e.g., £12.50, Market Price, Ask for pricing"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Optional - leave blank if price varies or is discussed in person
                  </p>
                </div>
              </div>

              <div className="bg-slate-700/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">Secret Menu Strategy</h4>
                    <p className="text-sm text-gray-400">
                      Secret menu items create exclusivity and word-of-mouth marketing. They're perfect for:
                    </p>
                    <ul className="text-sm text-gray-400 mt-2 space-y-1">
                      <li>• Seasonal or limited-time specials</li>
                      <li>• Items for regular customers or VIPs</li>
                      <li>• Creative combinations not on the main menu</li>
                      <li>• Testing new items before adding to main menu</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="border-slate-600 text-gray-300 hover:bg-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || currentItemCount >= secretMenuLimit}
                  className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white px-8"
                >
                  {isLoading ? 'Adding...' : 'Add Secret Item'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* No Secret Items Yet */}
      {secretMenuItems.length === 0 && !showCreateForm && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-700 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No Secret Menu Items Yet</h3>
            <p className="text-gray-400 mb-6">
              Create exclusive items that only your special customers know about
            </p>
            <Button
              onClick={() => setShowCreateForm(true)}
              disabled={currentItemCount >= secretMenuLimit}
              className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white"
            >
              Create Your First Secret Item
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Plan Upgrade Notice */}
      {isFreeTrial && currentItemCount >= secretMenuLimit && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-500/10 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.98-.833-2.75 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white mb-1">Secret Menu Limit Reached</h3>
                <p className="text-sm text-gray-400">
                  You've reached the maximum of {secretMenuLimit} secret items for the Free Trial plan. 
                  Upgrade to Spotlight for up to 10 items or Pro for unlimited secret menu items.
                </p>
              </div>
              <Button
                onClick={() => router.push('/dashboard/settings')}
                className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white"
              >
                Upgrade Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="bg-slate-800 border-slate-700 max-w-md w-full mx-4">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.98-.833-2.75 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Delete Secret Menu Item
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-300">
                Are you sure you want to delete this secret menu item? 
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirmation(null)}
                  disabled={isDeleting}
                  className="border-slate-600 text-gray-300 hover:bg-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleDeleteSecretMenuItem(showDeleteConfirmation)}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Item'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Review Process Banner */}
      <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
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
    </div>
  )
}
