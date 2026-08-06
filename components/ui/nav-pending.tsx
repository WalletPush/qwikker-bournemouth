'use client'

import {
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
} from 'react'
import Link from 'next/link'

/**
 * Lightweight tap acknowledgment for nav links.
 * No overlays / "Opening…" copy — just a quick press flash so the tap feels registered.
 */

interface NavPendingProviderProps {
  children: ReactNode
}

/** Kept for layout compatibility — no global loading UI. */
export function NavPendingProvider({ children }: NavPendingProviderProps) {
  return <>{children}</>
}

/** @deprecated No-op kept so older call sites compile; prefer TapLink press styles. */
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

function flashTap(el: HTMLElement) {
  el.classList.add('tap-pressed')
  window.setTimeout(() => el.classList.remove('tap-pressed'), 220)
  try {
    navigator.vibrate?.(8)
  } catch {
    // ignore
  }
}

/** Drop-in Link with instant press feedback (scale/flash), no loading overlay. */
export function PendingLink({
  pendingLabel: _pendingLabel,
  onClick,
  className,
  children,
  ...props
}: PendingLinkProps) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      flashTap(e.currentTarget)
    }
    onClick?.(e)
  }

  return (
    <Link
      {...props}
      onClick={handleClick}
      className={[
        'tap-target transition-transform duration-150 ease-out',
        'active:scale-[0.97] active:brightness-110',
        className || '',
      ].join(' ')}
    >
      {children}
    </Link>
  )
}
