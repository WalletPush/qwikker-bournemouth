'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Mail, 
  Globe, 
  Building2,
  Star,
  MapPin,
  AlertTriangle,
  Shield,
  User,
  Calendar
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'

// Mock claim data
const MOCK_CLAIMS = [
  {
    id: '1',
    status: 'pending',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    user: {
      name: 'Sarah Williams',
      email: 'thelarderhouse@gmail.com',
      accountCreated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
    },
    business: {
      id: 'larder-house',
      name: 'The Larder House',
      address: '123 Old Christchurch Rd, Bournemouth',
      category: 'Restaurant',
      rating: 4.6,
      reviewCount: 847,
      googleYears: 5,
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400'
    },
    website: 'https://thelarderhouse.com',
    verification: {
      emailDomainMatch: false,
      phoneVerified: false,
      duplicateClaims: 0,
      deniedClaims: 0,
      riskScore: 15,
      riskLevel: 'safe' as const,
      confidenceBadge: '✅ Email matches business name'
    },
    foundingMemberEligible: true,
    foundingMemberCount: 27
  },
  {
    id: '2',
    status: 'pending',
    createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 mins ago
    user: {
      name: 'John Smith',
      email: 'john.smith12345@gmail.com',
      accountCreated: new Date(Date.now() - 20 * 60 * 1000) // 20 mins ago
    },
    business: {
      id: 'larder-house-2',
      name: 'The Larder House',
      address: '123 Old Christchurch Rd, Bournemouth',
      category: 'Restaurant',
      rating: 4.6,
      reviewCount: 847,
      googleYears: 5,
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400'
    },
    website: '',
    verification: {
      emailDomainMatch: false,
      phoneVerified: false,
      duplicateClaims: 2,
      deniedClaims: 1,
      riskScore: 85,
      riskLevel: 'critical' as const,
      confidenceBadge: '🚨 Generic email, multiple claims'
    },
    foundingMemberEligible: true,
    foundingMemberCount: 27
  },
  {
    id: '3',
    status: 'pending',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    user: {
      name: 'Mike Johnson',
      email: 'mike@joesbarbershop.co.uk',
      accountCreated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 1 week ago
    },
    business: {
      id: 'joes-barber',
      name: "Joe's Barber Shop",
      address: '456 High Street, Bournemouth',
      category: 'Barber',
      rating: 4.8,
      reviewCount: 203,
      googleYears: 3,
      image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400'
    },
    website: 'https://joesbarbershop.co.uk',
    verification: {
      emailDomainMatch: true,
      phoneVerified: false,
      duplicateClaims: 0,
      deniedClaims: 0,
      riskScore: 5,
      riskLevel: 'safe' as const,
      confidenceBadge: '✅ VERY HIGH - Email domain matches website'
    },
    foundingMemberEligible: true,
    foundingMemberCount: 27
  }
]

export default function AdminClaimsPage() {
  const [claims, setClaims] = useState(MOCK_CLAIMS)
  const [selectedClaim, setSelectedClaim] = useState<typeof MOCK_CLAIMS[0] | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [processing, setProcessing] = useState(false)

  const pendingClaims = claims.filter(c => c.status === 'pending')
  const approvedClaims = claims.filter(c => c.status === 'approved')
  const deniedClaims = claims.filter(c => c.status === 'denied')

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'safe': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950'
      case 'medium': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950'
      case 'high': return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950'
      case 'critical': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950'
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-950'
    }
  }

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'safe': return <Shield className="w-4 h-4" />
      case 'medium': case 'high': case 'critical': return <AlertTriangle className="w-4 h-4" />
      default: return null
    }
  }

  const formatTimeAgo = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / (1000 * 60))
    if (minutes < 60) return `${minutes} min${minutes !== 1 ? 's' : ''} ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
    const days = Math.floor(hours / 24)
    return `${days} day${days !== 1 ? 's' : ''} ago`
  }

  const handleApprove = async (claimId: string) => {
    setProcessing(true)
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setClaims(claims.map(c => 
      c.id === claimId ? { ...c, status: 'approved' as const } : c
    ))
    setSelectedClaim(null)
    setAdminNotes('')
    setProcessing(false)
  }

  const handleDeny = async (claimId: string) => {
    setProcessing(true)
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setClaims(claims.map(c => 
      c.id === claimId ? { ...c, status: 'denied' as const } : c
    ))
    setSelectedClaim(null)
    setAdminNotes('')
    setProcessing(false)
  }

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Business Claim Requests</h1>
        <p className="text-muted-foreground">
          Review and approve claims from business owners
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-3xl font-bold">{pendingClaims.length}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-3xl font-bold text-green-600">{approvedClaims.length}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Denied</p>
                <p className="text-3xl font-bold text-red-600">{deniedClaims.length}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Claims List */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingClaims.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({approvedClaims.length})
          </TabsTrigger>
          <TabsTrigger value="denied">
            Denied ({deniedClaims.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingClaims.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No pending claims</p>
              </CardContent>
            </Card>
          ) : (
            pendingClaims.map(claim => (
              <Card key={claim.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="grid md:grid-cols-[1fr,auto] gap-6">
                    {/* Main Content */}
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex gap-4">
                        <img 
                          src={claim.business.image} 
                          alt={claim.business.name}
                          className="w-20 h-20 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-bold text-xl">{claim.user.name} → {claim.business.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                Claimed {formatTimeAgo(claim.createdAt)}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Mail className="w-4 h-4" />
                              {claim.user.email}
                            </div>
                            {claim.website && (
                              <div className="flex items-center gap-1">
                                <Globe className="w-4 h-4" />
                                {claim.website.replace('https://', '')}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Business Info */}
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground pl-24">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          {claim.business.rating} stars ({claim.business.reviewCount} reviews)
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {claim.business.address}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {claim.business.googleYears} years on Google
                        </div>
                      </div>

                      {/* Risk Analysis */}
                      <div className={`rounded-lg p-4 ${getRiskColor(claim.verification.riskLevel)}`}>
                        <div className="flex items-start gap-3">
                          {getRiskIcon(claim.verification.riskLevel)}
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold uppercase text-sm">
                                {claim.verification.riskLevel === 'safe' && '✅ Safe'}
                                {claim.verification.riskLevel === 'medium' && '⚠️ Medium Risk'}
                                {claim.verification.riskLevel === 'high' && '🚨 High Risk'}
                                {claim.verification.riskLevel === 'critical' && '🔴 Critical Risk'}
                              </h4>
                              <span className="text-sm font-mono">
                                Risk Score: {claim.verification.riskScore}/100
                              </span>
                            </div>

                            <p className="text-sm mb-3">
                              {claim.verification.confidenceBadge}
                            </p>

                            <div className="grid sm:grid-cols-2 gap-2 text-sm">
                              <div>
                                <strong>Email Domain:</strong>{' '}
                                {claim.verification.emailDomainMatch ? '✅ Matches' : '❌ No match'}
                              </div>
                              <div>
                                <strong>Previous Claims:</strong>{' '}
                                {claim.verification.duplicateClaims === 0 ? '✅ First claim' : `⚠️ ${claim.verification.duplicateClaims} other claims`}
                              </div>
                              <div>
                                <strong>Account Age:</strong>{' '}
                                {formatTimeAgo(claim.user.accountCreated)}
                              </div>
                              <div>
                                <strong>Denied Before:</strong>{' '}
                                {claim.verification.deniedClaims === 0 ? '✅ No' : `🚨 ${claim.verification.deniedClaims} times`}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Founding Member */}
                      {claim.foundingMemberEligible && (
                        <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                          <p className="text-sm text-yellow-900 dark:text-yellow-100">
                            🏅 <strong>Founding Member Eligible</strong> (Spot #{claim.foundingMemberCount}/150)
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex md:flex-col gap-2 md:w-32">
                      <Button
                        onClick={() => handleApprove(claim.id)}
                        disabled={processing}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        size="lg"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleDeny(claim.id)}
                        disabled={processing}
                        variant="destructive"
                        className="flex-1"
                        size="lg"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Deny
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="approved">
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-600" />
              <p>Approved claims will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="denied">
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              <XCircle className="w-12 h-12 mx-auto mb-4 text-red-600" />
              <p>Denied claims will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

