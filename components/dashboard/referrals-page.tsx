'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Profile } from '@/types/profiles'
import { generateReferralCodeForUser } from '@/lib/actions/generate-referral-code'
import { getUserReferrals } from '@/lib/actions/referral-actions'

interface Referral {
  id: string
  referred_business_name: string
  referred_owner_name: string
  status: 'pending' | 'approved' | 'credited' | 'rejected'
  reward_amount: number
  conversion_date: string
  credited_date?: string
}

interface ReferralsPageProps {
  profile: Profile
}

export function ReferralsPage({ profile }: ReferralsPageProps) {
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [copyMessage, setCopyMessage] = useState<string | null>(null)
  const [currentProfile, setCurrentProfile] = useState<Profile>(profile)

  // Generate referral code if missing and load referrals
  useEffect(() => {
    const initializeReferralData = async () => {
      // Generate referral code if missing
      if (!currentProfile.referral_code && currentProfile.user_id) {
        try {
          const result = await generateReferralCodeForUser(currentProfile.user_id)
          if (result.success) {
            setCurrentProfile(prev => ({ ...prev, referral_code: result.code }))
          }
        } catch (error) {
          console.error('Failed to generate referral code:', error)
        }
      }

      // Load real referrals data
      try {
        const referralsResult = await getUserReferrals(currentProfile.user_id)
        if (referralsResult.success && referralsResult.data) {
          // Map the database result to our interface
          const mappedReferrals = referralsResult.data.map((ref: any) => ({
            id: ref.id,
            referred_business_name: ref.referred?.business_name || 'Unknown Business',
            referred_owner_name: `${ref.referred?.first_name || ''} ${ref.referred?.last_name || ''}`.trim() || 'Unknown Owner',
            status: ref.status,
            reward_amount: ref.reward_amount || 10.00,
            conversion_date: ref.created_at,
            credited_date: ref.credited_date
          }))
          setReferrals(mappedReferrals)
        }
      } catch (error) {
        console.error('Failed to load referrals:', error)
        // Fall back to empty array on error
        setReferrals([])
      }
      
      setIsLoading(false)
    }

    initializeReferralData()
  }, [currentProfile.user_id, currentProfile.referral_code])

  const handleCopyReferralCode = async () => {
    if (!currentProfile.referral_code) return
    
    try {
      await navigator.clipboard.writeText(currentProfile.referral_code)
      setCopyMessage('Referral code copied!')
      setTimeout(() => setCopyMessage(null), 3000)
    } catch (error) {
      setCopyMessage('Failed to copy code')
      setTimeout(() => setCopyMessage(null), 3000)
    }
  }

  const handleCopyReferralLink = async () => {
    const referralLink = `${window.location.origin}/onboarding?ref=${currentProfile.referral_code}`
    
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopyMessage('Referral link copied!')
      setTimeout(() => setCopyMessage(null), 3000)
    } catch (error) {
      setCopyMessage('Failed to copy link')
      setTimeout(() => setCopyMessage(null), 3000)
    }
  }

  const shareOnSocial = (platform: 'facebook' | 'twitter' | 'linkedin') => {
    if (!currentProfile.referral_code) return
    
    const referralLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/onboarding?ref=${currentProfile.referral_code}`
    const message = `Join QWIKKER and get your business discovered by local customers! Use my referral link:`
    
    let shareUrl = ''
    
    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}&quote=${encodeURIComponent(message)}`
        break
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message + ' ' + referralLink)}`
        break
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}&summary=${encodeURIComponent(message)}`
        break
    }
    
    if (typeof window !== 'undefined') {
      window.open(shareUrl, '_blank', 'width=600,height=400')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-400 bg-green-500/10 border-green-500/30'
      case 'credited': return 'text-blue-400 bg-blue-500/10 border-blue-500/30'
      case 'pending': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
      case 'rejected': return 'text-red-400 bg-red-500/10 border-red-500/30'
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/30'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'Active Business'
      case 'credited': return 'Reward Credited'
      case 'pending': return 'Recently Signed Up'
      case 'rejected': return 'Did Not Convert'
      default: return status
    }
  }

  const approvedReferrals = referrals.filter(r => r.status === 'approved' || r.status === 'credited')
  const totalEarnings = referrals
    .filter(r => r.status === 'credited')
    .reduce((sum, r) => sum + r.reward_amount, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Referral Program</h1>
        <p className="text-gray-400">Earn £10 for every business you refer to QWIKKER (Paid plans only)</p>
      </div>

      {copyMessage && (
        <div className="p-4 rounded-lg border bg-green-500/10 border-green-500/30 text-green-400">
          {copyMessage}
        </div>
      )}

      {/* Paid Plan Restriction Notice */}
      {currentProfile.plan === 'free_trial' && (
        <div className="p-4 rounded-lg border bg-amber-500/10 border-amber-500/30 text-amber-400">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <strong>Upgrade Required</strong>
          </div>
          <p className="mt-2">Referral rewards are only available for Spotlight and Premium plans. Upgrade your plan to start earning £10 per successful referral.</p>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-[#00d083]">{approvedReferrals.length}</p>
              <p className="text-sm text-gray-400">Successful Referrals</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-[#00d083]">£{totalEarnings.toFixed(2)}</p>
              <p className="text-sm text-gray-400">Total Earnings</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-[#00d083]">{referrals.length}</p>
              <p className="text-sm text-gray-400">Total Referrals</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referral Tools */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
            Share Your Referral
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Referral Code */}
            <div>
            <Label className="text-white">Your Referral Code</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={currentProfile.referral_code || 'Generating...'}
                readOnly
                className="bg-slate-900 text-white border-slate-600 font-mono text-lg text-center"
              />
              <Button
                onClick={handleCopyReferralCode}
                disabled={!currentProfile.referral_code}
                className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white disabled:opacity-50"
              >
                Copy Code
              </Button>
            </div>
          </div>

          {/* Referral Link */}
          <div>
            <Label className="text-white">Your Referral Link</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/onboarding?ref=${currentProfile.referral_code || ''}`}
                readOnly
                className="bg-slate-900 text-white border-slate-600 text-sm"
              />
              <Button
                onClick={handleCopyReferralLink}
                disabled={!currentProfile.referral_code}
                className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white disabled:opacity-50"
              >
                Copy Link
              </Button>
            </div>
          </div>

          {/* Social Sharing */}
          <div>
            <Label className="text-white">Share on Social Media</Label>
            <div className="flex gap-3 mt-2">
              <Button
                onClick={() => shareOnSocial('facebook')}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebook
              </Button>
              <Button
                onClick={() => shareOnSocial('twitter')}
                className="bg-sky-500 hover:bg-sky-600 text-white flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
                Twitter
              </Button>
              <Button
                onClick={() => shareOnSocial('linkedin')}
                className="bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                LinkedIn
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-[#00d083]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-[#00d083] font-bold">1</span>
              </div>
              <h3 className="text-white font-medium mb-2">Share Your Code</h3>
              <p className="text-gray-400 text-sm">Share your referral code or link with other business owners</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-[#00d083]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-[#00d083] font-bold">2</span>
              </div>
              <h3 className="text-white font-medium mb-2">They Sign Up</h3>
              <p className="text-gray-400 text-sm">When they register using your code, they're linked to your account</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-[#00d083]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-[#00d083] font-bold">3</span>
              </div>
              <h3 className="text-white font-medium mb-2">Earn Rewards</h3>
              <p className="text-gray-400 text-sm">Get £10 credited to your account when they become active users (paid plans only)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referrals List */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            Your Referrals ({referrals.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-[#00d083] border-t-transparent rounded-full mx-auto"></div>
              <p className="text-gray-400 mt-4">Loading your referrals...</p>
            </div>
          ) : referrals.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-700 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No Referrals Yet</h3>
              <p className="text-gray-400 mb-6">
                Start sharing your referral code to earn £10 for each business that joins QWIKKER
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {referrals.map((referral) => (
                <div key={referral.id} className="bg-slate-700/30 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-white font-medium">{referral.referred_business_name}</h3>
                      <p className="text-gray-400 text-sm">{referral.referred_owner_name}</p>
                      <p className="text-gray-400 text-xs mt-1">
                        Signed up: {new Date(referral.conversion_date).toLocaleDateString()}
                        {referral.credited_date && (
                          <span> • Credited: {new Date(referral.credited_date).toLocaleDateString()}</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-xs border ${getStatusColor(referral.status)}`}>
                        {getStatusText(referral.status)}
                      </span>
                      <p className="text-[#00d083] font-medium mt-2">£{referral.reward_amount.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
