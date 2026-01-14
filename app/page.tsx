import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">

      {/* Main Content */}
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          
          {/* Hero Section */}
          <div className="text-center mb-20">
            {/* Logo */}
            <div className="mb-12">
              <Image
                src="/qwikker-logo-web.svg"
                alt="QWIKKER"
                width={280}
                height={100}
                className="qwikker-logo mx-auto"
                style={{ maxHeight: '96px' }}
                priority
              />
            </div>

            {/* Headlines */}
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Business Dashboard
              <span className="block text-[#00d083]">Platform</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-300 mb-16 max-w-3xl mx-auto leading-relaxed">
              Streamline operations with AI-powered insights, customer management, and growth tools designed for modern businesses.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-20">
              <Link 
                href="/onboarding"
                className="group relative bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-black font-bold py-4 px-12 rounded-2xl transition-colors duration-300 shadow-2xl hover:shadow-[#00d083]/25 flex items-center gap-3 text-lg"
              >
                <span>Start Free Trial</span>
                <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              
              <Link 
                href="/auth/login"
                className="group text-[#00d083] hover:text-white font-semibold border-2 border-[#00d083] hover:border-white py-4 px-12 rounded-2xl transition-all duration-300 hover:bg-[#00d083]/10 flex items-center gap-3 text-lg backdrop-blur-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                <span>Member Sign In</span>
              </Link>
            </div>
          </div>

          {/* Invitation Only Section */}
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-12 mb-20 text-center">
            <div className="max-w-4xl mx-auto">
              <div className="w-20 h-20 bg-gradient-to-br from-[#00d083] to-[#00b86f] rounded-full flex items-center justify-center mx-auto mb-8">
                <svg className="w-10 h-10 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Invitation Only Access
              </h2>
              
              <p className="text-xl text-gray-300 mb-12 leading-relaxed">
                QWIKKER is currently in private beta for founding members only. Join our exclusive community of forward-thinking business owners.
              </p>

              {/* Benefits */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="group p-6 bg-slate-800/30 hover:bg-slate-800/50 rounded-2xl border border-slate-700/50 hover:border-[#00d083]/30 transition-all duration-300">
                  <div className="w-12 h-12 bg-[#00d083]/10 group-hover:bg-[#00d083]/20 rounded-xl flex items-center justify-center mx-auto mb-4 transition-colors">
                    <svg className="w-6 h-6 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Lifetime Benefits</h3>
                  <p className="text-gray-400">Founding member perks that last forever</p>
                </div>

                <div className="group p-6 bg-slate-800/30 hover:bg-slate-800/50 rounded-2xl border border-slate-700/50 hover:border-[#00d083]/30 transition-all duration-300">
                  <div className="w-12 h-12 bg-[#00d083]/10 group-hover:bg-[#00d083]/20 rounded-xl flex items-center justify-center mx-auto mb-4 transition-colors">
                    <svg className="w-6 h-6 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Early Access</h3>
                  <p className="text-gray-400">First to experience new features</p>
                </div>

                <div className="group p-6 bg-slate-800/30 hover:bg-slate-800/50 rounded-2xl border border-slate-700/50 hover:border-[#00d083]/30 transition-all duration-300">
                  <div className="w-12 h-12 bg-[#00d083]/10 group-hover:bg-[#00d083]/20 rounded-xl flex items-center justify-center mx-auto mb-4 transition-colors">
                    <svg className="w-6 h-6 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Special Pricing</h3>
                  <p className="text-gray-400">Locked-in rates for life</p>
                </div>
              </div>
            </div>
          </div>

          {/* How It Works */}
          <div className="text-center mb-20">
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-16">
              Getting Started
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
              <div className="relative p-8 bg-gradient-to-br from-slate-800/40 to-slate-900/40 rounded-3xl border border-slate-700/50">
                <div className="absolute -top-4 left-8">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#00d083] to-[#00b86f] text-black rounded-2xl flex items-center justify-center font-bold text-xl shadow-lg">
                    1
                  </div>
                </div>
                <div className="pt-8">
                  <h4 className="text-2xl font-bold text-white mb-4">Complete Registration</h4>
                  <p className="text-gray-300 text-lg leading-relaxed">
                    Fill out the <strong className="text-white">Founding Member Registration</strong> form with your business details and get instant access.
                  </p>
                </div>
              </div>

              <div className="relative p-8 bg-gradient-to-br from-slate-800/40 to-slate-900/40 rounded-3xl border border-slate-700/50">
                <div className="absolute -top-4 left-8">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#00d083] to-[#00b86f] text-black rounded-2xl flex items-center justify-center font-bold text-xl shadow-lg">
                    2
                  </div>
                </div>
                <div className="pt-8">
                  <h4 className="text-2xl font-bold text-white mb-4">Access Dashboard</h4>
                  <p className="text-gray-300 text-lg leading-relaxed">
                    Login to your business dashboard and <strong className="text-white">start growing</strong> with powerful AI-driven insights.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center pt-16 border-t border-slate-800">
            <p className="text-gray-500 mb-4">© 2025 QWIKKER. All rights reserved.</p>
            <p className="text-gray-400">
              Need access?{' '}
              <a 
                href="mailto:support@qwikker.com" 
                className="text-[#00d083] hover:text-[#00b86f] font-medium transition-colors duration-300 hover:underline"
              >
                Contact our team
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
