'use client'

interface City {
  city: string
  display_name: string
  subdomain: string
  country_name: string | null
  status: 'active' | 'coming_soon'
}

interface BusinessCitiesSectionProps {
  cities: City[]
}

export function BusinessCitiesSection({ cities }: BusinessCitiesSectionProps) {
  const liveCities = cities.filter(c => c.status === 'active')
  const comingSoonCities = cities.filter(c => c.status === 'coming_soon')

  return (
    <>
      {/* PRIMARY: Live Cities - Compact grid */}
      {liveCities.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto mb-12">
          {liveCities.map((city) => (
            <a
              key={city.city}
              href={`https://${city.subdomain}.qwikker.com/business-signup`}
              className="group"
            >
              <div className="bg-white/[0.03] border border-white/10 hover:border-[#00d083]/40 rounded-xl p-6 transition-all hover:shadow-lg hover:shadow-[#00d083]/5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00d083]" />
                  <span className="text-xs font-medium uppercase tracking-wider text-[#00d083]">
                    LIVE
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-white group-hover:text-[#00d083] transition-colors mb-1">
                  {city.display_name}
                </h3>
                {city.country_name && (
                  <p className="text-sm text-neutral-500">{city.country_name}</p>
                )}
                <div className="mt-4 flex items-center text-sm text-neutral-400 group-hover:text-[#00d083] transition-colors">
                  Get started
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Divider */}
      {comingSoonCities.length > 0 && (
        <div className="max-w-4xl mx-auto mb-12">
          <div className="h-px bg-white/5" />
        </div>
      )}

      {/* SECONDARY: Coming Soon - Collapsed by default */}
      {comingSoonCities.length > 0 && (
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => {
              const el = document.getElementById('business-coming-soon-list')
              if (el) {
                el.classList.toggle('hidden')
              }
            }}
            className="group flex items-center gap-2 text-neutral-500 hover:text-neutral-300 transition-colors mx-auto"
          >
            <span className="text-sm font-medium">Coming soon</span>
            <svg className="w-4 h-4 transition-transform group-hover:translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div id="business-coming-soon-list" className="hidden mt-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-3 text-center">
              {comingSoonCities.map((city) => (
                <div key={city.city} className="text-sm text-neutral-600">
                  • {city.display_name}
                </div>
              ))}
            </div>
            <p className="text-xs text-neutral-600 text-center mt-8">
              Businesses can join the waitlist now.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
