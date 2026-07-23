'use client'

/**
 * A REAL, scannable QR code for Present Mode — encodes the business's live
 * franchise deep link so a prospect can literally scan the mockups/try-it card
 * in the demo and land on their own listing (via the wallet-pass join flow).
 *
 * Uses qrcode.react (already a dependency, same lib as the admin QR tools).
 *
 * - Default (white) variant: a UI chip with a white quiet-zone for the try-it card.
 * - transparent=true: for "printing" onto a product mockup under mix-blend-multiply,
 *   where the paper itself acts as the quiet zone.
 */

import { QRCodeCanvas } from 'qrcode.react'

export function RealQr({
  value,
  size = 96,
  className = '',
  padding = 6,
  transparent = false,
}: {
  value: string
  size?: number
  className?: string
  /** White quiet-zone padding in px (ignored when transparent). */
  padding?: number
  /** Render on a transparent background (for printing onto paper mockups). */
  transparent?: boolean
}) {
  if (transparent) {
    return (
      <QRCodeCanvas
        value={value}
        size={size}
        level="M"
        bgColor="transparent"
        fgColor="#0f172a"
        className={className}
      />
    )
  }
  return (
    <div className={`inline-block rounded-lg bg-white shadow-sm ${className}`} style={{ padding }}>
      <QRCodeCanvas value={value} size={size} level="M" bgColor="#ffffff" fgColor="#0f172a" />
    </div>
  )
}
