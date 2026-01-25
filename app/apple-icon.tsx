import { ImageResponse } from 'next/og'

// Apple touch icon metadata
export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

// Apple icon generation
export default function AppleIcon() {
  return new ImageResponse(
    (
      // Black circle with white Q
      <div
        style={{
          fontSize: 120,
          background: '#000',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 'bold',
          borderRadius: '50%',
        }}
      >
        Q
      </div>
    ),
    {
      ...size,
    }
  )
}
