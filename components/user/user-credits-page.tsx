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
  PointsTransaction 
} from '@/lib/mock-data/user-mock-data'

export function UserCreditsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'badges' | 'rewards'>('overview')
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
      case 'business_visit': return '🏪'
      case 'secret_unlock': return '🗝️'
      case 'offer_redeem': return '🎯'
      case 'friend_referral': return '👥'
      case 'review_write': return '⭐'
      case 'photo_share': return '📸'
      case 'chat_engagement': return '💬'
      case 'daily_login': return '📱'
      default: return '💎'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-2">
          Your <span className="bg-gradient-to-r from-[#00d083] to-[#00b86f] bg-clip-text text-transparent">Credits & Rewards</span>
        </h1>
        <p className="text-xl text-gray-300 mb-1">Track your points, badges, and achievements</p>
        <p className="text-gray-400">Every interaction earns you rewards in the Qwikker ecosystem</p>
      </div>

      {/* Current Points Overview */}
      <Card className="bg-gradient-to-br from-[#00d083]/10 to-[#00b86f]/10 border-[#00d083]/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#00d083]/20 to-transparent rounded-bl-full"></div>
        <CardContent className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-[#00d083] mb-2">{mockUserProfile.totalPoints.toLocaleString()}</div>
              <div className="text-gray-300 font-medium">Total Points</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-400 mb-2">Level {mockUserProfile.level}</div>
              <div className="text-gray-300 font-medium">{mockUserProfile.tier.charAt(0).toUpperCase() + mockUserProfile.tier.slice(1)}</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-400 mb-2">{mockUserProfile.badges.filter(b => b.unlockedDate).length}</div>
              <div className="text-gray-300 font-medium">Badges Earned</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-400 mb-2">{mockUserProfile.stats.streakDays}</div>
              <div className="text-gray-300 font-medium">Day Streak</div>
            </div>
          </div>
          
          {/* Level Progress */}
          <div className="mt-6">
            <div className="flex justify-between text-sm text-gray-300 mb-2">
              <span>Progress to Level {mockUserProfile.level + 1}</span>
              <span>{mockUserProfile.experiencePoints} / {mockUserProfile.nextLevelXP} XP</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-[#00d083] to-[#00b86f] h-3 rounded-full transition-all duration-300"
                style={{ width: `${(mockUserProfile.experiencePoints / mockUserProfile.nextLevelXP) * 100}%` }}
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 justify-center">
        {[
          { key: 'overview', label: 'Overview', icon: '📊' },
          { key: 'history', label: 'Transaction History', icon: '📜' },
          { key: 'badges', label: 'Badges & Achievements', icon: '🏆' },
          { key: 'rewards', label: 'Earning Guide', icon: '💡' }
        ].map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? 'default' : 'outline'}
            onClick={() => setActiveTab(tab.key as any)}
            className={`${
              activeTab === tab.key
                ? 'bg-gradient-to-r from-[#00d083] to-[#00b86f] text-black'
                : 'border-slate-600 text-gray-300 hover:bg-slate-700'
            } font-semibold`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quick Stats */}
          <Card className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 border-slate-600">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <span>📈</span> Your Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                  <div className="text-2xl font-bold text-[#00d083]">{mockUserProfile.stats.businessesVisited}</div>
                  <div className="text-xs text-gray-400">Businesses Visited</div>
                </div>
                <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                  <div className="text-2xl font-bold text-purple-400">{mockUserProfile.stats.secretItemsUnlocked}</div>
                  <div className="text-xs text-gray-400">Secret Items</div>
                </div>
                <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                  <div className="text-2xl font-bold text-orange-400">{mockUserProfile.stats.offersRedeemed}</div>
                  <div className="text-xs text-gray-400">Offers Redeemed</div>
                </div>
                <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                  <div className="text-2xl font-bold text-blue-400">{mockUserProfile.stats.friendsReferred}</div>
                  <div className="text-xs text-gray-400">Friends Referred</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Badges */}
          <Card className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 border-slate-600">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
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
                        <div className="text-white font-medium">{badge.name}</div>
                        <div className="text-xs text-gray-400">{badge.description}</div>
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
            <CardTitle className="text-white flex items-center gap-2">
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
                      <div className="text-white font-medium">{transaction.description}</div>
                      <div className="text-xs text-gray-400">{formatDate(transaction.timestamp)}</div>
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
                <CardTitle className={`text-white flex items-center gap-2 capitalize`}>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${getRarityColor(rarity)} text-white`}>
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
                            <div className={`font-medium text-sm ${isUnlocked ? 'text-white' : 'text-gray-400'}`}>
                              {badge.name}
                            </div>
                            
                            {/* Badge Reward Preview */}
                            {badge.reward && (rarity === 'epic' || rarity === 'legendary') && (
                              <div className="mt-2">
                                <div className={`text-xs px-2 py-1 rounded-full ${
                                  isUnlocked 
                                    ? 'bg-green-500/20 text-green-300' 
                                    : 'bg-gray-600/20 text-gray-400'
                                }`}>
                                  🎁 {badge.reward.title}
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
                                <div className="text-xs text-gray-400 mb-1">
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
                                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 border-slate-600">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <span>💡</span> How to Earn Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(pointsEarningRules).map(([key, rule]) => (
                  <div key={key} className="flex items-center justify-between p-3 bg-slate-700/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="text-xl">{getTransactionIcon(key)}</div>
                      <div className="text-white text-sm">{rule.description}</div>
                    </div>
                    <div className="text-[#00d083] font-bold">+{rule.points}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 border-slate-600">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <span>🎯</span> Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button asChild className="w-full bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-black font-semibold">
                <Link href="/user/discover">
                  <span className="mr-2">🏪</span>
                  Visit a Business (+100 points)
                </Link>
              </Button>
              <Button asChild className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold">
                <Link href="/user/secret-menu">
                  <span className="mr-2">🗝️</span>
                  Unlock Secret Menu (+50 points)
                </Link>
              </Button>
              <Button asChild className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold">
                <Link href="/user/offers">
                  <span className="mr-2">🎯</span>
                  Claim an Offer (+10 points)
                </Link>
              </Button>
              <Button asChild className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold">
                <Link href="/user/chat">
                  <span className="mr-2">💬</span>
                  Chat with AI (+5 points)
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
              <div className={`px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${getRarityColor(selectedBadge.rarity)} text-white inline-block`}>
                {selectedBadge.rarity.toUpperCase()}
              </div>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-gray-300">{selectedBadge.description}</p>
              
              {/* Badge Reward Section */}
              {selectedBadge.reward && (
                <div className="bg-gradient-to-r from-slate-700/30 to-slate-600/30 rounded-lg p-4 border border-slate-600">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">🎁</span>
                    <h3 className="text-lg font-bold text-white">Badge Reward</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="text-[#00d083] font-bold text-lg">{selectedBadge.reward.title}</div>
                    <div className="text-gray-300 text-sm">{selectedBadge.reward.description}</div>
                    <div className="text-orange-400 font-semibold">Value: {selectedBadge.reward.value}</div>
                    <div className="text-xs text-gray-400 italic">📍 {selectedBadge.reward.businessName}</div>
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
                  <div className="text-sm text-gray-400">
                    {mockUserProfile.badges.find(b => b.id === selectedBadge.id)?.progress?.current} / {mockUserProfile.badges.find(b => b.id === selectedBadge.id)?.progress?.target}
                  </div>
                  {selectedBadge.reward && (
                    <div className="text-sm text-yellow-300">🎁 Unlock this badge to claim your reward!</div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-gray-400">🔒 Locked</div>
                  {selectedBadge.reward && (
                    <div className="text-sm text-gray-400">Complete the challenge to unlock this reward!</div>
                  )}
                </div>
              )}
              
              <Button 
                onClick={() => setSelectedBadge(null)}
                variant="outline"
                className="border-slate-600 text-gray-300 hover:bg-slate-700"
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
