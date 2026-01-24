import Link from 'next/link'
import Image from 'next/image'

export const metadata = {
  title: 'About — QWIKKER',
  description: 'Built city-by-city to make local discovery feel personal again.',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white">
      {/* Navbar */}
      <nav className="border-b border-white/[0.06] backdrop-blur-sm">
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/qwikker-logo-web.svg"
              alt="QWIKKER"
              width={140}
              height={40}
              priority
              className="h-8 w-auto"
            />
          </Link>
          
          <div className="flex items-center gap-8">
            <Link 
              href="/#live-cities" 
              className="text-sm text-white/[0.68] hover:text-white/[0.92] transition-colors"
            >
              Live cities
            </Link>
            <Link 
              href="/for-business" 
              className="text-sm text-white/[0.68] hover:text-white/[0.92] transition-colors"
            >
              For business
            </Link>
            <Link 
              href="/about" 
              className="text-sm text-white/[0.92]"
            >
              About
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-[700px] mx-auto px-6 py-32">
        <h1 className="text-5xl font-semibold tracking-tight text-white/[0.92] mb-8">
          Built city-by-city.
        </h1>
        
        <div className="space-y-6 text-white/[0.68] leading-relaxed">
          <p>
            QWIKKER is designed to make local discovery feel personal again — specific, honest, and fast.
          </p>
          
          <p>
            Every city is curated separately. No generic recommendations. No algorithm pushing what's popular.
            Just what actually matches what you want.
          </p>

          <p>
            We're building this city by city, with local knowledge baked in from the start.
          </p>
        </div>

        <div className="mt-12">
          <Link 
            href="/#live-cities"
            className="text-[#00d083] hover:text-white transition-colors text-sm flex items-center gap-1"
          >
            View live cities
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] mt-20">
        <div className="max-w-[1200px] mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="flex gap-8 text-sm">
              <Link href="/#live-cities" className="text-white/[0.45] hover:text-white/[0.92] transition-colors">
                Live cities
              </Link>
              <Link href="/for-business" className="text-white/[0.45] hover:text-white/[0.92] transition-colors">
                For business
              </Link>
              <Link href="/about" className="text-white/[0.45] hover:text-white/[0.92] transition-colors">
                About
              </Link>
              <Link href="/privacy-policy" className="text-white/[0.45] hover:text-white/[0.92] transition-colors">
                Privacy
              </Link>
              <a href="mailto:support@qwikker.com" className="text-white/[0.45] hover:text-white/[0.92] transition-colors">
                Contact
              </a>
            </div>
            <p className="text-sm text-white/[0.45]">
              © QWIKKER — Built for cities.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
