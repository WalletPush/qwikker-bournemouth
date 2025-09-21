import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // This endpoint updates ALL existing wallet passes to add Phase 2 demo link
    
    const MOBILE_WALLET_APP_KEY = process.env.MOBILE_WALLET_APP_KEY;
    const MOBILE_WALLET_TEMPLATE_ID = process.env.MOBILE_WALLET_TEMPLATE_ID;
    
    if (!MOBILE_WALLET_APP_KEY || !MOBILE_WALLET_TEMPLATE_ID) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing WalletPush credentials' 
      }, { status: 400 });
    }

    // Update ALL passes in the template with the new Phase 2 demo link
    const updateUrl = `https://app2.walletpush.io/api/v1/templates/${MOBILE_WALLET_TEMPLATE_ID}/passes/update`;
    
    const response = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'Authorization': MOBILE_WALLET_APP_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Add Phase 2 demo link to back of ALL existing passes
        'back_field_5_label': '🚀 QWIKKER PHASE 2 DEMO',
        'back_field_5_value': 'Test our new dashboard (Admin Only)',
        'back_field_5_link': `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/phase2-gate`
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('WalletPush update error:', errorText);
      return NextResponse.json({ 
        success: false, 
        error: `WalletPush error: ${response.status}` 
      }, { status: 500 });
    }

    const result = await response.json();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Successfully updated all existing wallet passes with Phase 2 demo link',
      updatedPasses: result.updated_count || 'Unknown',
      details: result
    });

  } catch (error) {
    console.error('Error updating existing passes:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update existing passes' 
    }, { status: 500 });
  }
}
