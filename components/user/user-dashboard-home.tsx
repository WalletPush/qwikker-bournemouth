'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { mockBusinesses, mockOffers, mockUserCredits, mockUserProfile, levelSystem } from '@/lib/mock-data/user-mock-data'

interface UserDashboardHomeProps {
  stats?: {
    totalBusinesses: number
    totalOffers: number
    totalSecretMenus: number
    realBusinesses: number
    realOffers: number
  }
}

export function UserDashboardHome({ stats }: UserDashboardHomeProps) {
  // Use real stats or fallback to mock data
  const businessCount = stats?.totalBusinesses ?? mockBusinesses.length
  const offerCount = stats?.totalOffers ?? mockOffers.length
  const secretMenuCount = stats?.totalSecretMenus ?? mockBusinesses.filter(b => b.hasSecretMenu).length
  
  // Calculate level info using proper level system
  const userPoints = mockUserProfile.totalPoints // 1250 points
  const currentLevelInfo = levelSystem.getLevelFromPoints(userPoints)
  const nextLevelInfo = levelSystem.getNextLevel(currentLevelInfo.level)
  const pointsToNext = nextLevelInfo ? nextLevelInfo.pointsRequired - userPoints : 0
  
  return (
    <div className="space-y-6">
      {/* Simple Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">
          Welcome back, <span className="bg-gradient-to-r from-[#00d083] to-[#00b86f] bg-clip-text text-transparent">David</span>
        </h1>
        <p className="text-slate-400">Your AI companion is ready to help you discover Bournemouth</p>
      </div>

      {/* AI Companion Hero - Streamlined */}
      <Card className="bg-gradient-to-br from-slate-900/60 to-slate-800/40 border border-slate-700/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-emerald-500/5"></div>
        
        <CardContent className="relative p-6">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-2xl blur-md opacity-30 animate-pulse"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-2xl blur-xl opacity-20 animate-ping"></div>
                <div className="relative p-3 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-2xl border border-emerald-500/20 backdrop-blur-sm">
                  <svg className="w-8 h-8 text-emerald-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-100 mb-1">Your AI Companion</h2>
              <p className="text-slate-300 text-sm">Ask me anything about Bournemouth</p>
            </div>
            <Button asChild className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-black font-bold px-6 py-2 rounded-xl shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:shadow-emerald-500/30">
              <Link href="/user/chat">Start Chat</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Slim Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-emerald-400">{businessCount}</p>
          <p className="text-xs text-slate-400">Places</p>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-orange-400">{offerCount}</p>
          <p className="text-xs text-slate-400">Offers</p>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-purple-400">{secretMenuCount}</p>
          <p className="text-xs text-slate-400">Secrets</p>
        </div>
      </div>

      {/* Clean 2x2 Feature Grid with Better Spacing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Explore Places - Number Hero with Shadows */}
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/20 shadow-lg shadow-slate-900/20 group">
          <CardContent className="p-8">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl shadow-lg">
                  <svg className="w-7 h-7 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-100">Explore Places</h3>
                  <p className="text-slate-400">Discover Bournemouth</p>
                </div>
              </div>
              
              <div className="text-center py-4">
                <p className="text-5xl font-bold text-emerald-400 mb-2">{businessCount}</p>
                <p className="text-slate-400">places to discover</p>
              </div>

              <Button asChild className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-black font-semibold text-lg py-3 shadow-lg">
                <Link href="/user/discover">Start Exploring</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Offers - Number Hero with Shadows */}
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20 hover:border-orange-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/20 shadow-lg shadow-slate-900/20 group">
          <CardContent className="p-8">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl shadow-lg">
                  <svg className="w-7 h-7 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-100">Exclusive Offers</h3>
                  <p className="text-slate-400">Save money today</p>
                </div>
              </div>
              
              <div className="text-center py-4">
                <p className="text-5xl font-bold text-orange-400 mb-2">{offerCount}</p>
                <p className="text-slate-400">offers available</p>
              </div>

              <Button asChild className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:brightness-110 text-black font-semibold text-lg py-3 shadow-lg">
                <Link href="/user/offers">View All Offers</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Qwikker Points - With Progress Bar */}
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20 shadow-lg shadow-slate-900/20 group">
          <CardContent className="p-8">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl shadow-lg">
                  <svg className="w-7 h-7 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-100">Qwikker Points</h3>
                  <p className="text-slate-400">Earn & spend credits</p>
                </div>
              </div>
              
              <div className="text-center py-4">
                <p className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">{userPoints}</p>
                <p className="text-slate-400">points earned</p>
              </div>

              {/* Progress to Next Reward */}
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex justify-between text-sm text-slate-300 mb-2">
                  <span>Level {currentLevelInfo.level} - {currentLevelInfo.title}</span>
                  <span>{pointsToNext} to go</span>
                </div>
              <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: nextLevelInfo ? `${((userPoints - currentLevelInfo.pointsRequired) / (nextLevelInfo.pointsRequired - currentLevelInfo.pointsRequired)) * 100}%` : '100%' }}
                ></div>
              </div>
              <div className="text-amber-400 text-sm font-medium">
                {nextLevelInfo ? `Next: ${nextLevelInfo.title}` : 'Max Level Reached!'}
              </div>
              </div>

              <Button asChild className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:brightness-110 text-white font-semibold text-lg py-3 shadow-lg">
                <Link href="/user/credits">Spend Points</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Secret Menu - Mysterious & Exciting */}
        <Card className="relative bg-gradient-to-br from-slate-900/90 to-purple-900/50 border border-purple-500/30 hover:border-purple-400/60 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/25 shadow-xl shadow-slate-900/40 group overflow-hidden">
          {/* Mysterious Background Effects */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 right-4 text-6xl text-purple-400/30">🔮</div>
            <div className="absolute bottom-4 left-4 text-4xl text-purple-400/30">✨</div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-8xl text-purple-400/15">🗝️</div>
          </div>
          
          {/* Glowing Border Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/20 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          <CardContent className="relative p-8">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur-md opacity-50 animate-pulse"></div>
                  <div className="relative p-4 bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-xl border border-purple-500/30 backdrop-blur-sm">
                    <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-transparent bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text">Secret Menu Club</h3>
                  <p className="text-slate-300">Exclusive dishes you won't find anywhere else</p>
                </div>
              </div>
              
              <div className="text-center py-4 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-purple-500/10 to-purple-500/5 rounded-lg border border-purple-500/20"></div>
                <p className="relative text-5xl font-bold text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text mb-2">{secretMenuCount}</p>
                <p className="relative text-slate-300">hidden secrets await</p>
                <div className="flex justify-center gap-1 mt-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.3}s` }}></div>
                  ))}
                </div>
              </div>

              <Button asChild className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-lg py-3 shadow-lg shadow-purple-500/30 border border-purple-500/50 transition-all duration-300 hover:shadow-purple-500/50 hover:scale-[1.02] relative overflow-hidden">
                <Link href="/user/secret-menu">
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  <span className="relative flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                    Discover Secrets
                  </span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
