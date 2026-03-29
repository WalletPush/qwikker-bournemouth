import { EmailTemplate } from '../email-service'

const LOGO_URL = process.env.CLOUDINARY_LOGO_URL || 'https://res.cloudinary.com/dsh32kke7/image/upload/f_png,q_auto,w_320/v1768348190/Qwikker_Logo_web_lbql19.svg'

interface CityLiveEmailParams {
  cityName: string
  cityUrl: string
}

export function createCityLiveEmail({ cityName, cityUrl }: CityLiveEmailParams): EmailTemplate {
  const subject = `Qwikker is now live in ${cityName}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QWIKKER</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#ffffff;">
  <div style="max-width:600px;margin:0 auto;background:#1a1a1a;">

    <div style="padding:32px 30px 24px;text-align:center;border-bottom:2px solid #00d083;">
      <img src="${LOGO_URL}" alt="QWIKKER" style="height:40px;width:auto;display:block;margin:0 auto;border:0;" />
    </div>

    <div style="padding:36px 30px;">
      <h2 style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 20px;">${cityName} is live.</h2>
      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">You asked us to bring Qwikker to ${cityName}. It's here. Local offers, secret menus, loyalty programs, and AI-powered recommendations — all in one place.</p>

      <div style="margin:24px 0 8px;">
        <a href="${cityUrl}" style="display:inline-block;background:#00d083;color:#000000;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">Explore ${cityName}</a>
      </div>

      <p style="font-size:12px;line-height:1.7;color:#666;margin:24px 0 0;">You're receiving this because you requested Qwikker in ${cityName}.</p>
    </div>

    <div style="padding:24px 30px;text-align:center;border-top:1px solid #333;">
      <p style="font-size:12px;color:#666;margin:0;">QWIKKER &mdash; ${cityName}</p>
    </div>

  </div>
</body>
</html>`.trim()

  const text = `Qwikker is now live in ${cityName}.\n\nYou asked us to bring Qwikker to ${cityName}. It's here.\n\nExplore ${cityName}: ${cityUrl}\n\nYou're receiving this because you requested Qwikker in ${cityName}.`

  return { subject, html, text }
}
