'use client'

import { useEffect, useState } from 'react'

export default function DebugPWA() {
  const [checks, setChecks] = useState<any>({})

  useEffect(() => {
    const runChecks = async () => {
      const results: any = {}

      // Check service worker
      results.serviceWorkerSupported = 'serviceWorker' in navigator
      
      if (results.serviceWorkerSupported) {
        try {
          const registration = await navigator.serviceWorker.getRegistration()
          results.serviceWorkerRegistered = !!registration
          results.serviceWorkerActive = !!registration?.active
        } catch (e) {
          results.serviceWorkerError = e.message
        }
      }

      // Check manifest
      try {
        const manifestResponse = await fetch('/manifest.json')
        results.manifestAccessible = manifestResponse.ok
        if (manifestResponse.ok) {
          results.manifestContent = await manifestResponse.json()
        }
      } catch (e) {
        results.manifestError = e.message
      }

      // Check if already installed
      results.isStandalone = window.matchMedia('(display-mode: standalone)').matches
      results.isInWebAppiOS = (window.navigator as any).standalone === true

      // Check beforeinstallprompt
      results.beforeInstallPromptSupported = 'onbeforeinstallprompt' in window

      setChecks(results)
    }

    runChecks()
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">🔍 PWA Debug Information</h1>
        
        <div className="grid gap-6">
          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-green-400">Service Worker Status</h2>
            <div className="space-y-2 text-sm">
              <div>Supported: {checks.serviceWorkerSupported ? '✅ Yes' : '❌ No'}</div>
              <div>Registered: {checks.serviceWorkerRegistered ? '✅ Yes' : '❌ No'}</div>
              <div>Active: {checks.serviceWorkerActive ? '✅ Yes' : '❌ No'}</div>
              {checks.serviceWorkerError && (
                <div className="text-red-400">Error: {checks.serviceWorkerError}</div>
              )}
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-blue-400">Manifest Status</h2>
            <div className="space-y-2 text-sm">
              <div>Accessible: {checks.manifestAccessible ? '✅ Yes' : '❌ No'}</div>
              {checks.manifestError && (
                <div className="text-red-400">Error: {checks.manifestError}</div>
              )}
              {checks.manifestContent && (
                <div>
                  <div className="text-slate-300 mt-2">Content:</div>
                  <pre className="bg-slate-900 p-3 rounded text-xs overflow-auto">
                    {JSON.stringify(checks.manifestContent, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-purple-400">Installation Status</h2>
            <div className="space-y-2 text-sm">
              <div>Standalone Mode: {checks.isStandalone ? '✅ Yes' : '❌ No'}</div>
              <div>iOS Web App: {checks.isInWebAppiOS ? '✅ Yes' : '❌ No'}</div>
              <div>Install Prompt Supported: {checks.beforeInstallPromptSupported ? '✅ Yes' : '❌ No'}</div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-orange-400">Browser Info</h2>
            <div className="space-y-2 text-sm">
              <div>User Agent: {navigator.userAgent}</div>
              <div>Platform: {navigator.platform}</div>
              <div>Is Safari: {/Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent) ? '✅ Yes' : '❌ No'}</div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-yellow-400">Quick Tests</h2>
            <div className="space-y-4">
              <button 
                onClick={() => {
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.register('/sw.js').then(
                      (registration) => {
                        alert('✅ SW registered: ' + registration.scope)
                      },
                      (error) => {
                        alert('❌ SW failed: ' + error)
                      }
                    )
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
              >
                Test Service Worker Registration
              </button>
              
              <button 
                onClick={async () => {
                  try {
                    const response = await fetch('/manifest.json')
                    const manifest = await response.json()
                    alert('✅ Manifest loaded: ' + manifest.name)
                  } catch (e) {
                    alert('❌ Manifest failed: ' + e.message)
                  }
                }}
                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded ml-4"
              >
                Test Manifest
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
