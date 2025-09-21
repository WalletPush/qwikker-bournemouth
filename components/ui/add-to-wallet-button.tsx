'use client';

import { useState } from 'react';
import { Wallet } from 'lucide-react';

interface Offer {
  id: string;
  title: string;
  description: string;
  business_name: string;
  business_logo?: string;
  valid_until?: string;
  terms?: string;
  offer_type?: string;
  offer_value?: string;
}

interface AddToWalletButtonProps {
  offer: Offer;
  userWalletPassId?: string;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export default function AddToWalletButton({ 
  offer, 
  userWalletPassId, 
  className = '',
  variant = 'default',
  size = 'md'
}: AddToWalletButtonProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [success, setSuccess] = useState(false);

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  const variantClasses = {
    default: 'bg-[#00d083] hover:bg-[#00b86f] text-black border-0',
    outline: 'bg-transparent border border-[#00d083] text-[#00d083] hover:bg-[#00d083] hover:text-black',
    ghost: 'bg-transparent text-[#00d083] hover:bg-[#00d083]/10'
  };

  const addOfferToWallet = async () => {
    if (isAdding || success) return;
    
    setIsAdding(true);
    
    try {
      const response = await fetch('/api/wallet/create-offer-pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId: offer.id,
          userWalletPassId: userWalletPassId || 'guest',
          offer: offer
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.passUrl) {
        // Show success state briefly
        setSuccess(true);
        
        // Redirect to wallet pass download after short delay
        setTimeout(() => {
          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
          if (isMobile) {
            // For mobile devices, try to open the pass directly
            window.location.href = data.passUrl.replace('?t=', '.pkpass?t=');
          } else {
            // For desktop, open in new tab
            window.open(data.passUrl, '_blank');
          }
          
          // Reset success state after download
          setTimeout(() => setSuccess(false), 2000);
        }, 1000);
        
      } else {
        throw new Error(data.error || 'Failed to create wallet pass');
      }
    } catch (error) {
      console.error('Error adding to wallet:', error);
      
      // Show user-friendly error
      const errorMessage = error instanceof Error ? error.message : 'Failed to add offer to wallet';
      
      // You could implement a toast notification here
      alert(`Sorry, we couldn't add this offer to your wallet right now. ${errorMessage}. Please try again.`);
    } finally {
      setIsAdding(false);
    }
  };

  if (success) {
    return (
      <button 
        className={`${sizeClasses[size]} rounded-lg font-semibold transition-all duration-300 bg-green-600 text-white cursor-default ${className}`}
        disabled
      >
        <span className="flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Added to Wallet!
        </span>
      </button>
    );
  }

  return (
    <button 
      onClick={addOfferToWallet}
      disabled={isAdding}
      className={`${sizeClasses[size]} ${variantClasses[variant]} rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 ${className}`}
    >
      {isAdding ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Adding...
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          <Wallet className="w-4 h-4" />
          Add to Wallet
        </span>
      )}
    </button>
  );
}

// Compact version for small spaces
export function CompactAddToWalletButton({ offer, userWalletPassId, className = '' }: AddToWalletButtonProps) {
  return (
    <AddToWalletButton 
      offer={offer}
      userWalletPassId={userWalletPassId}
      variant="outline"
      size="sm"
      className={className}
    />
  );
}

// Large promotional version
export function PromoAddToWalletButton({ offer, userWalletPassId, className = '' }: AddToWalletButtonProps) {
  return (
    <AddToWalletButton 
      offer={offer}
      userWalletPassId={userWalletPassId}
      variant="default"
      size="lg"
      className={`shadow-lg shadow-[#00d083]/25 ${className}`}
    />
  );
}
