'use client'

import { trackPartnersEvent } from '@/lib/partners/analytics'
import { Play } from 'lucide-react'

const VIDEOS = [
  { title: 'User Experience', id: '-n8up4zOkjc', thumb: 'https://i.ytimg.com/vi/-n8up4zOkjc/hqdefault.jpg' },
  { title: 'Business Dashboard', id: 'pf6NQKAvIgA', thumb: 'https://i.ytimg.com/vi/pf6NQKAvIgA/hqdefault.jpg' },
  { title: 'Partner Admin', id: 'PLhVjjpShF4', thumb: 'https://i.ytimg.com/vi/PLhVjjpShF4/hqdefault.jpg' },
]

export function PartnersProductProof() {
  return (
    <section id="product-proof" className="py-20 sm:py-28 px-5 sm:px-6 border-t border-[var(--p-border)]">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2
            className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3"
            style={{ fontFamily: 'var(--font-partners-display), sans-serif' }}
          >
            See it in action
          </h2>
          <p className="text-[var(--p-muted)] text-lg">
            The live platform — from discovery to loyalty to analytics.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {VIDEOS.map((v) => (
            <a
              key={v.id}
              href={`https://www.youtube.com/watch?v=${v.id}`}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackPartnersEvent('partners_video_opened', { title: v.title })}
              className="group block space-y-3"
            >
              <div className="relative aspect-video rounded-2xl bg-[var(--p-surface)] border border-white/10 overflow-hidden shadow-[0_20px_50px_-30px_rgba(0,0,0,0.8)]">
                <img
                  src={v.thumb}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/35 group-hover:bg-black/25 transition-colors" />
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--p-accent)] text-[#050505] shadow-[0_0_30px_rgba(0,196,106,0.45)]">
                    <Play className="h-5 w-5 fill-current ml-0.5" />
                  </span>
                </span>
              </div>
              <p className="text-sm font-medium text-center text-[var(--p-muted)] group-hover:text-white transition-colors">
                {v.title}
              </p>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
