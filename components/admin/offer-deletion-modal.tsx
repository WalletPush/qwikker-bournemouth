'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertTriangle, Trash2 } from 'lucide-react'

interface OfferDeletionModalProps {
  isOpen: boolean
  onClose: () => void
  offer: {
    id: string
    offer_name: string
    business_name: string
    offer_value: string
    status: string
  } | null
  onDelete: (offerId: string, confirmationText: string) => Promise<void>
}

export function OfferDeletionModal({ isOpen, onClose, offer, onDelete }: OfferDeletionModalProps) {
  const [confirmationText, setConfirmationText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!offer || confirmationText !== 'DELETE') return

    setIsDeleting(true)
    try {
      await onDelete(offer.id, confirmationText)
      setConfirmationText('')
      onClose()
    } catch (error) {
      console.error('Delete error:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleClose = () => {
    if (!isDeleting) {
      setConfirmationText('')
      onClose()
    }
  }

  if (!offer) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Delete Offer
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning Banner */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-800 mb-1">Permanent Deletion</h3>
                <p className="text-sm text-red-700">
                  This action cannot be undone. The offer will be permanently removed from:
                </p>
                <ul className="text-sm text-red-700 mt-2 ml-4 list-disc">
                  <li>Business dashboard</li>
                  <li>User discovery</li>
                  <li>AI knowledge base</li>
                  <li>All analytics data</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Offer Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Offer to Delete:</h4>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">Name:</span> {offer.offer_name}</p>
              <p><span className="font-medium">Business:</span> {offer.business_name}</p>
              <p><span className="font-medium">Value:</span> {offer.offer_value}</p>
              <p><span className="font-medium">Status:</span> 
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                  offer.status === 'approved' ? 'bg-green-100 text-green-800' :
                  offer.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {offer.status}
                </span>
              </p>
            </div>
          </div>

          {/* Confirmation Input */}
          <div className="space-y-2">
            <Label htmlFor="confirmation" className="text-sm font-medium">
              Type <code className="bg-gray-100 px-1 py-0.5 rounded text-red-600 font-mono">DELETE</code> to confirm:
            </Label>
            <Input
              id="confirmation"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="font-mono"
              disabled={isDeleting}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isDeleting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={confirmationText !== 'DELETE' || isDeleting}
              className="flex-1"
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Offer
                </>
              )}
            </Button>
          </div>

          {/* Additional Warning */}
          <p className="text-xs text-gray-500 text-center">
            Note: Offers that have been claimed by users cannot be deleted.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
