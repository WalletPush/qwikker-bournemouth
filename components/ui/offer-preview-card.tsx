'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Tag, Clock, Calendar, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface OfferPreviewCardProps {
  offer: {
    offer_name: string
    offer_type?: string
    offer_value?: string
    offer_terms?: string
    offer_start_date?: string
    offer_end_date?: string
    offer_image?: string
  }
  businessName: string
}

export function OfferPreviewCard({ offer, businessName }: OfferPreviewCardProps) {
  const getOfferTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'percentage': 'Percentage Discount',
      'fixed': 'Fixed Amount Off',
      'bogo': 'Buy One Get One',
      'free_item': 'Free Item',
      'early_bird': 'Early Bird Special',
      'happy_hour': 'Happy Hour Deal',
      'loyalty': 'Loyalty Reward',
      'seasonal': 'Seasonal Offer',
      'other': 'Special Offer'
    }
    return labels[type] || type
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const isExpired = offer.offer_end_date && new Date(offer.offer_end_date) < new Date()
  const isUpcoming = offer.offer_start_date && new Date(offer.offer_start_date) > new Date()

  return (
    <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 overflow-hidden max-w-md mx-auto">
      {/* Offer Image */}
      {offer.offer_image && (
        <div className="relative h-48 w-full bg-slate-700">
          <img
            src={offer.offer_image}
            alt={offer.offer_name}
            className="w-full h-full object-cover"
          />
          {isExpired && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="text-red-400 font-bold text-xl">EXPIRED</div>
            </div>
          )}
          {isUpcoming && (
            <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
              Upcoming
            </div>
          )}
        </div>
      )}

      <CardContent className="p-6 space-y-4">
        {/* Offer Type Badge */}
        {offer.offer_type && (
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-[#00d083]" />
            <span className="text-xs font-semibold uppercase tracking-wide text-[#00d083]">
              {getOfferTypeLabel(offer.offer_type)}
            </span>
          </div>
        )}

        {/* Offer Title */}
        <h3 className="text-2xl font-bold text-white">
          {offer.offer_name}
        </h3>

        {/* Business Name */}
        <p className="text-slate-400 text-sm">
          at <span className="text-slate-300 font-medium">{businessName}</span>
        </p>

        {/* Offer Value */}
        {offer.offer_value && (
          <div className="bg-[#00d083]/10 border border-[#00d083]/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-[#00d083] text-center">
              {offer.offer_value}
            </div>
          </div>
        )}

        {/* Validity Period */}
        {(offer.offer_start_date || offer.offer_end_date) && (
          <div className="space-y-2 text-sm text-slate-300">
            {offer.offer_start_date && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>Valid from: {formatDate(offer.offer_start_date)}</span>
              </div>
            )}
            {offer.offer_end_date && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>Valid until: {formatDate(offer.offer_end_date)}</span>
              </div>
            )}
          </div>
        )}

        {/* Terms & Conditions */}
        {offer.offer_terms && (
          <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4">
            <div className="flex items-start gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <h4 className="text-sm font-semibold text-slate-300">Terms & Conditions</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">
              {offer.offer_terms}
            </p>
          </div>
        )}

        {/* Add to Wallet Button (Preview Only) */}
        <Button 
          disabled
          className="w-full bg-[#00d083] hover:bg-[#00b86f] text-white font-semibold py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add to Wallet (Preview Only)
        </Button>
      </CardContent>
    </Card>
  )
}

