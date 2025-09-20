'use client'

import { useState } from 'react'
import Image from 'next/image'

interface Business {
  id: string
  first_name?: string
  last_name?: string
  email: string
  phone?: string
  business_name?: string
  business_category?: string
  business_type?: string
  business_description?: string
  business_tagline?: string
  business_address?: string
  business_town?: string
  business_postcode?: string
  business_hours?: string
  business_hours_structured?: any
  offer_name?: string
  offer_type?: string
  offer_value?: string
  offer_terms?: string
  menu_url?: string
  business_images?: string[]
  logo?: string
  status: string
  created_at: string
}

interface AdminInspectionModalProps {
  business: Business | null
  isOpen: boolean
  onClose: () => void
  onApprove: (businessId: string) => void
  onReject: (businessId: string) => void
  isLoading: boolean
  isInspected: boolean
  onMarkInspected: () => void
}

export default function AdminInspectionModal({
  business,
  isOpen,
  onClose,
  onApprove,
  onReject,
  isLoading,
  isInspected,
  onMarkInspected,
}: AdminInspectionModalProps) {
  // Debug: Check early return conditions
  console.log('🔍 Modal Early Return Check:', {
    isOpen,
    business: business ? 'EXISTS' : 'NULL/UNDEFINED',
    willReturn: !isOpen || !business
  })
  
  if (!isOpen || !business) return null

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${day}/${month}/${year}, ${hours}:${minutes}`
  }

  const handleContactBusiness = () => {
    const subject = `Qwikker Business Application - ${business.business_name || 'Your Business'}`
    const body = `Dear ${business.first_name},

Thank you for your business application to Qwikker.

We have reviewed your submission and would like to discuss some improvements to help get your business approved and live on our platform.

Could you please contact us at your earliest convenience to discuss the next steps?

Best regards,
Qwikker Admin Team`
    
    window.open(`mailto:${business.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank')
  }

  // Debug: Log the business data to see what's being passed
  console.log('🔍 Admin Inspection Modal - Business data:', {
    id: business?.id,
    business_name: business?.business_name,
    logo: business?.logo,
    hasLogo: !!business?.logo,
    logoTrimmed: business?.logo?.trim(),
    logoCondition: business?.logo && business?.logo.trim() !== ''
  })

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50">
      <div className="h-full w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800/80 to-slate-700/80 backdrop-blur-xl border-b border-slate-600/30 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {business.logo && business.logo.trim() !== '' ? (
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-700 flex-shrink-0 ring-2 ring-slate-600/50">
                  <Image
                    src={business.logo}
                    alt={business.business_name || 'Business'}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center ring-2 ring-slate-600/50">
                  <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h6m-6 4h6m-6 4h6" />
                  </svg>
                </div>
              )}
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">
                  {business.business_name || 'New Business Application'}
                </h2>
                <p className="text-slate-300">
                  Applied: {formatDate(business.created_at)} • {business.first_name} {business.last_name}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="bg-slate-800/80 p-4 border-b border-slate-700/50">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <div className="flex items-center gap-4">
              {!isInspected ? (
                <button
                  onClick={onMarkInspected}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Mark as Inspected
                </button>
              ) : (
                <div className="bg-emerald-600/20 border border-emerald-500/50 text-emerald-200 py-2 px-4 rounded-lg flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Inspection Complete
                </div>
              )}
              
              <button
                onClick={handleContactBusiness}
                className="bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Contact Business
              </button>
            </div>
            
            {isInspected && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onApprove(business.id)}
                  disabled={isLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Approve
                </button>
                
                <button
                  onClick={() => onReject(business.id)}
                  disabled={isLoading}
                  className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-slate-900/50 p-6">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left Column - Contact & Business Info */}
              <div className="space-y-6">
                {/* Contact Information Card */}
                <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/20 rounded-2xl p-6 border border-blue-500/20">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 bg-blue-500/30 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-blue-200">Contact Information</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-blue-950/30 rounded-lg p-4">
                      <div className="text-blue-300 text-sm font-medium mb-1">Business Owner</div>
                      <div className="text-white text-lg font-semibold">{business.first_name} {business.last_name}</div>
                    </div>
                    <div className="bg-blue-950/30 rounded-lg p-4">
                      <div className="text-blue-300 text-sm font-medium mb-1">Email Address</div>
                      <div className="text-white font-medium break-all">{business.email}</div>
                    </div>
                    <div className="bg-blue-950/30 rounded-lg p-4">
                      <div className="text-blue-300 text-sm font-medium mb-1">Phone Number</div>
                      <div className="text-white font-medium">{business.phone || 'Not provided'}</div>
                    </div>
                  </div>
                </div>

                {/* Business Details Card */}
                <div className="bg-gradient-to-br from-emerald-900/20 to-emerald-800/20 rounded-2xl p-6 border border-emerald-500/20">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 bg-emerald-500/30 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h6m-6 4h6m-6 4h6" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-emerald-200">Business Details</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-emerald-950/30 rounded-lg p-4">
                      <div className="text-emerald-300 text-sm font-medium mb-1">Business Name</div>
                      <div className="text-white text-lg font-semibold">{business.business_name || 'Not provided'}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-emerald-950/30 rounded-lg p-4">
                        <div className="text-emerald-300 text-sm font-medium mb-1">Category</div>
                        <div className="text-white font-medium">{business.business_category || 'Not provided'}</div>
                      </div>
                      <div className="bg-emerald-950/30 rounded-lg p-4">
                        <div className="text-emerald-300 text-sm font-medium mb-1">Type</div>
                        <div className="text-white font-medium">{business.business_type?.replace('_', ' ') || 'Not provided'}</div>
                      </div>
                    </div>
                    {business.business_description && (
                      <div className="bg-emerald-950/30 rounded-lg p-4">
                        <div className="text-emerald-300 text-sm font-medium mb-2">Description</div>
                        <div className="text-white leading-relaxed">{business.business_description}</div>
                      </div>
                    )}
                    {business.business_tagline && (
                      <div className="bg-emerald-950/30 rounded-lg p-4">
                        <div className="text-emerald-300 text-sm font-medium mb-2">Tagline</div>
                        <div className="text-white italic">"{business.business_tagline}"</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Location & Hours Card */}
                <div className="bg-gradient-to-br from-orange-900/20 to-orange-800/20 rounded-2xl p-6 border border-orange-500/20">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 bg-orange-500/30 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-orange-200">Location & Hours</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-orange-950/30 rounded-lg p-4">
                      <div className="text-orange-300 text-sm font-medium mb-2">Business Address</div>
                      {business.business_address ? (
                        <div className="text-white">
                          <div className="font-medium">{business.business_address}</div>
                          <div className="flex gap-2 mt-2">
                            {business.business_town && (
                              <span className="bg-orange-500/20 px-2 py-1 rounded text-sm">{business.business_town}</span>
                            )}
                            {business.business_postcode && (
                              <span className="bg-orange-500/20 px-2 py-1 rounded text-sm">{business.business_postcode}</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-gray-400">Not provided</div>
                      )}
                    </div>
                    <div className="bg-orange-950/30 rounded-lg p-4">
                      <div className="text-orange-300 text-sm font-medium mb-2">Opening Hours</div>
                      {business.business_hours || business.business_hours_structured ? (
                        <div className="bg-green-500/20 border border-green-500/30 rounded-lg px-3 py-2 text-green-300 font-medium">
                          {business.business_hours || (
                            business.business_hours_structured ? (
                              <div className="space-y-1">
                                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
                                  .filter(day => business.business_hours_structured[day]) // Only show days that exist
                                  .map(day => {
                                    const hours = business.business_hours_structured[day]
                                    return (
                                      <div key={day} className="flex justify-between text-sm">
                                        <span className="capitalize">{day}:</span>
                                        <span>{hours.closed ? 'Closed' : `${hours.open} - ${hours.close}`}</span>
                                      </div>
                                    )
                                  })}
                              </div>
                            ) : 'Not provided'
                          )}
                        </div>
                      ) : (
                        <div className="text-gray-400">Not provided</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Offers, Menu & Photos */}
              <div className="space-y-6">

                {/* Special Offers Card */}
                {business.offer_name ? (
                  <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/20 rounded-2xl p-6 border border-purple-500/20">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 bg-purple-500/30 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 01 3 12V7a4 4 0 01 4-4z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-purple-200">Special Offers</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="bg-purple-950/30 rounded-lg p-4">
                        <div className="text-purple-300 text-sm font-medium mb-1">Offer Name</div>
                        <div className="text-white text-lg font-semibold">{business.offer_name}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-purple-950/30 rounded-lg p-4">
                          <div className="text-purple-300 text-sm font-medium mb-1">Type</div>
                          <div className="text-white font-medium">{business.offer_type || 'Not specified'}</div>
                        </div>
                        <div className="bg-purple-950/30 rounded-lg p-4">
                          <div className="text-purple-300 text-sm font-medium mb-1">Value</div>
                          <div className="text-white font-medium">{business.offer_value || 'Not specified'}</div>
                        </div>
                      </div>
                      {business.offer_terms && (
                        <div className="bg-purple-950/30 rounded-lg p-4">
                          <div className="text-purple-300 text-sm font-medium mb-2">Terms & Conditions</div>
                          <div className="text-white leading-relaxed">{business.offer_terms}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-gray-900/20 to-gray-800/20 rounded-2xl p-6 border border-gray-500/20">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 bg-gray-500/30 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 01 3 12V7a4 4 0 01 4-4z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-gray-300">Special Offers</h3>
                    </div>
                    <div className="text-center py-8">
                      <div className="text-gray-500 text-lg">No special offers provided</div>
                    </div>
                  </div>
                )}

                {/* Menu Card */}
                <div className="bg-gradient-to-br from-yellow-900/20 to-yellow-800/20 rounded-2xl p-6 border border-yellow-500/20">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 bg-yellow-500/30 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 01 2-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-yellow-200">Menu</h3>
                  </div>
                  {business.menu_url ? (
                    <div className="bg-yellow-950/30 rounded-lg p-4">
                      <a 
                        href={business.menu_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/20 hover:bg-blue-500/30 rounded-lg p-4 font-medium"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        View Menu Document
                      </a>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-gray-500 text-lg">No menu provided</div>
                    </div>
                  )}
                </div>

                {/* Secret Menu Items Card */}
                {(() => {
                  // Parse secret menu items from additional_notes
                  let secretMenuItems = []
                  if (business.additional_notes) {
                    try {
                      const notesData = JSON.parse(business.additional_notes)
                      secretMenuItems = notesData.secret_menu_items || []
                    } catch (e) {
                      // Invalid JSON, no secret menu items
                    }
                  }

                  return (
                    <div className="bg-gradient-to-br from-indigo-900/20 to-indigo-800/20 rounded-2xl p-6 border border-indigo-500/20">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 bg-indigo-500/30 rounded-xl flex items-center justify-center">
                          <svg className="w-5 h-5 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-bold text-indigo-200">Secret Menu Items</h3>
                        {secretMenuItems.length > 0 && (
                          <span className="text-indigo-300 text-sm">({secretMenuItems.length})</span>
                        )}
                      </div>
                      {secretMenuItems.length > 0 ? (
                        <div className="space-y-3">
                          {secretMenuItems.map((item: any, index: number) => (
                            <div key={index} className="bg-indigo-950/30 rounded-lg p-4 border border-indigo-500/20">
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="text-white font-semibold text-lg">{item.itemName}</h4>
                                {item.price && (
                                  <span className="text-indigo-300 font-medium">{item.price}</span>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-indigo-100 leading-relaxed">{item.description}</p>
                              )}
                              <div className="mt-3 text-xs text-indigo-400">
                                Added: {new Date(item.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="text-gray-500 text-lg">No secret menu items</div>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Business Logo Card */}
                <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/20 rounded-2xl p-6 border border-blue-500/20">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 bg-blue-500/30 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h6m-6 4h6m-6 4h6" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-blue-200">Business Logo</h3>
                  </div>
                  {business.logo && business.logo.trim() !== '' ? (
                    <div className="flex justify-center">
                      <div className="relative group">
                        <div className="w-32 h-32 bg-blue-950/30 rounded-xl overflow-hidden border border-blue-500/20">
                          <Image
                            src={business.logo}
                            alt={`${business.business_name} logo`}
                            width={128}
                            height={128}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <button
                          onClick={() => window.open(business.logo, '_blank')}
                          className="absolute inset-0 bg-black/0 hover:bg-black/20 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        >
                          <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </div>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-gray-500 text-lg">No logo provided</div>
                    </div>
                  )}
                </div>

                {/* Business Photos Card */}
                <div className="bg-gradient-to-br from-pink-900/20 to-pink-800/20 rounded-2xl p-6 border border-pink-500/20">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 bg-pink-500/30 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-pink-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 01 2.828 0L16 16m-2-2l1.586-1.586a2 2 0 01 2.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-pink-200">Business Photos</h3>
                    {business.business_images && Array.isArray(business.business_images) && (
                      <span className="text-pink-300 text-sm">({business.business_images.length})</span>
                    )}
                  </div>
                  {business.business_images && Array.isArray(business.business_images) && business.business_images.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {business.business_images.slice(0, 4).map((imageUrl: string, index: number) => (
                        <div key={index} className="relative group">
                          <div className="aspect-square bg-pink-950/30 rounded-xl overflow-hidden border border-pink-500/20">
                            <Image
                              src={imageUrl}
                              alt={`Business photo ${index + 1}`}
                              width={150}
                              height={150}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                          <button
                            onClick={() => window.open(imageUrl, '_blank')}
                            className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl"
                          >
                            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                              </svg>
                            </div>
                          </button>
                        </div>
                      ))}
                      {business.business_images.length > 4 && (
                        <div className="aspect-square bg-pink-950/30 rounded-xl flex items-center justify-center border border-pink-500/20">
                          <div className="text-pink-300 text-center">
                            <div className="text-2xl font-bold">+{business.business_images.length - 4}</div>
                            <div className="text-xs">more photos</div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-gray-500 text-lg">No photos provided</div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
