'use client'

import { Card, CardContent } from '@/components/ui/card'
import { useState } from 'react'
import Link from 'next/link'
import { unsaveItem } from '@/lib/actions/user-saved-actions'
import { useRouter } from 'next/navigation'

interface SavedItem {
  id: string
  item_type: 'business' | 'event' | 'offer' | 'secret_menu'
  item_id: string
  item_name?: string
  saved_at: string
}

interface UserSavedPageProps {
  savedItems: SavedItem[]
  walletPassId?: string
}

export function UserSavedPage({ savedItems, walletPassId }: UserSavedPageProps) {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'business' | 'event' | 'offer' | 'secret_menu'>('all')
  const [removingId, setRemovingId] = useState<string | null>(null)

  // Helper function to append wallet_pass_id to navigation URLs
  const getNavUrl = (href: string) => {
    if (!walletPassId) {
      return href
    }
    return `${href}?wallet_pass_id=${walletPassId}`
  }

  const handleUnsave = async (item: SavedItem) => {
    if (!walletPassId) return

    setRemovingId(item.id)
    const result = await unsaveItem(walletPassId, item.item_type, item.item_id)
    
    if (result.success) {
      router.refresh()
    } else {
      console.error('Failed to unsave item:', result.error)
    }
    setRemovingId(null)
  }

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'business':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        )
      case 'event':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )
      case 'offer':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        )
      case 'secret_menu':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        )
      default:
        return null
    }
  }

  const getItemLink = (item: SavedItem) => {
    switch (item.item_type) {
      case 'business':
        return getNavUrl(`/user/business/${item.item_id}`)
      case 'event':
        return getNavUrl(`/user/events`)
      case 'offer':
        return getNavUrl(`/user/offers`)
      case 'secret_menu':
        return getNavUrl(`/user/secret-menu`)
      default:
        return '#'
    }
  }

  const filteredItems = filter === 'all' 
    ? savedItems 
    : savedItems.filter(item => item.item_type === filter)

  const counts = {
    all: savedItems.length,
    business: savedItems.filter(i => i.item_type === 'business').length,
    event: savedItems.filter(i => i.item_type === 'event').length,
    offer: savedItems.filter(i => i.item_type === 'offer').length,
    secret_menu: savedItems.filter(i => i.item_type === 'secret_menu').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-100 mb-2 flex items-center justify-center gap-3">
          <svg className="w-8 h-8 text-pink-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          My Saved Places
        </h1>
        <p className="text-slate-400">Your favorite businesses, events, and offers</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'all'
              ? 'bg-pink-500 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          All ({counts.all})
        </button>
        <button
          onClick={() => setFilter('business')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'business'
              ? 'bg-emerald-500 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Businesses ({counts.business})
        </button>
        <button
          onClick={() => setFilter('event')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'event'
              ? 'bg-blue-500 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Events ({counts.event})
        </button>
        <button
          onClick={() => setFilter('offer')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'offer'
              ? 'bg-orange-500 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Offers ({counts.offer})
        </button>
        <button
          onClick={() => setFilter('secret_menu')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'secret_menu'
              ? 'bg-purple-500 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Secret Menu ({counts.secret_menu})
        </button>
      </div>

      {/* Saved Items List */}
      {filteredItems.length === 0 ? (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-12 text-center">
            <svg className="w-16 h-16 text-slate-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <h3 className="text-xl font-semibold text-slate-300 mb-2">No saved items yet</h3>
            <p className="text-slate-400 mb-6">Start exploring and save your favorite places!</p>
            <Link
              href={getNavUrl('/user/discover')}
              className="inline-block bg-pink-500 hover:bg-pink-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Discover Places
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <Card key={item.id} className="bg-slate-800/50 border-slate-700 hover:border-pink-500/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="text-pink-400">
                      {getItemIcon(item.item_type)}
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 uppercase tracking-wider">
                        {item.item_type.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnsave(item)}
                    disabled={removingId === item.id}
                    className="text-pink-400 hover:text-red-400 transition-colors disabled:opacity-50"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                </div>

                <Link href={getItemLink(item)}>
                  <h3 className="text-lg font-semibold text-slate-100 mb-2 hover:text-pink-400 transition-colors">
                    {item.item_name || 'Saved Item'}
                  </h3>
                </Link>

                <p className="text-xs text-slate-400">
                  Saved {new Date(item.saved_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

