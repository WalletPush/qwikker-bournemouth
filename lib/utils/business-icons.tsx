import React from 'react'

// Business type to icon mapping - MATCHES ACTUAL DATABASE TYPES
export const BUSINESS_TYPE_ICONS: Record<string, JSX.Element> = {
  // ACTUAL DATABASE BUSINESS TYPES
  'bar': (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12V7a1 1 0 011-1h4l2 5h6a1 1 0 011 1v4a1 1 0 01-1 1H6a1 1 0 01-1-1v-5z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12l2-5m0 0V4a1 1 0 011-1h2a1 1 0 011 1v3" />
    </svg>
  ),
  'cafe': (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 21h8m-4-4v4m-4-4c0-4 0-8 0-12a2 2 0 014 0c0 4 0 8 0 12m-4 0h8m-8 0v-2m8 2v-2" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 9h2a2 2 0 012 2v2a2 2 0 01-2 2h-2" />
    </svg>
  ),
  'restaurant': (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M8 6v14a2 2 0 002 2h4a2 2 0 002-2V6" />
    </svg>
  ),
  'salon': (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM17 21a4 4 0 004-4V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4z" />
    </svg>
  ),
  'spa': (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ),
  'gym': (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
    </svg>
  ),
  'retail_shop': (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 12H6L5 9z" />
    </svg>
  ),
  'hotel': (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  'service_business': (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0H8m8 0v2a2 2 0 002 2M8 6v2a2 2 0 01-2 2m0 8h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  'other': (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
    </svg>
  )
}

// Function to get icon for a business type
export function getBusinessTypeIcon(businessType: string | null | undefined): JSX.Element {
  if (!businessType) return BUSINESS_TYPE_ICONS.other
  
  // Direct match with exact database types
  if (BUSINESS_TYPE_ICONS[businessType]) {
    return BUSINESS_TYPE_ICONS[businessType]
  }
  
  // Fallback to 'other' if no exact match
  return BUSINESS_TYPE_ICONS.other
}

// Business type icon with styling for admin cards
export function BusinessTypeIcon({ 
  businessType, 
  className = "w-12 h-12 p-3 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 text-emerald-400" 
}: { 
  businessType: string | null | undefined
  className?: string 
}) {
  const icon = getBusinessTypeIcon(businessType)
  
  return (
    <div className={className}>
      {React.cloneElement(icon, { className: "w-full h-full" })}
    </div>
  )
}
