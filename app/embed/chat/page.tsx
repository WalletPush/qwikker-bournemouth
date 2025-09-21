'use client';

import { UserChatPagePremium } from '@/components/user/user-chat-page-premium';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function EmbedChatPage() {
  const searchParams = useSearchParams();
  const walletPassId = searchParams.get('wallet_pass_id');
  const businessName = searchParams.get('business');
  const topic = searchParams.get('topic');
  
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    // Fetch user data if wallet_pass_id provided
    if (walletPassId) {
      fetch(`/api/user/get-user?wallet_pass_id=${walletPassId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setCurrentUser(data.user);
          }
        })
        .catch(console.error);
    }
  }, [walletPassId]);

  return (
    <div className="h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      <div className="h-full w-full p-2">
        <div className="h-full rounded-lg border border-slate-700 overflow-hidden">
          <UserChatPagePremium 
            currentUser={currentUser}
            initialContext={{
              business: businessName,
              topic: topic
            }}
          />
        </div>
      </div>
    </div>
  );
}
