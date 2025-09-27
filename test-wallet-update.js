// Quick test to see if wallet pass update is working
const testWalletUpdate = async () => {
  try {
    const response = await fetch('https://qwikkerdashboard-theta.vercel.app/api/walletpass/update-main-pass', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userWalletPassId: 'QWIK-BOURNE-SOPHIE-1727439267890', // Use Sophie's pass ID from the screenshot
        currentOffer: 'TEST: Free Seasoned Fries With Any Main',
        offerDetails: {
          business: 'Venezy Burgers',
          offer: 'Free Seasoned Fries With Any Main',
          claimed_at: new Date().toISOString()
        }
      })
    });
    
    const result = await response.json();
    console.log('✅ Wallet update result:', result);
    
  } catch (error) {
    console.error('❌ Wallet update failed:', error);
  }
};

testWalletUpdate();
