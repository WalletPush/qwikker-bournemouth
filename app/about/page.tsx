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
            Every city is curated separately. No generic recommendations. No algorithm pushing what's popular. Only what actually fits — nothing else.
          </p>

          <p>
            We're building this city by city, with local knowledge baked in from the start.
          </p>
        </div>

        {/* Why we built QWIKKER */}
        <div className="mt-24 pt-16 border-t border-white/[0.06]">
          <h2 className="text-2xl md:text-3xl font-bold tracking-wide uppercase text-white/[0.92] mb-8">
            Why we built QWIKKER
          </h2>
          
          <div className="space-y-6 text-white/[0.68] leading-relaxed">
            <p>
              Local discovery stopped feeling local.
            </p>
            
            <p>
              Search became noisy. Recommendations became generic.
              And the best places — the ones locals actually love — got buried under ads, chains, and keyword games.
            </p>
            
            <p>
              QWIKKER was built to reverse that.
            </p>
            
            {/* Manifesto statement */}
            <p className="mt-8 text-[1.05rem] leading-[1.8] text-white/[0.75]">
              No pay-to-win. No popularity contests. No scraped reviews.
              <br />
              Just real places, real menus, and real intent — city by city.
            </p>
          </div>
        </div>

        {/* Curated by design */}
        <div className="mt-20">
          <h3 className="text-xl md:text-2xl font-bold tracking-wide uppercase text-white/[0.92] mb-6">
            Curated by design
          </h3>
          
          <div className="space-y-4 text-white/[0.68] leading-relaxed">
            <p>
              QWIKKER isn't a free-for-all. Cities are built carefully, with a focus on quality, consistency, and places locals actually trust.
            </p>
            
            <p>
              We prioritise highly rated, well-run local businesses — not chains, not spam, not "who pays most".
            </p>
          </div>
        </div>

        {/* What we believe */}
        <div className="mt-20">
          <h3 className="text-xl md:text-2xl font-bold tracking-wide uppercase text-white/[0.92] mb-6">
            What we believe
          </h3>
          
          <ul className="space-y-4 text-white/[0.72] font-medium text-[1.05rem]">
            <li>Relevance beats reach</li>
            <li>Local beats loud</li>
            <li>Discovery should feel human again</li>
          </ul>
        </div>

        <div className="mt-20">
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
