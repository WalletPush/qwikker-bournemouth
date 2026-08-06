'use client'

import {
  type ComponentProps,
  type ReactNode,
} from 'react'
import Link from 'next/link'

/**
 * Lightweight tap acknowledgment — CSS press only.
 * Avoid JS class toggles here; stacking with :active caused a double-flash glitch.
 */

interface NavPendingProviderProps {
  children: ReactNode
}

/** Kept for layout compatibility — no global loading UI. */
export function NavPendingProvider({ children }: NavPendingProviderProps) {
  return <>{children}</>
}

/** @deprecated No-op kept so older call sites compile. */
export function useNavPending() {
  return {
    isPending: false,
    label: null as string | null,
    startNavigation: (_label?: string) => {},
  }
}

interface PendingLinkProps extends ComponentProps<typeof Link> {
  /** Ignored — kept so existing call sites don't need a mass rename. */
  pendingLabel?: string
  children: ReactNode
}

/** Shared subtle press classes for links and buttons. */
export const TAP_FEEDBACK_CLASS =
  'tap-feedback transition-[transform,filter] duration-100 ease-out active:scale-[0.98] active:brightness-110'

/** Drop-in Link with subtle press feedback only (no overlay / no JS flash). */
export function PendingLink({
  pendingLabel: _pendingLabel,
  className,
  children,
  ...props
}: PendingLinkProps) {
  return (
    <Link
      {...props}
      className={[TAP_FEEDBACK_CLASS, className || ''].join(' ')}
    >
      {children}
    </Link>
  )
}
