'use client'

import { useState, useEffect } from 'react'
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
import { Mail, Search, Loader2, AlertTriangle, Check } from 'lucide-react'

interface AddEmailBusiness {
  id: string
  business_name: string
  website_url?: string | null
}

interface AddEmailModalProps {
  isOpen: boolean
  onClose: () => void
  business: AddEmailBusiness
  onSaved: (email: string) => void
  onError?: (message: string) => void
  initialEmail?: string
}

export function AddEmailModal({ isOpen, onClose, business, onSaved, initialEmail = '' }: AddEmailModalProps) {
  const [email, setEmail] = useState(initialEmail)
  const [isSaving, setIsSaving] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[] | null>(null)
  const [searchNote, setSearchNote] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setEmail(initialEmail)
      setError(null)
      setSuggestions(null)
      setSearchNote(null)
    }
  }, [isOpen, initialEmail])

  const handleFindEmail = async () => {
    setIsSearching(true)
    setError(null)
    setSuggestions(null)
    setSearchNote(null)
    try {
      const res = await fetch('/api/admin/find-business-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: business.id }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setSearchNote(data.error || 'No emails found on their website')
        return
      }
      if (!data.emails || data.emails.length === 0) {
        setSearchNote('No emails found on their website. Enter one manually.')
        return
      }
      setSuggestions(data.emails)
    } catch {
      setSearchNote('Could not search the website. Enter an email manually.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleSave = async () => {
    const trimmed = email.trim()
    if (!trimmed) {
      setError('Please enter an email address')
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/update-business-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: business.id, email: trimmed }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to save email')
        setIsSaving(false)
        return
      }
      onSaved(data.email)
      setIsSaving(false)
      onClose()
    } catch {
      setError('Could not reach the server. Please try again.')
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    if (!isSaving) onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px] bg-slate-900 border-slate-700">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/20 rounded-full">
              <Mail className="h-6 w-6 text-blue-400" />
            </div>
            <DialogTitle className="text-xl text-white">
              {initialEmail ? 'Edit contact email' : 'No email on file'}
            </DialogTitle>
          </div>
          <DialogDescription className="text-slate-300 text-base">
            {initialEmail ? (
              <>
                Update the contact email for{' '}
                <span className="font-semibold text-white">{business.business_name}</span>.
              </>
            ) : (
              <>
                We don&apos;t have an email for{' '}
                <span className="font-semibold text-white">{business.business_name}</span>. Add one
                below{business.website_url ? ', or search their website for it' : ''}.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-slate-400">Email address</label>
            <Input
              type="email"
              placeholder="info@business.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (error) setError(null)
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
              autoFocus
            />
            {error && (
              <p className="text-sm text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                {error}
              </p>
            )}
          </div>

          {business.website_url && (
            <div>
              <Button
                type="button"
                variant="outline"
                onClick={handleFindEmail}
                disabled={isSearching || isSaving}
                className="border-slate-600 text-slate-300 hover:bg-slate-800 w-full"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Searching their website…
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Find email on their website
                  </>
                )}
              </Button>
              {searchNote && <p className="text-xs text-slate-500 mt-2">{searchNote}</p>}
              {suggestions && suggestions.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Found on site</p>
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setEmail(s)}
                      className="w-full text-left px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-sm text-white flex items-center justify-between gap-2 transition-colors"
                    >
                      <span className="break-all">{s}</span>
                      {email === s && <Check className="h-4 w-4 text-[#00d083] flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSaving}
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !email.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              'Save email'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
