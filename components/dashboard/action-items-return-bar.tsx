'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function ReturnBarInner() {
  const searchParams = useSearchParams()
  if (searchParams.get('from') !== 'action-items') return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:pl-64">
      <div className="bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 px-4 py-3">
        <div className="flex flex-col items-center gap-1">
          <Link
            href="/dashboard/action-items"
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] rounded-lg transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to action items
          </Link>
          <p className="text-xs text-slate-500">
            Done editing? Head back to your checklist.
          </p>
        </div>
      </div>
    </div>
  )
}

/** Sticky bottom bar that appears when user navigated from the action items checklist */
export function ActionItemsReturnBar() {
  return (
    <Suspense fallback={null}>
      <ReturnBarInner />
    </Suspense>
  )
}
