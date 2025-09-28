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
      // Check if user has a wallet pass first
      if (!userWalletPassId || userWalletPassId === 'guest') {
        throw new Error('You need to sign up through the GHL form first to get your Qwikker wallet pass');
      }

      // UPDATE MAIN WALLET PASS with the new offer
      const response = await fetch('/api/walletpass/update-main-pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userWalletPassId: userWalletPassId,
          currentOffer: `${offer.title} - ${offer.business_name}`,
          offerDetails: {
            description: offer.description,
            validUntil: offer.valid_until,
            terms: offer.terms,
            businessName: offer.business_name,
            discount: offer.offer_value || offer.title
          }
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Show success state
        setSuccess(true);
        console.log('✅ Main wallet pass updated with new offer');
        
        // Show success message to user
        const successMessage = `Your Qwikker pass has been updated with "${offer.title}"! Check your wallet app.`;
        
        // Create a nice success notification
        const notification = document.createElement('div');
        notification.innerHTML = `
          <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #00d083, #00b86f);
            color: black;
            padding: 16px 20px;
            border-radius: 12px;
            box-shadow: 0 8px 25px rgba(0, 208, 131, 0.3);
            z-index: 9999;
            max-width: 350px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 12px;
            animation: slideIn 0.3s ease-out;
          ">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <div>
              <div style="font-size: 14px; margin-bottom: 4px;">Wallet Updated!</div>
              <div style="font-size: 12px; opacity: 0.8;">${offer.title} added to your pass</div>
            </div>
          </div>
        `;
        
        document.body.appendChild(notification);
        
        // Remove notification after 4 seconds
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 4000);
        
        // Reset success state after delay
        setTimeout(() => setSuccess(false), 3000);
        
      } else {
        throw new Error(data.error || 'Failed to update wallet pass');
      }
    } catch (error) {
      console.error('Error updating wallet pass:', error);
      
      // Show user-friendly error
      const errorMessage = error instanceof Error ? error.message : 'Failed to update your wallet pass';
      
      // Create error notification
      const notification = document.createElement('div');
      notification.innerHTML = `
        <div style="
          position: fixed;
          top: 20px;
          right: 20px;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          padding: 16px 20px;
          border-radius: 12px;
          box-shadow: 0 8px 25px rgba(239, 68, 68, 0.3);
          z-index: 9999;
          max-width: 350px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 12px;
        ">
          <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
          <div>
            <div style="font-size: 14px; margin-bottom: 4px;">Update Failed</div>
            <div style="font-size: 12px; opacity: 0.9;">${errorMessage}</div>
          </div>
        </div>
      `;
      
      document.body.appendChild(notification);
      
      // Remove notification after 5 seconds
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 5000);
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
          Updating...
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
export function CompactUpdatePassButton({ offer, userWalletPassId, className = '' }: AddToWalletButtonProps) {
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
export function PromoUpdatePassButton({ offer, userWalletPassId, className = '' }: AddToWalletButtonProps) {
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

// Legacy aliases for backward compatibility
export const CompactAddToWalletButton = CompactUpdatePassButton;
export const PromoAddToWalletButton = PromoUpdatePassButton;
