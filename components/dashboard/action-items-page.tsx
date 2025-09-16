'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface ActionItemsPageProps {
  profile?: any
}

export function ActionItemsPage({ profile }: ActionItemsPageProps) {
  // Same logic as dashboard-home.tsx for generating todos
  const highPriorityTodos = []
  const mediumPriorityTodos = []
  const lowPriorityTodos = []
  
  // HIGH PRIORITY - Critical for QWIKKER database and AI responses
  if (!profile?.logo) {
    highPriorityTodos.push({ 
      title: 'Upload your business logo', 
      href: '/dashboard/files',
      priority: 'HIGH',
      description: 'Essential for branding and customer recognition. Your logo appears in customer recommendations.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    })
  }
  
  // Check for menu/service list upload (critical for AI responses)
  if (!profile?.menu_url) {
    highPriorityTodos.push({ 
      title: 'Upload your menu or service price list', 
      href: '/dashboard/files',
      priority: 'HIGH',
      description: 'Critical for AI responses. Allows QWIKKER to recommend your business accurately to customers.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    })
  }
  
  // MEDIUM PRIORITY - Important for customer engagement
  if (!profile?.offer_name) {
    mediumPriorityTodos.push({ 
      title: 'Create your first exclusive offer', 
      href: '/dashboard/offers',
      priority: 'MEDIUM',
      description: 'Drives customer acquisition and engagement. Special offers help attract new customers.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      )
    })
  }
  
  // Check for secret menu items
  const hasSecretMenuItems = profile?.additional_notes ? 
    (() => {
      try {
        const notesData = JSON.parse(profile.additional_notes)
        return notesData.secret_menu_items && notesData.secret_menu_items.length > 0
      } catch {
        return false
      }
    })() : false

  if (!hasSecretMenuItems) {
    mediumPriorityTodos.push({ 
      title: 'Add a secret menu item', 
      href: '/dashboard/secret-menu',
      priority: 'MEDIUM',
      description: 'Create exclusive items that only special customers know about. Builds loyalty and word-of-mouth marketing.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )
    })
  }
  
  if (!profile?.instagram_handle) {
    mediumPriorityTodos.push({ 
      title: 'Add your Instagram handle', 
      href: '/dashboard/business',
      priority: 'MEDIUM',
      description: 'Social media integration for promotion and customer engagement.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    })
  }
  
  // LOW PRIORITY - Nice to have but not critical
  if (!profile?.website_url) {
    lowPriorityTodos.push({ 
      title: 'Add your website URL', 
      href: '/dashboard/business',
      priority: 'LOW',
      description: 'Additional business information for customer reference.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
        </svg>
      )
    })
  }
  
  if (!profile?.facebook_url) {
    lowPriorityTodos.push({ 
      title: 'Add your Facebook page', 
      href: '/dashboard/business',
      priority: 'LOW',
      description: 'Secondary social media presence for broader customer reach.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      )
    })
  }
  
  if (!profile?.phone) {
    lowPriorityTodos.push({ 
      title: 'Add your phone number', 
      href: '/dashboard/personal',
      priority: 'LOW',
      description: 'Contact information for customer inquiries.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      )
    })
  }
  
  if (!profile?.business_category) {
    lowPriorityTodos.push({ 
      title: 'Complete your business category', 
      href: '/dashboard/business',
      priority: 'LOW',
      description: 'Better categorization for customer discovery.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    })
  }
  
  if (!profile?.goals) {
    lowPriorityTodos.push({ 
      title: 'Set your business goals', 
      href: '/dashboard/business',
      priority: 'LOW',
      description: 'Internal planning and goal tracking for your business growth.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      )
    })
  }
  
  if (!profile?.additional_notes) {
    lowPriorityTodos.push({ 
      title: 'Add additional notes about your business', 
      href: '/dashboard/business',
      priority: 'LOW',
      description: 'Extra context and details about your business operations.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      )
    })
  }

  const allTodos = [
    { priority: 'HIGH', items: highPriorityTodos },
    { priority: 'MEDIUM', items: mediumPriorityTodos },
    { priority: 'LOW', items: lowPriorityTodos }
  ]

  const totalItems = highPriorityTodos.length + mediumPriorityTodos.length + lowPriorityTodos.length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Action Items</h1>
        <p className="text-gray-400">Complete these tasks to optimize your QWIKKER business profile</p>
      </div>

      {totalItems === 0 ? (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-500/10 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">All Caught Up!</h3>
            <p className="text-gray-400">Your business profile is complete. Great job!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {allTodos.map(({ priority, items }) => 
            items.length > 0 && (
              <Card key={priority} className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-3">
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                      priority === 'HIGH' 
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                        : priority === 'MEDIUM'
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        : 'bg-green-500/20 text-green-400 border border-green-500/30'
                    }`}>
                      {priority} PRIORITY
                    </span>
                    <span className="text-gray-400 text-sm">({items.length} item{items.length !== 1 ? 's' : ''})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {items.map((item, index) => (
                      <div key={index} className="relative flex items-start gap-4 p-4 bg-slate-700/30 rounded-lg border border-slate-600/50">
                        <span className={`absolute -top-1 -right-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium z-10 ${
                          priority === 'HIGH' 
                            ? 'bg-red-500 text-white' 
                            : priority === 'MEDIUM'
                            ? 'bg-yellow-500 text-black'
                            : 'bg-green-500 text-black'
                        }`}>
                          {priority === 'HIGH' ? 'H' : priority === 'MEDIUM' ? 'M' : 'L'}
                        </span>
                        <div className="text-[#00d083] mt-1">{item.icon}</div>
                        <div className="flex-1">
                          <h4 className="font-medium text-white mb-1">{item.title}</h4>
                          <p className="text-sm text-gray-400 mb-3">{item.description}</p>
                        </div>
                        <Button asChild size="sm" className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white">
                          <Link href={item.href}>Complete</Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </div>
      )}

      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white mb-1">Need Help?</h3>
              <p className="text-sm text-gray-400">Contact our support team if you need assistance completing any of these tasks.</p>
            </div>
            <Button asChild variant="outline" className="border-slate-600 text-gray-300 hover:bg-slate-700">
              <Link href="/dashboard/support">Get Help</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
