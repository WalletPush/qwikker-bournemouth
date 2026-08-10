'use client';

/**
 * Legacy offer CTA button — now Save → Redeem via /api/offers/*.
 * Prefer in-page Save / Redeem buttons; this remains for any leftover embeds.
 */

import { useState } from 'react';
import { Wallet } from 'lucide-react';
import {
  activateOffer,
  markOfferSavedLocally,
  saveOffer,
} from '@/lib/offers/client-save-redeem';

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
  const [isSaved, setIsSaved] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

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

  const onClick = async () => {
    if (isBusy) return;
    if (!userWalletPassId || userWalletPassId === 'guest' || userWalletPassId.length < 10) {
      alert('You need to sign up first to get your Qwikker wallet pass');
      return;
    }

    setIsBusy(true);
    try {
      if (!isSaved) {
        const saved = await saveOffer({
          walletPassId: userWalletPassId,
          offerId: offer.id,
          source: 'offers',
        });
        if (!saved.success) {
          throw new Error(saved.error || 'Failed to save offer');
        }
        markOfferSavedLocally(userWalletPassId, offer.id);
        setIsSaved(true);
        return;
      }

      const ok = window.confirm(
        `Only about 60 minutes on your Wallet for "${offer.title}". Ready to show staff?`
      );
      if (!ok) return;

      let result = await activateOffer({
        walletPassId: userWalletPassId,
        offerId: offer.id,
        source: 'offers',
      });

      if (!result.success && result.needsReplace) {
        const replace = window.confirm(
          `Replace your active offer at ${result.active.business_name || 'another venue'}?`
        );
        if (!replace) return;
        result = await activateOffer({
          walletPassId: userWalletPassId,
          offerId: offer.id,
          source: 'offers',
          confirmReplace: true,
        });
      }

      if (!result.success) {
        throw new Error(('error' in result && result.error) || 'Failed to redeem');
      }

      alert(`"${offer.title}" is on your Wallet now. Show staff before it clears.`);
    } catch (error) {
      console.error('Save/Redeem error:', error);
      alert(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setIsBusy(false);
    }
  };

  const label = isBusy ? 'Working…' : isSaved ? 'Redeem now' : 'Save';

  return (
    <button
      onClick={() => void onClick()}
      disabled={isBusy}
      className={`${sizeClasses[size]} ${variantClasses[variant]} rounded-lg font-semibold transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <span className="flex items-center justify-center gap-2">
        <Wallet className="w-4 h-4" />
        {label}
      </span>
    </button>
  );
}

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

export const CompactAddToWalletButton = CompactUpdatePassButton;
export const PromoAddToWalletButton = PromoUpdatePassButton;
