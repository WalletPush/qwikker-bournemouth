interface CityLiveEmailParams {
  cityName: string
  cityUrl: string
}

export function createCityLiveEmail({ cityName, cityUrl }: CityLiveEmailParams) {
  const subject = `Qwikker is now live in ${cityName}`

  const html = `
    <div style="background-color: #0f172a; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 480px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 32px;">
          <span style="color: #00d083; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Qwikker</span>
        </div>

        <div style="background-color: #1e293b; border-radius: 12px; padding: 32px; border: 1px solid #334155;">
          <h1 style="color: #f1f5f9; font-size: 22px; font-weight: 600; margin: 0 0 16px 0;">
            ${cityName} is live.
          </h1>
          <p style="color: #94a3b8; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
            You asked us to bring Qwikker to ${cityName}. It's here. Local offers, secret menus, loyalty programs, and AI-powered recommendations — all in one place.
          </p>
          <a href="${cityUrl}" style="display: inline-block; background-color: #00d083; color: #000; text-decoration: none; font-weight: 600; font-size: 15px; padding: 12px 28px; border-radius: 8px;">
            Explore ${cityName}
          </a>
        </div>

        <p style="color: #475569; font-size: 12px; text-align: center; margin-top: 24px;">
          You're receiving this because you requested Qwikker in ${cityName}.
        </p>
      </div>
    </div>
  `

  const text = `Qwikker is now live in ${cityName}.\n\nYou asked us to bring Qwikker to ${cityName}. It's here.\n\nExplore ${cityName}: ${cityUrl}\n\nYou're receiving this because you requested Qwikker in ${cityName}.`

  return { subject, html, text }
}
