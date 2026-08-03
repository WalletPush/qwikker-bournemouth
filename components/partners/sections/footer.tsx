'use client'

const LOGO_URL =
  'https://res.cloudinary.com/dsh32kke7/image/upload/f_png,q_auto,w_320/v1768348190/Qwikker_Logo_web_lbql19.svg'

export function PartnersFooter() {
  return (
    <footer className="border-t border-[var(--p-border)] py-12 px-5 sm:px-6">
      <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <img src={LOGO_URL} alt="QWIKKER" className="h-6 opacity-50" />
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-[var(--p-faint)]">
          <a href="/privacy-policy" className="hover:text-white transition-colors">
            Privacy Policy
          </a>
          <a href="/terms-of-service" className="hover:text-white transition-colors">
            Terms
          </a>
          <span>&copy; {new Date().getFullYear()} Qwikker. All rights reserved.</span>
        </div>
      </div>
    </footer>
  )
}
