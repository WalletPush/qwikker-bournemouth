'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SimpleImageEditor } from '@/components/dashboard/simple-image-editor'

export function ImageEditorDebug() {
  const [showEditor, setShowEditor] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string[]>([])

  const addDebugInfo = (info: string) => {
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${info}`])
  }

  const testEditor = () => {
    addDebugInfo('Testing interactive editor...')
    setShowEditor(true)
  }

  const handleSave = (transform: any) => {
    addDebugInfo(`Transform saved: ${JSON.stringify(transform)}`)
    setShowEditor(false)
  }

  const handleCancel = () => {
    addDebugInfo('Editor cancelled')
    setShowEditor(false)
  }

  return (
    <div className="p-6 space-y-6">
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Interactive Image Editor Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-white font-semibold">Test the Interactive Editor:</h3>
            <Button onClick={testEditor} className="bg-blue-500 hover:bg-blue-600">
              Open Interactive Editor
            </Button>
          </div>

          <div className="space-y-2">
            <h3 className="text-white font-semibold">Debug Information:</h3>
            <div className="bg-slate-900 p-4 rounded-lg max-h-60 overflow-y-auto">
              {debugInfo.length === 0 ? (
                <p className="text-slate-400">No debug info yet...</p>
              ) : (
                debugInfo.map((info, index) => (
                  <div key={index} className="text-green-400 text-sm font-mono">
                    {info}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-white font-semibold">Troubleshooting Steps:</h3>
            <div className="text-slate-300 text-sm space-y-1">
              <p>1. Click "Open Interactive Editor" above</p>
              <p>2. If it opens, the component is working</p>
              <p>3. If not, check browser console for errors</p>
              <p>4. Go to Files & Menus and hover over an image</p>
              <p>5. Look for the blue ✏️ button in top-right corner</p>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-white font-semibold">Expected Behavior:</h3>
            <div className="text-slate-300 text-sm space-y-1">
              <p>• Full-screen modal with dark overlay</p>
              <p>• Left: Interactive editor with drag controls</p>
              <p>• Right: Live business card preview</p>
              <p>• Grid overlay for alignment</p>
              <p>• Save/Cancel buttons at bottom</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Simple Editor */}
      {showEditor && (
        <SimpleImageEditor
          imageUrl="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600"
          businessName="Test Restaurant"
          businessCategory="Restaurant & Bar"
          businessTown="Bournemouth"
          businessTier="featured"
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </div>
  )
}
