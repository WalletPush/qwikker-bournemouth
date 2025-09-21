import { WalletPushAIChat } from '@/components/ai/walletpush-ai-chat'

export default function TestAIPage() {
  return (
    <div className="min-h-screen bg-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-white text-2xl mb-4">🤖 AI Chat Test</h1>
        <div className="h-[600px] bg-slate-800 rounded-lg overflow-hidden">
          <WalletPushAIChat 
            userId="DAVID-TEST-123"
            className="h-full"
            aiId="21"
          />
        </div>
      </div>
    </div>
  )
}
