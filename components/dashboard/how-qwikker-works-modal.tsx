'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface HowQwikkerWorksModalProps {
  isOpen: boolean
  onClose: () => void
}

export function HowQwikkerWorksModal({ isOpen, onClose }: HowQwikkerWorksModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-center text-white">
            This isn't a listing platform. It's a customer engine.
          </DialogTitle>
          <p className="text-slate-300 text-center mt-3 text-base">
            Qwikker connects businesses to customers at the exact moment they're choosing where to go.
          </p>
        </DialogHeader>

        <div className="space-y-8 mt-6">
          {/* Section 1: AI Recommendation Engine */}
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-white">AI Recommendation Engine</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Your business is suggested, not just listed.
            </p>
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3">
              <p className="text-slate-300 text-sm">When users ask:</p>
              <ul className="space-y-1 text-sm text-slate-400 ml-4">
                <li>"Best food near me"</li>
                <li>"Places with kids menus"</li>
                <li>"Cocktails with offers"</li>
              </ul>
              <p className="text-slate-300 text-sm pt-2">Your business can be:</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span className="text-slate-300">Recommended in AI chat</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span className="text-slate-300">Shown as a top suggestion</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span className="text-slate-300">Linked directly to your menu items</span>
                </li>
              </ul>
              <p className="text-slate-200 text-sm pt-3 font-medium border-t border-slate-700 mt-3">
                This is intent-based traffic. Not browsing traffic.
              </p>
            </div>
          </div>

          {/* Section 2: Offers That Actually Surface */}
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-white">Offers That Actually Surface</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Your deals are shown when customers ask for deals.
            </p>
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-2">
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">•</span>
                  <span className="text-slate-300">Offers appear inside AI responses</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">•</span>
                  <span className="text-slate-300">Time-based promotions</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">•</span>
                  <span className="text-slate-300">"What deals are on right now?" triggers visibility</span>
                </li>
              </ul>
              <p className="text-slate-200 text-sm pt-3 font-medium border-t border-slate-700 mt-3">
                Your offers meet customers in decision mode.
              </p>
            </div>
          </div>

          {/* Section 3: Atlas Map Visibility */}
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-white">Atlas Map Visibility</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Interactive AI Map Exposure
            </p>
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-2">
              <p className="text-slate-300 text-sm">Customers exploring the map see:</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">•</span>
                  <span className="text-slate-300">Highlighted listings</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">•</span>
                  <span className="text-slate-300">Premium cards</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">•</span>
                  <span className="text-slate-300">Businesses AI thinks match their intent</span>
                </li>
              </ul>
              <p className="text-slate-200 text-sm pt-3 border-t border-slate-700 mt-3">
                <span className="text-slate-400">Free listings are visible.</span><br />
                <span className="font-medium">Upgraded listings are actively surfaced.</span>
              </p>
            </div>
          </div>

          {/* Section 4: Secret Menu Club */}
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-white">Secret Menu Club</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Create experiences, not just menu items.
            </p>
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-2">
              <p className="text-slate-300 text-sm">Add hidden items, limited specials, or insider offers that:</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">•</span>
                  <span className="text-slate-300">AI can suggest</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">•</span>
                  <span className="text-slate-300">Drive curiosity</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">•</span>
                  <span className="text-slate-300">Encourage repeat visits</span>
                </li>
              </ul>
              <p className="text-slate-200 text-sm pt-3 font-medium border-t border-slate-700 mt-3">
                This is differentiation, not discounting.
              </p>
            </div>
          </div>

          {/* Section 5: What This Means For Your Business */}
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-white">What this means for your business</h3>
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-5">
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 text-lg">•</span>
                  <span className="text-slate-300">You appear when customers are deciding</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 text-lg">•</span>
                  <span className="text-slate-300">Your offers show when they ask for deals</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 text-lg">•</span>
                  <span className="text-slate-300">Your dishes can be suggested directly</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 text-lg">•</span>
                  <span className="text-slate-300">You're shown based on relevance, not just reviews</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Section 6: Why This Works */}
          <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/30 rounded-lg p-6 text-center space-y-2">
            <p className="text-slate-200 text-lg font-medium leading-relaxed">
              Most platforms show businesses.<br />
              <span className="text-white font-semibold">Qwikker recommends businesses.</span>
            </p>
          </div>

          {/* CTA */}
          <div className="flex justify-center pt-2">
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/40 font-semibold px-12"
            >
              <Link href="/dashboard/settings#pricing">
                Upgrade to Get Recommended
              </Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
