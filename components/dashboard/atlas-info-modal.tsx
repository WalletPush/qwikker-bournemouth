'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface AtlasInfoModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AtlasInfoModal({ isOpen, onClose }: AtlasInfoModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white mb-2">
            WHAT IS ATLAS?
          </DialogTitle>
          <p className="text-emerald-400 font-semibold">
            Qwikker's Live AI Map Engine
          </p>
        </DialogHeader>

        <div className="space-y-6 text-slate-300">
          {/* Intro */}
          <div>
            <p className="font-medium text-white mb-2">
              Atlas is not a normal map.
            </p>
            <p>
              It's a real-time decision engine that visually responds to what customers are asking right now.
            </p>
          </div>

          {/* When someone asks */}
          <div>
            <p className="font-medium text-white mb-3">
              When someone asks:
            </p>
            <ul className="space-y-2 ml-4">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-1">•</span>
                <span>"Best food near me"</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-1">•</span>
                <span>"Cocktails with offers"</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-1">•</span>
                <span>"Places open now"</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-1">•</span>
                <span>"Family-friendly restaurants"</span>
              </li>
            </ul>
            <p className="mt-3">
              Atlas moves, filters the city, and highlights the businesses that match that intent.
            </p>
          </div>

          <div className="h-px bg-slate-700" />

          {/* Intent-based visibility */}
          <div>
            <p className="font-semibold text-white mb-3">
              This is intent-based visibility — not browsing.
            </p>
            <p className="mb-3">
              Customers don't scroll directories.<br />
              They ask questions.
            </p>
            <p className="mb-3">
              Atlas turns those questions into a living map that shows:
            </p>
            <ul className="space-y-2 ml-4">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">✓</span>
                <span>Businesses AI believes match the request</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">✓</span>
                <span>Premium carousel cards</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">✓</span>
                <span>High-quality listings</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">✓</span>
                <span>Offers when relevant</span>
              </li>
            </ul>
          </div>

          <div className="h-px bg-slate-700" />

          {/* What customers see */}
          <div>
            <p className="font-semibold text-white mb-3">
              What customers see
            </p>
            <p className="mb-3">
              When Atlas opens, users see:
            </p>
            <ul className="space-y-2 ml-4">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-1">•</span>
                <span>Highlighted businesses that match their request</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-1">•</span>
                <span>Visual priority for upgraded listings</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-1">•</span>
                <span>Interactive discovery based on what they want, not random browsing</span>
              </li>
            </ul>
            <p className="mt-3">
              Free listings are visible.<br />
              Upgraded listings are actively surfaced.
            </p>
          </div>

          <div className="h-px bg-slate-700" />

          {/* Why Atlas matters */}
          <div>
            <p className="font-semibold text-white mb-3">
              Why Atlas matters for your business
            </p>
            <p className="mb-3">
              Atlas shows businesses when customers are deciding — not just exploring.
            </p>
            <p className="mb-3">That means:</p>
            <ul className="space-y-2 ml-4">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">✓</span>
                <span>Higher intent traffic</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">✓</span>
                <span>Less competition noise</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">✓</span>
                <span>Better quality customers</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">✓</span>
                <span>Your business shown at the moment of choice</span>
              </li>
            </ul>
          </div>

          <div className="h-px bg-slate-700" />

          {/* Part of recommendation system */}
          <div>
            <p className="font-semibold text-white mb-3">
              Atlas is part of Qwikker's recommendation system
            </p>
            <p className="mb-2">
              Most platforms list businesses.
            </p>
            <p className="mb-2 font-medium text-emerald-400">
              Qwikker recommends businesses.
            </p>
            <p>
              Atlas is the visual layer of that system.
            </p>
          </div>

          {/* CTA */}
          <div className="pt-4">
            <Link
              href="/dashboard/settings#pricing"
              onClick={onClose}
              className="w-full block"
            >
              <Button 
                variant="outline" 
                className="w-full border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/40 font-semibold py-6 text-base"
              >
                Upgrade to Be Surfaced in Atlas
              </Button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
