'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { 
  mockUserProfile, 
  mockPointsHistory, 
  pointsEarningRules, 
  mockBadges, 
  Badge,
  PointsTransaction,
  levelSystem
} from '@/lib/mock-data/user-mock-data'

export function UserCreditsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'spend' | 'history' | 'badges' | 'rewards'>('overview')
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null)

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'from-gray-500 to-gray-600'
      case 'rare': return 'from-blue-500 to-blue-600' 
      case 'epic': return 'from-purple-500 to-purple-600'
      case 'legendary': return 'from-yellow-400 to-orange-500'
      default: return 'from-gray-500 to-gray-600'
    }
  }

  const getRarityBorder = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'border-gray-500/50'
      case 'rare': return 'border-blue-500/50' 
      case 'epic': return 'border-purple-500/50'
      case 'legendary': return 'border-yellow-400/50'
      default: return 'border-gray-500/50'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTransactionIcon = (reason: string) => {
    switch (reason) {
      case 'business_visit': return '+'
      case 'secret_unlock': return '+'
      case 'offer_redeem': return '+'
      case 'friend_referral': return '+'
      case 'review_write': return '+'
      case 'photo_share': return '+'
      case 'chat_engagement': return '+'
      case 'daily_login': return '+'
      default: return '+'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-slate-100 mb-2">
          Your <span className="bg-gradient-to-r from-[#00d083] to-[#00b86f] bg-clip-text text-transparent">Qwikker Credits</span>
        </h1>
        <p className="text-slate-400">Earn real money off your bills at Bournemouth businesses</p>
      </div>

      {/* Hero Metric - Simplified */}
      <Card className="bg-gradient-to-br from-[#00d083]/10 to-[#00b86f]/10 border-[#00d083]/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#00d083]/20 to-transparent rounded-bl-full"></div>
        <CardContent className="p-8 text-center">
          <div className="space-y-4">
            <div>
              <div className="text-5xl font-bold text-[#00d083] mb-2">{mockUserProfile.totalPoints.toLocaleString()}</div>
              <div className="text-slate-300 text-lg">Qwikker Points</div>
            </div>
            
            <div className="bg-slate-800/50 rounded-xl p-4 max-w-md mx-auto">
              <div className="text-slate-100 font-semibold mb-2">Level {(() => {
                const currentLevel = levelSystem.getLevelFromPoints(mockUserProfile.totalPoints)
                return `${currentLevel.level} - ${currentLevel.title}`
              })()}</div>
              <div className="text-slate-300 text-sm mb-3">{(() => {
                const currentLevel = levelSystem.getLevelFromPoints(mockUserProfile.totalPoints)
                const nextLevel = levelSystem.getNextLevel(currentLevel.level)
                return nextLevel ? `${nextLevel.pointsRequired - mockUserProfile.totalPoints} points until ${nextLevel.title}` : 'Max level reached!'
              })()}</div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-[#00d083] to-[#00b86f] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(() => {
                    const currentLevel = levelSystem.getLevelFromPoints(mockUserProfile.totalPoints)
                    const nextLevel = levelSystem.getNextLevel(currentLevel.level)
                    if (!nextLevel) return 100
                    return ((mockUserProfile.totalPoints - currentLevel.pointsRequired) / (nextLevel.pointsRequired - currentLevel.pointsRequired)) * 100
                  })()}%` }}
                ></div>
              </div>
              <div className="text-amber-400 text-sm mt-2 font-medium">{(() => {
                const currentLevel = levelSystem.getLevelFromPoints(mockUserProfile.totalPoints)
                const nextLevel = levelSystem.getNextLevel(currentLevel.level)
                return nextLevel ? `Next: ${nextLevel.title}` : 'Maximum level achieved!'
              })()}</div>
            </div>

            {/* Streak Emphasis */}
            <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-lg p-3 max-w-sm mx-auto">
              <div className="text-2xl">🔥</div>
              <div>
                <div className="text-orange-400 font-bold">{mockUserProfile.stats.streakDays} Day Streak</div>
                <div className="text-slate-400 text-xs">Keep it alive!</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation - Moved to Top */}
      <div className="flex flex-wrap gap-2 justify-center">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'spend', label: 'Spend Credits' },
          { key: 'history', label: 'History' },
          { key: 'badges', label: 'Badges' },
          { key: 'rewards', label: 'How It Works' }
        ].map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? 'default' : 'outline'}
            onClick={() => setActiveTab(tab.key as any)}
            className={`${
              activeTab === tab.key
                ? 'bg-gradient-to-r from-[#00d083] to-[#00b86f] text-black'
                : 'border-slate-600 text-slate-300 hover:bg-slate-700'
            } font-semibold`}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'spend' && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-100">Spend Your Credits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gradient-to-r from-[#00d083]/10 to-[#00b86f]/10 border border-[#00d083]/30 rounded-lg p-4">
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-[#00d083] mb-2">£{(() => {
                  // Calculate actual earned credits from badge rewards only
                  const earnedCredits = mockUserProfile.badges
                    .filter(badge => badge.unlockedDate && badge.reward)
                    .reduce((total, badge) => {
                      const value = badge.reward?.value?.replace('£', '') || '0'
                      return total + parseFloat(value)
                    }, 0)
                  return earnedCredits.toFixed(2)
                })()}</div>
                <div className="text-slate-300">Available to spend</div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <div>
                    <div className="text-slate-100 font-medium">Apply to any bill</div>
                    <div className="text-slate-400 text-sm">Use at checkout with partner businesses</div>
                  </div>
                  <Button className="bg-[#00d083] hover:bg-[#00b86f] text-black">Apply Credit</Button>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <div>
                    <div className="text-slate-100 font-medium">Gift to a friend</div>
                    <div className="text-slate-400 text-sm">Share the love, spread the word</div>
                  </div>
                  <Button variant="outline" className="border-[#00d083]/30 text-[#00d083]">Send Gift</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'rewards' && (
        <Card className="bg-gradient-to-br from-[#00d083]/20 via-blue-500/10 to-purple-500/20 border-[#00d083]/50 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#00d083]/5 via-transparent to-purple-500/5"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#00d083]/30 to-transparent rounded-bl-full"></div>
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-3xl font-bold text-slate-100">How Qwikker Rewards Work</CardTitle>
            <p className="text-slate-300 text-lg">Real rewards for real experiences</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-4 text-center relative overflow-hidden">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-slate-100 font-bold text-xl mx-auto mb-3">1</div>
                  <h3 className="text-slate-100 font-bold mb-1">Refer Friends</h3>
                  <p className="text-slate-300 text-sm">Share your referral link</p>
                  <div className="text-purple-400 font-bold text-lg mt-2">+500 Points</div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-xl p-4 text-center relative overflow-hidden">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-slate-100 font-bold text-xl mx-auto mb-3">2</div>
                  <h3 className="text-slate-100 font-bold mb-1">Redeem Offers</h3>
                  <p className="text-slate-300 text-sm">Actually use offers at businesses</p>
                  <div className="text-blue-400 font-bold text-lg mt-2">+50 Points</div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#00d083]/20 to-[#00b86f]/20 border border-[#00d083]/30 rounded-xl p-4 text-center relative overflow-hidden">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-r from-[#00d083] to-[#00b86f] rounded-full flex items-center justify-center text-black font-bold text-xl mx-auto mb-3">3</div>
                  <h3 className="text-slate-100 font-bold mb-1">Visit Businesses</h3>
                  <p className="text-slate-300 text-sm">Simple validation coming soon</p>
                  <div className="text-[#00d083] font-bold text-lg mt-2">+25 Points</div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-xl p-4 text-center relative overflow-hidden">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center text-slate-100 font-bold text-xl mx-auto mb-3">4</div>
                  <h3 className="text-slate-100 font-bold mb-1">Get Credits</h3>
                  <p className="text-slate-300 text-sm">Money off at ANY partner venue</p>
                  <div className="text-orange-400 font-bold text-lg mt-2">Up to £20 Credit</div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-slate-700/30 to-slate-600/30 border border-slate-500/50 rounded-xl p-6">
              <h3 className="text-2xl font-bold text-slate-100 text-center mb-4">Badge Rewards</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-r from-purple-900/40 to-purple-800/40 border border-purple-500/40 rounded-lg p-4">
                  <h4 className="text-purple-300 font-bold mb-2">Epic Badges</h4>
                  <div className="space-y-1 text-sm text-slate-300 mb-3">
                    <div>Hype Lord (10+ referrals)</div>
                    <div>Treasure Hoarder (5,000+ points)</div>
                  </div>
                  <div className="text-[#00d083] font-bold text-lg">£5 Qwikker Credit</div>
                  <div className="text-slate-400 text-xs mt-1">Hype Lord: +50p per additional referral</div>
                </div>

                <div className="bg-gradient-to-r from-yellow-900/40 to-orange-900/40 border border-yellow-500/40 rounded-lg p-4">
                  <h4 className="text-yellow-300 font-bold mb-2">Legendary Badges</h4>
                  <div className="space-y-1 text-sm text-slate-300 mb-3">
                    <div>Bournemouth Legend (Ultimate mastery)</div>
                    <div>Founding Member (First 100 users)</div>
                  </div>
                  <div className="text-[#00d083] font-bold text-lg">£15-£20 Qwikker Credit</div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <Button asChild className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-black font-bold text-lg px-8 py-4">
                <Link href="/user/discover">Start Earning Credits Now</Link>
              </Button>
              <p className="text-slate-400 text-sm mt-2">Find partner businesses and start your reward journey</p>
            </div>
          </CardContent>
        </Card>
      )}


      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quick Stats */}
          <Card className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 border-slate-600">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2">
                <span>📈</span> Your Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                  <div className="text-2xl font-bold text-[#00d083]">{mockUserProfile.stats.businessesVisited}</div>
                  <div className="text-xs text-slate-400">Businesses Visited</div>
                </div>
                <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                  <div className="text-2xl font-bold text-purple-400">{mockUserProfile.stats.secretItemsUnlocked}</div>
                  <div className="text-xs text-slate-400">Secret Items</div>
                </div>
                <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                  <div className="text-2xl font-bold text-orange-400">{mockUserProfile.stats.offersRedeemed}</div>
                  <div className="text-xs text-slate-400">Offers Redeemed</div>
                </div>
                <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                  <div className="text-2xl font-bold text-blue-400">{mockUserProfile.stats.friendsReferred}</div>
                  <div className="text-xs text-slate-400">Friends Referred</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Badges */}
          <Card className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 border-slate-600">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2">
                <span>🏆</span> Recent Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockUserProfile.badges
                  .filter(b => b.unlockedDate)
                  .slice(0, 4)
                  .map((badge, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 bg-slate-700/20 rounded-lg">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${getRarityColor(badge.rarity)} flex items-center justify-center text-lg`}>
                        {badge.icon}
                      </div>
                      <div className="flex-1">
                        <div className="text-slate-100 font-medium">{badge.name}</div>
                        <div className="text-xs text-slate-400">{badge.description}</div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'history' && (
        <Card className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 border-slate-600">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2">
              <span>📜</span> Points Transaction History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockPointsHistory.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 bg-slate-700/20 rounded-lg hover:bg-slate-700/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{getTransactionIcon(transaction.reason)}</div>
                    <div>
                      <div className="text-slate-100 font-medium">{transaction.description}</div>
                      <div className="text-xs text-slate-400">{formatDate(transaction.timestamp)}</div>
                      {transaction.relatedItem && (
                        <div className="text-xs text-[#00d083]">{transaction.relatedItem.name}</div>
                      )}
                    </div>
                  </div>
                  <div className={`text-lg font-bold ${transaction.type === 'earned' ? 'text-green-400' : 'text-red-400'}`}>
                    {transaction.type === 'earned' ? '+' : ''}{transaction.amount}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'badges' && (
        <div className="space-y-6">
          {/* Badge Categories */}
          {['legendary', 'epic', 'rare', 'common'].map(rarity => (
            <Card key={rarity} className={`bg-gradient-to-br from-slate-800/50 to-slate-700/30 border-slate-600 ${getRarityBorder(rarity)}`}>
              <CardHeader>
                <CardTitle className={`text-slate-100 flex items-center gap-2 capitalize`}>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${getRarityColor(rarity)} text-slate-100`}>
                    {rarity.toUpperCase()}
                  </span>
                  {rarity} Badges
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {mockBadges
                    .filter(badge => badge.rarity === rarity)
                    .map((badge) => {
                      const userBadge = mockUserProfile.badges.find(b => b.id === badge.id)
                      const isUnlocked = userBadge?.unlockedDate
                      const hasProgress = userBadge?.progress
                      
                      return (
                        <div
                          key={badge.id}
                          onClick={() => setSelectedBadge(badge)}
                          className={`relative p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer hover:scale-105 ${
                            isUnlocked 
                              ? `${getRarityBorder(rarity)} bg-gradient-to-br ${getRarityColor(rarity)}/10` 
                              : 'border-slate-600 bg-slate-700/20 opacity-60'
                          }`}
                        >
                          <div className="text-center">
                            <div className={`text-4xl mb-2 ${!isUnlocked ? 'grayscale' : ''}`}>
                              {badge.icon}
                            </div>
                            <div className={`font-medium text-sm ${isUnlocked ? 'text-slate-100' : 'text-slate-400'}`}>
                              {badge.name}
                            </div>
                            
                            {/* Requirements */}
                            {(badge.pointsRequired && badge.pointsRequired > 0) && (
                              <div className="mt-1">
                                <div className={`text-xs px-2 py-1 rounded-full ${
                                  isUnlocked 
                                    ? 'bg-green-500/20 text-green-300' 
                                    : 'bg-slate-600/50 text-slate-400'
                                }`}>
                                  {badge.pointsRequired.toLocaleString()} points required
                                </div>
                              </div>
                            )}
                            {badge.alternateRequirement && (
                              <div className="mt-1">
                                <div className={`text-xs px-2 py-1 rounded-full ${
                                  isUnlocked 
                                    ? 'bg-green-500/20 text-green-300' 
                                    : 'bg-blue-600/50 text-blue-400'
                                }`}>
                                  {badge.alternateRequirement.label}
                                </div>
                              </div>
                            )}
                            
                            {/* Badge Reward Preview */}
                            {badge.reward && (rarity === 'epic' || rarity === 'legendary') && (
                              <div className="mt-2">
                                <div className={`text-xs px-2 py-1 rounded-full ${
                                  isUnlocked 
                                    ? 'bg-green-500/20 text-green-300' 
                                    : 'bg-gray-600/20 text-slate-400'
                                }`}>
                                  {badge.reward.title}
                                </div>
                                {isUnlocked && (
                                  <div className="text-xs text-[#00d083] font-semibold mt-1">
                                    {badge.reward.value}
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {hasProgress && !isUnlocked && (
                              <div className="mt-2">
                                <div className="text-xs text-slate-400 mb-1">
                                  {hasProgress.current} / {hasProgress.target}
                                </div>
                                <div className="w-full bg-slate-600 rounded-full h-1">
                                  <div 
                                    className={`bg-gradient-to-r ${getRarityColor(rarity)} h-1 rounded-full`}
                                    style={{ width: `${(hasProgress.current / hasProgress.target) * 100}%` }}
                                  ></div>
                                </div>
                              </div>
                            )}
                            {isUnlocked && (
                              <div className="absolute -top-2 -right-2">
                                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                  <svg className="w-4 h-4 text-slate-100" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'rewards' && (
        <div className="space-y-6">
          {/* How the System Works */}
          <Card className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 border-slate-600">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2">
                <span>🎯</span> How Qwikker Rewards Work
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gradient-to-r from-[#00d083]/10 to-[#00b86f]/10 border border-[#00d083]/30 rounded-lg p-4">
                <h3 className="text-[#00d083] font-bold text-lg mb-2">Earn Points Through Real Actions</h3>
                <p className="text-slate-300 text-sm mb-4">
                  Points are earned by genuinely engaging with Bournemouth businesses. No shortcuts or easy farming - just real experiences!
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-slate-700/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">🏪</span>
                      <span className="text-slate-100 font-semibold">Visit Businesses</span>
                    </div>
                    <p className="text-slate-400 text-xs">Scan QR codes at partner venues</p>
                    <p className="text-[#00d083] font-bold text-sm">+100 points</p>
                  </div>
                  <div className="bg-slate-700/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">🎯</span>
                      <span className="text-slate-100 font-semibold">Redeem Offers</span>
                    </div>
                    <p className="text-slate-400 text-xs">Actually use offers at businesses</p>
                    <p className="text-[#00d083] font-bold text-sm">+25 points</p>
                  </div>
                  <div className="bg-slate-700/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">👥</span>
                      <span className="text-slate-100 font-semibold">Refer Friends</span>
                    </div>
                    <p className="text-slate-400 text-xs">Friends who actually join & use app</p>
                    <p className="text-[#00d083] font-bold text-sm">+75 points</p>
                  </div>
                  <div className="bg-slate-700/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">⭐</span>
                      <span className="text-slate-100 font-semibold">Write Reviews</span>
                    </div>
                    <p className="text-slate-400 text-xs">After verified visits only</p>
                    <p className="text-[#00d083] font-bold text-sm">+20 points</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Badge Rewards System */}
          <Card className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-purple-700/30">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2">
                <span>🏆</span> Badge Rewards System
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center mb-4">
                <p className="text-slate-300">Earn badges through consistent engagement, unlock real rewards!</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-r from-purple-900/30 to-purple-800/30 border border-purple-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">💎</span>
                    <h3 className="text-purple-300 font-bold">Epic Badges</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="text-slate-100">🗝️ Secret Menu Master → £5 credit</div>
                    <div className="text-slate-100">💎 Point Collector → £4 credit</div>
                    <div className="text-slate-100">📢 Influencer → £3 credit</div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-purple-500/20">
                    <div className="text-[#00d083] font-bold">Rewards: £3-£5 Qwikker Credit</div>
                    <div className="text-slate-400 text-xs">Use at any partner venue</div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">👑</span>
                    <h3 className="text-yellow-300 font-bold">Legendary Badges</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="text-slate-100">👑 Bournemouth Legend → £10 credit</div>
                    <div className="text-slate-100">⭐ Founding Member → £10 credit</div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-yellow-500/20">
                    <div className="text-[#00d083] font-bold">Rewards: £10 Qwikker Credit</div>
                    <div className="text-slate-400 text-xs">Premium credits for ultimate achievements</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* How to Track Visits */}
          <Card className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 border-slate-600">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2">
                <span>📱</span> How to Check In at Businesses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-[#00d083]/10 border border-[#00d083]/30 rounded-lg p-4">
                  <h3 className="text-[#00d083] font-semibold mb-2">Step-by-Step Check-In Process:</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-[#00d083] rounded-full flex items-center justify-center text-black font-bold text-sm">1</div>
                      <div>
                        <div className="text-slate-100 font-medium">Visit a Partner Business</div>
                        <div className="text-slate-400 text-sm">Look for the Qwikker QR code displayed in-store</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-[#00d083] rounded-full flex items-center justify-center text-black font-bold text-sm">2</div>
                      <div>
                        <div className="text-slate-100 font-medium">Open Your Qwikker App</div>
                        <div className="text-slate-400 text-sm">Tap the "Check In" button or QR scanner</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-[#00d083] rounded-full flex items-center justify-center text-black font-bold text-sm">3</div>
                      <div>
                        <div className="text-slate-100 font-medium">Scan the QR Code</div>
                        <div className="text-slate-400 text-sm">Point your camera at the business QR code</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-[#00d083] rounded-full flex items-center justify-center text-black font-bold text-sm">4</div>
                      <div>
                        <div className="text-slate-100 font-medium">Earn Your Points!</div>
                        <div className="text-slate-400 text-sm">Get 100 points instantly (once per day per business)</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-400">⚠️</span>
                    <div>
                      <div className="text-yellow-300 font-medium text-sm">Anti-Abuse Protection</div>
                      <div className="text-slate-400 text-xs">GPS verification required • 1 check-in per business per day • QR codes rotate regularly</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 border-slate-600">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2">
                <span>🚀</span> Start Earning Now
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-black font-semibold">
                <Link href="/user/discover">
                  <span className="mr-2">🏪</span>
                  Find Partner Businesses Near You
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-700">
                <Link href="/user/secret-menu">
                  <span className="mr-2">🗝️</span>
                  Explore Secret Menus (Free!)
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-700">
                <Link href="/user/offers">
                  <span className="mr-2">🎯</span>
                  Browse Current Offers
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Badge Detail Modal */}
      {selectedBadge && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className={`bg-gradient-to-br from-slate-800 to-slate-700 border-2 ${getRarityBorder(selectedBadge.rarity)} max-w-md w-full`}>
            <CardHeader className="text-center">
              <div className={`text-6xl mb-4`}>{selectedBadge.icon}</div>
              <CardTitle className={`text-2xl bg-gradient-to-r ${getRarityColor(selectedBadge.rarity)} bg-clip-text text-transparent`}>
                {selectedBadge.name}
              </CardTitle>
              <div className={`px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${getRarityColor(selectedBadge.rarity)} text-slate-100 inline-block`}>
                {selectedBadge.rarity.toUpperCase()}
              </div>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-slate-300">{selectedBadge.description}</p>
              
              {/* Badge Reward Section */}
              {selectedBadge.reward && (
                <div className="bg-gradient-to-r from-slate-700/30 to-slate-600/30 rounded-lg p-4 border border-slate-600">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">🎁</span>
                    <h3 className="text-lg font-bold text-slate-100">Badge Reward</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="text-[#00d083] font-bold text-lg">{selectedBadge.reward.title}</div>
                    <div className="text-slate-300 text-sm">{selectedBadge.reward.description}</div>
                    <div className="text-orange-400 font-semibold">Value: {selectedBadge.reward.value}</div>
                    <div className="text-xs text-slate-400 italic">📍 {selectedBadge.reward.businessName}</div>
                    <div className="text-xs text-gray-500 bg-slate-800/50 rounded p-2 mt-2">
                      <strong>Terms:</strong> {selectedBadge.reward.terms}
                    </div>
                    {selectedBadge.reward.redemptionCode && (
                      <div className="text-xs text-purple-300 font-mono bg-purple-900/20 rounded p-2 border border-purple-500/30">
                        <strong>Code:</strong> {selectedBadge.reward.redemptionCode}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Badge Status */}
              {mockUserProfile.badges.find(b => b.id === selectedBadge.id)?.unlockedDate ? (
                <div className="space-y-2">
                  <div className="text-green-400 font-semibold">✅ Unlocked!</div>
                  {selectedBadge.reward && (
                    <div className="text-sm text-green-300">🎉 Your reward is ready to use!</div>
                  )}
                </div>
              ) : mockUserProfile.badges.find(b => b.id === selectedBadge.id)?.progress ? (
                <div className="space-y-2">
                  <div className="text-yellow-400">🔄 In Progress</div>
                  <div className="text-sm text-slate-400">
                    {mockUserProfile.badges.find(b => b.id === selectedBadge.id)?.progress?.current} / {mockUserProfile.badges.find(b => b.id === selectedBadge.id)?.progress?.target}
                  </div>
                  {selectedBadge.reward && (
                    <div className="text-sm text-yellow-300">🎁 Unlock this badge to claim your reward!</div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-slate-400">🔒 Locked</div>
                  {selectedBadge.reward && (
                    <div className="text-sm text-slate-400">Complete the challenge to unlock this reward!</div>
                  )}
                </div>
              )}
              
              <Button 
                onClick={() => setSelectedBadge(null)}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
