'use client'

import { Button } from '@/components/ui/button'

export function OpenChatButton() {
  return (
    <Button
      variant="outline"
      className="w-full border-emerald-500/20 bg-emerald-500/5 text-emerald-300/80 hover:bg-emerald-500/10 hover:border-emerald-500/30"
      onClick={() => window.dispatchEvent(new Event('open-support-chat'))}
    >
      Open Chat
    </Button>
  )
}
