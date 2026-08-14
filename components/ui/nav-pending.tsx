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
  /**
   * Visual press scale/brightness. Off by default for large tappable surfaces
   * (listing cards) — iOS :active fires on scroll finger-down and glitches.
   * Set true for small controls (nav chips, icon buttons).
   */
  pressFeedback?: boolean
  children: ReactNode
}

/**
 * Press feedback for fine-pointer / hover devices only.
 * Never use active:scale on full-width listing cards — it breaks mobile scroll.
 */
export const TAP_FEEDBACK_CLASS =
  'tap-feedback [@media(hover:hover)_and_(pointer:fine)]:transition-[transform,filter] [@media(hover:hover)_and_(pointer:fine)]:duration-100 [@media(hover:hover)_and_(pointer:fine)]:ease-out [@media(hover:hover)_and_(pointer:fine)]:active:scale-[0.98] [@media(hover:hover)_and_(pointer:fine)]:active:brightness-110'

/** Drop-in Link — pressFeedback off by default (scroll-safe for listing cards). */
export function PendingLink({
  pendingLabel: _pendingLabel,
  pressFeedback = false,
  className,
  children,
  ...props
}: PendingLinkProps) {
  return (
    <Link
      {...props}
      className={[
        'tap-feedback',
        pressFeedback ? TAP_FEEDBACK_CLASS : '',
        className || '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </Link>
  )
}
