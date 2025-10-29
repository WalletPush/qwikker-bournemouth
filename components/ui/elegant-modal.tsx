'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ElegantModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children?: React.ReactNode
  type?: 'success' | 'error' | 'info' | 'warning' | 'secret'
  actions?: Array<{
    label: string
    onClick: () => void
    variant?: 'default' | 'destructive' | 'outline' | 'secondary'
    className?: string
  }>
  showCloseButton?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function ElegantModal({ 
  isOpen, 
  onClose, 
  title, 
  description, 
  children, 
  type = 'info',
  actions = [],
  showCloseButton = true,
  size = 'md'
}: ElegantModalProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          iconBg: 'bg-green-500',
          iconColor: 'text-white',
          border: 'border-slate-700/50',
          icon: (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        }
      case 'error':
        return {
          iconBg: 'bg-red-500',
          iconColor: 'text-white',
          border: 'border-slate-700/50',
          icon: (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          )
        }
      case 'warning':
        return {
          iconBg: 'bg-yellow-500',
          iconColor: 'text-white',
          border: 'border-slate-700/50',
          icon: (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          )
        }
      case 'secret':
        return {
          iconBg: 'bg-purple-500',
          iconColor: 'text-white',
          border: 'border-slate-700/50',
          icon: (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          )
        }
      default:
        return {
          iconBg: 'bg-slate-600',
          iconColor: 'text-white',
          border: 'border-slate-700/50',
          icon: (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        }
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'max-w-sm'
      case 'md': return 'max-w-md'
      case 'lg': return 'max-w-lg'
      case 'xl': return 'max-w-xl'
      default: return 'max-w-md'
    }
  }

  const typeStyles = getTypeStyles()

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md transition-all duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <Card 
        className={`modal-content ${getSizeClasses()} w-full bg-slate-800/95 border ${typeStyles.border} shadow-2xl transition-all duration-300 ${
          isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
      >
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 w-10 h-10 ${typeStyles.iconBg} rounded-full flex items-center justify-center`}>
                {typeStyles.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
                {description && (
                  <p className="text-slate-300 text-sm">{description}</p>
                )}
              </div>
              {showCloseButton && (
                <button 
                  onClick={onClose}
                  className="flex-shrink-0 text-slate-400 hover:text-white transition-colors p-1 rounded-full hover:bg-slate-700/50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Content */}
            {children && (
              <div className="text-slate-300">
                {children}
              </div>
            )}

            {/* Actions */}
            {actions.length > 0 && (
              <div className="flex gap-3 justify-end pt-2">
                {actions.map((action, index) => (
                  <Button
                    key={index}
                    variant={action.variant || 'default'}
                    onClick={action.onClick}
                    className={action.className}
                    size="sm"
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Convenience hook for showing modals
export function useElegantModal() {
  const [modal, setModal] = useState<{
    isOpen: boolean
    title: string
    description?: string
    type?: 'success' | 'error' | 'info' | 'warning' | 'secret'
    children?: React.ReactNode
    actions?: Array<{
      label: string
      onClick: () => void
      variant?: 'default' | 'destructive' | 'outline' | 'secondary'
    }>
  }>({
    isOpen: false,
    title: '',
    description: '',
    type: 'info'
  })

  const showModal = (config: Omit<typeof modal, 'isOpen'>) => {
    setModal({ ...config, isOpen: true })
  }

  const hideModal = () => {
    setModal(prev => ({ ...prev, isOpen: false }))
  }

  const showSuccess = (title: string, description?: string, actions?: typeof modal.actions) => {
    showModal({ title, description, type: 'success', actions })
  }

  const showError = (title: string, description?: string, actions?: typeof modal.actions) => {
    showModal({ title, description, type: 'error', actions })
  }

  const showConfirm = (title: string, description: string, onConfirm: () => void, onCancel?: () => void) => {
    showModal({
      title,
      description,
      type: 'warning',
      actions: [
        {
          label: 'Cancel',
          onClick: () => {
            hideModal()
            onCancel?.()
          },
          variant: 'outline'
        },
        {
          label: 'Confirm',
          onClick: () => {
            hideModal()
            onConfirm?.()
          },
          variant: 'destructive'
        }
      ]
    })
  }

  const ModalComponent = () => (
    <ElegantModal
      isOpen={modal.isOpen}
      onClose={hideModal}
      title={modal.title}
      description={modal.description}
      type={modal.type}
      actions={modal.actions}
    >
      {modal.children}
    </ElegantModal>
  )

  return {
    showModal,
    hideModal,
    showSuccess,
    showError,
    showConfirm,
    ModalComponent,
    isOpen: modal.isOpen
  }
}
