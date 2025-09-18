import { LoginForm } from '@/components/login-form'
import { Suspense } from 'react'

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-6 md:p-10">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.02"%3E%3Ccircle cx="30" cy="30" r="1"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>
      
      <div className="relative w-full max-w-md">
        {/* Qwikker Logo Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img 
              src="/Qwikker Logo web.svg" 
              alt="QWIKKER" 
              className="h-12 w-auto"
            />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-slate-400">Sign in to your Qwikker account</p>
        </div>
        
        <Suspense fallback={
          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-xl p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-slate-700 rounded w-3/4 mb-4"></div>
              <div className="h-10 bg-slate-700 rounded mb-4"></div>
              <div className="h-10 bg-slate-700 rounded mb-4"></div>
              <div className="h-10 bg-slate-700 rounded"></div>
            </div>
          </div>
        }>
          <LoginForm />
        </Suspense>
        
        {/* Footer */}
        <div className="text-center mt-8 text-slate-500 text-sm">
          <p>Discover local businesses with AI-powered recommendations</p>
        </div>
      </div>
    </div>
  )
}
