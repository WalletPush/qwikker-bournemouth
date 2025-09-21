export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Qwikker Logo */}
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-[#00d083] to-[#00b86f] rounded-2xl flex items-center justify-center mb-4">
            <span className="text-3xl font-bold text-white">Q</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Qwikker</h1>
        </div>

        {/* Offline Message */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 mb-6">
          <div className="w-16 h-16 mx-auto bg-orange-500/20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <h2 className="text-xl font-bold text-white mb-2">You're Offline</h2>
          <p className="text-slate-400 mb-4">
            No internet connection detected. Some features may not be available until you're back online.
          </p>
        </div>

        {/* Cached Content Info */}
        <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-4 mb-6">
          <h3 className="text-lg font-semibold text-white mb-2">Available Offline</h3>
          <ul className="text-sm text-slate-300 space-y-1">
            <li>• Previously viewed businesses</li>
            <li>• Saved offers and secret menus</li>
            <li>• Your dashboard (if visited recently)</li>
            <li>• Basic app navigation</li>
          </ul>
        </div>

        {/* Retry Button */}
        <button
          onClick={() => window.location.reload()}
          className="w-full bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-[#00d083]/20 hover:shadow-[#00d083]/30 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Try Again
        </button>

        {/* Connection Status */}
        <div className="mt-6 text-xs text-slate-500">
          <p>Connection will be restored automatically when available</p>
        </div>
      </div>
    </div>
  );
}
