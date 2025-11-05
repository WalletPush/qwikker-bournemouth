import { ImageEditorDebug } from '@/components/debug/image-editor-debug'

export default function DebugImageEditorPage() {
  return (
    <div className="min-h-screen bg-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Interactive Image Editor Debug</h1>
        <ImageEditorDebug />
      </div>
    </div>
  )
}
