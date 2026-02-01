'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AlertTriangle, Trash2 } from 'lucide-react'

interface DeleteBusinessModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  businessName: string
  businessId: string
}

export function DeleteBusinessModal({
  isOpen,
  onClose,
  onConfirm,
  businessName,
  businessId
}: DeleteBusinessModalProps) {
  const [confirmText, setConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const isValid = confirmText === 'DELETE'

  const handleConfirm = async () => {
    if (!isValid) return

    setIsDeleting(true)
    try {
      await onConfirm()
      onClose()
    } catch (error) {
      console.error('Delete failed:', error)
    } finally {
      setIsDeleting(false)
      setConfirmText('')
    }
  }

  const handleClose = () => {
    if (!isDeleting) {
      setConfirmText('')
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-slate-900 border-red-500/50">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-500/20 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <DialogTitle className="text-xl text-white">
              Delete Business
            </DialogTitle>
          </div>
          <DialogDescription className="text-slate-300 text-base">
            You are about to <span className="font-bold text-red-400">permanently delete</span> this business:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Business Info */}
          <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
            <div className="font-semibold text-white mb-1">{businessName}</div>
            <div className="text-xs text-slate-400 font-mono">ID: {businessId}</div>
          </div>

          {/* Warning Section */}
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg space-y-2">
            <div className="font-semibold text-red-400 flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              This action cannot be undone!
            </div>
            <ul className="text-sm text-red-300 space-y-1 ml-6 list-disc">
              <li>All business data will be permanently deleted</li>
              <li>Subscription records will be removed</li>
              <li>Offers, menus, and media will be deleted</li>
              <li>Analytics data will be lost</li>
              <li>Business owner will lose access immediately</li>
            </ul>
          </div>

          {/* Confirmation Input */}
          <div className="space-y-2">
            <label className="text-sm text-slate-300">
              To confirm deletion, type <span className="font-bold text-red-400 font-mono">DELETE</span> below:
            </label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="bg-slate-800 border-slate-600 text-white font-mono"
              disabled={isDeleting}
              autoComplete="off"
            />
            {confirmText && !isValid && (
              <p className="text-xs text-red-400">
                Please type "DELETE" exactly (all caps)
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isDeleting}
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid || isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isDeleting ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Permanently
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
