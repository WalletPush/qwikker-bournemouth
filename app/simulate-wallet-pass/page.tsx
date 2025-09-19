'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function SimulateWalletPassPage() {
  const [isInstalling, setIsInstalling] = useState(false)

  const handleInstallWalletPass = async () => {
    setIsInstalling(true)
    
    // Simulate wallet pass installation delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Redirect to wallet pass handler with David's ID
    window.location.href = '/wallet-pass/QWIK-BOURNEMOUTH-DAVID-2024'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
        <CardContent className="p-8 text-center space-y-6">
          {/* Qwikker Logo */}
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[#00d083] to-[#00b86f] rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">Qwikker Bournemouth</h1>
            <p className="text-slate-300">Your local discovery pass</p>
          </div>

          {/* Wallet Pass Preview */}
          <div className="bg-gradient-to-r from-[#00d083] to-[#00b86f] p-4 rounded-lg text-black space-y-2">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold">QWIKKER PASS</p>
                <p className="text-sm opacity-80">Bournemouth Explorer</p>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-80">MEMBER</p>
                <p className="font-bold">DAVID</p>
              </div>
            </div>
            <div className="border-t border-black/20 pt-2">
              <p className="text-xs opacity-70">QWIK-BOURNEMOUTH-DAVID-2024</p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-slate-300 text-sm">
              Install your Qwikker pass to discover amazing local businesses, exclusive offers, and secret menus.
            </p>

            <Button 
              onClick={handleInstallWalletPass}
              disabled={isInstalling}
              className="w-full bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05f] text-black font-semibold py-3"
            >
              {isInstalling ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Installing Pass...
                </div>
              ) : (
                'Add to Apple Wallet'
              )}
            </Button>

            <p className="text-xs text-slate-400">
              This is a demo. In production, this would install a real wallet pass.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
