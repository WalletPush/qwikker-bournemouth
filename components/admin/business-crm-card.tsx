'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  BusinessCRMData, 
  formatCurrency, 
  getSubscriptionDisplayText, 
  getPaymentStatusColor,
  getSubscriptionStatusColor,
  calculateTrialStatus
} from '@/types/billing'

interface BusinessCRMCardProps {
  business: BusinessCRMData
  onApprove?: (businessId: string, action: 'approve' | 'reject' | 'restore') => void
  onInspect?: (business: BusinessCRMData) => void
  className?: string
}

export function BusinessCRMCard({ business, onApprove, onInspect, className }: BusinessCRMCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const trialInfo = calculateTrialStatus(business.subscription)
  
  const handleAction = async (action: 'approve' | 'reject' | 'restore') => {
    if (!onApprove) return
    setIsLoading(true)
    try {
      await onApprove(business.id, action)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = () => {
    const statusColors = {
      'incomplete': 'bg-gray-500',
      'pending_review': 'bg-yellow-500',
      'approved': 'bg-green-500',
      'rejected': 'bg-red-500'
    }
    
    return (
      <span className={`px-2 py-1 text-xs font-medium text-white rounded-full ${statusColors[business.status]}`}>
        {business.status.replace('_', ' ').toUpperCase()}
      </span>
    )
  }

  const getTrialBadge = () => {
    if (trialInfo.trial_status === 'not_applicable') return null
    
    const badgeColors = {
      'active': 'bg-blue-500',
      'upgraded': 'bg-purple-500',
      'expired': 'bg-red-500'
    }
    
    const badgeText = {
      'active': `${trialInfo.trial_days_remaining} days left`,
      'upgraded': 'Upgraded (20% off)',
      'expired': 'Trial expired'
    }
    
    return (
      <span className={`px-2 py-1 text-xs font-medium text-white rounded-full ${badgeColors[trialInfo.trial_status]}`}>
        {badgeText[trialInfo.trial_status]}
      </span>
    )
  }

  return (
    <Card className={`bg-slate-800/50 border-slate-700 transition-all duration-200 hover:border-slate-600 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-white text-lg font-semibold mb-2">
              {business.business_name}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {getStatusBadge()}
              {getTrialBadge()}
              {business.has_pending_changes && (
                <span className="px-2 py-1 text-xs font-medium text-orange-300 bg-orange-500/20 rounded-full">
                  {business.pending_changes_count} pending
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400">
              {business.business_category} • {business.business_town}
            </p>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-slate-300 border-slate-600 hover:border-slate-500"
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
            
            {business.status === 'pending_review' && onInspect && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onInspect(business)}
                className="text-blue-300 border-blue-600 hover:border-blue-500"
              >
                Inspect
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick Info - Always Visible */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-slate-400">Subscription</p>
            <p className="text-white font-medium">
              {getSubscriptionDisplayText(business.subscription, business.tier)}
            </p>
          </div>
          
          <div>
            <p className="text-slate-400">Next Billing</p>
            <p className="text-white font-medium">
              {trialInfo.billing_starts_date 
                ? new Date(trialInfo.billing_starts_date).toLocaleDateString()
                : 'N/A'
              }
            </p>
          </div>
          
          <div>
            <p className="text-slate-400">Last Payment</p>
            <p className="text-white font-medium">
              {business.recent_payments?.[0]?.payment_date 
                ? new Date(business.recent_payments[0].payment_date).toLocaleDateString()
                : 'No payments'
              }
            </p>
          </div>
          
          <div>
            <p className="text-slate-400">Status</p>
            <p className={`font-medium ${getSubscriptionStatusColor(business.subscription?.status || 'trial')}`}>
              {business.subscription?.status?.toUpperCase() || 'TRIAL'}
            </p>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="space-y-6 pt-4 border-t border-slate-700">
            {/* Business Details */}
            <div>
              <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Business Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-400">Address</p>
                  <p className="text-white">{business.business_address}</p>
                  <p className="text-slate-300">{business.business_town}, {business.business_postcode}</p>
                </div>
                <div>
                  <p className="text-slate-400">Contact</p>
                  <p className="text-white">{business.email}</p>
                  <p className="text-slate-300">{business.phone}</p>
                </div>
                <div>
                  <p className="text-slate-400">Menu</p>
                  {business.menu_url ? (
                    <a 
                      href={business.menu_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      View Menu PDF
                    </a>
                  ) : (
                    <p className="text-slate-500">No menu uploaded</p>
                  )}
                </div>
                <div>
                  <p className="text-slate-400">Images</p>
                  <p className="text-white">
                    {business.business_images?.length || 0} uploaded
                  </p>
                </div>
              </div>
            </div>

            {/* Current Offer */}
            {business.offer_name && (
              <div>
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  Current Offer
                </h4>
                <div className="bg-slate-700/30 rounded-lg p-3">
                  <p className="text-white font-medium">{business.offer_name}</p>
                  <p className="text-slate-300 text-sm">{business.offer_type}</p>
                </div>
              </div>
            )}

            {/* Secret Menu Items */}
            {business.secret_menu_items && business.secret_menu_items.length > 0 && (
              <div>
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Secret Menu Items ({business.secret_menu_items.length})
                </h4>
                <div className="space-y-2">
                  {business.secret_menu_items.map((item, index) => (
                    <div key={index} className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-700/30 rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-white font-medium">{item.itemName}</p>
                          {item.description && (
                            <p className="text-slate-300 text-sm mt-1">{item.description}</p>
                          )}
                          <p className="text-slate-400 text-xs mt-2">
                            Added: {new Date(item.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        {item.price && (
                          <span className="text-purple-400 font-semibold ml-3">{item.price}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Billing & Subscription Details */}
            {business.subscription && (
              <div>
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Billing & Subscription
                </h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-slate-400">Current Plan</p>
                      <p className="text-white font-medium">{business.tier?.tier_display_name}</p>
                      <p className="text-slate-300">
                        {formatCurrency(business.subscription.discounted_price || business.subscription.base_price)}/{business.subscription.billing_cycle}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">Discount</p>
                      <p className={`font-medium ${business.subscription.has_lifetime_discount ? 'text-green-400' : 'text-slate-500'}`}>
                        {business.subscription.has_lifetime_discount 
                          ? `${business.subscription.lifetime_discount_percent}% for life`
                          : 'None'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">Billing Cycle</p>
                      <p className="text-white font-medium capitalize">{business.subscription.billing_cycle}</p>
                    </div>
                  </div>

                  {/* Free Trial Info */}
                  {business.subscription.is_in_free_trial && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                      <p className="text-blue-300 font-medium">Free Trial Active</p>
                      <p className="text-slate-300 text-sm">
                        Started: {new Date(business.subscription.free_trial_start_date!).toLocaleDateString()}
                      </p>
                      <p className="text-slate-300 text-sm">
                        Ends: {new Date(business.subscription.free_trial_end_date!).toLocaleDateString()}
                      </p>
                      {business.subscription.upgraded_during_trial && (
                        <p className="text-green-300 text-sm font-medium mt-1">
                          ✓ Upgraded during trial - 20% lifetime discount locked in!
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recent Payment History */}
            {business.recent_payments && business.recent_payments.length > 0 && (
              <div>
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Recent Payments (Last 3 Months)
                </h4>
                <div className="space-y-2">
                  {business.recent_payments.slice(0, 3).map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-2 bg-slate-700/30 rounded">
                      <div>
                        <p className="text-white font-medium">
                          {formatCurrency(payment.amount, payment.currency)}
                        </p>
                        <p className="text-slate-400 text-sm">
                          {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : 'Pending'}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        payment.status === 'paid' ? 'bg-green-500/20 text-green-300' :
                        payment.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                        payment.status === 'failed' ? 'bg-red-500/20 text-red-300' :
                        'bg-gray-500/20 text-gray-300'
                      }`}>
                        {payment.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {business.status === 'pending_review' && onApprove && (
              <div className="flex gap-2 pt-4 border-t border-slate-700">
                <Button
                  onClick={() => handleAction('approve')}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isLoading ? 'Processing...' : 'Approve Business'}
                </Button>
                <Button
                  onClick={() => handleAction('reject')}
                  disabled={isLoading}
                  variant="outline"
                  className="border-red-600 text-red-400 hover:bg-red-600/10"
                >
                  {isLoading ? 'Processing...' : 'Reject'}
                </Button>
              </div>
            )}

            {business.status === 'rejected' && onApprove && (
              <div className="flex gap-2 pt-4 border-t border-slate-700">
                <Button
                  onClick={() => handleAction('restore')}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isLoading ? 'Processing...' : 'Restore to Pending'}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
