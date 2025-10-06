import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { offerId, userWalletPassId, offer } = await request.json();
    
    const MOBILE_WALLET_APP_KEY = process.env.MOBILE_WALLET_APP_KEY;
    const OFFER_TEMPLATE_ID = process.env.OFFER_TEMPLATE_ID || process.env.MOBILE_WALLET_TEMPLATE_ID; // Use offer template or fallback to main template
    
    if (!MOBILE_WALLET_APP_KEY || !OFFER_TEMPLATE_ID) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing WalletPush credentials' 
      }, { status: 400 });
    }

    if (!offer) {
      return NextResponse.json({ 
        success: false, 
        error: 'Offer data is required' 
      }, { status: 400 });
    }

    // Format valid until date
    const validUntil = offer.valid_until ? new Date(offer.valid_until).toLocaleDateString('en-GB') : 'No expiry';
    
    // Create offer pass using WalletPush
    const createUrl = `https://app2.walletpush.io/api/v1/templates/${OFFER_TEMPLATE_ID}/pass`;
    
    const offerPassData = {
      // Primary fields (front of pass)
      'primary_field_1_label': offer.business_name || 'Qwikker Offer',
      'primary_field_1_value': offer.title || 'Exclusive Offer',
      
      // Secondary fields
      'secondary_field_1_label': 'Valid Until',
      'secondary_field_1_value': validUntil,
      
      'secondary_field_2_label': 'Offer Type',
      'secondary_field_2_value': offer.offer_type || 'Special Deal',
      
      // Auxiliary fields
      'auxiliary_field_1_label': 'Offer ID',
      'auxiliary_field_1_value': offerId,
      
      'auxiliary_field_2_label': 'Value',
      'auxiliary_field_2_value': offer.offer_value || 'Exclusive',
      
      // Back fields (terms and conditions)
      'back_field_1_label': 'Description',
      'back_field_1_value': offer.description || 'Exclusive offer from ' + (offer.business_name || 'Qwikker partner'),
      
      'back_field_2_label': 'Terms & Conditions',
      'back_field_2_value': offer.terms || 'Present this pass at the business to redeem offer. Valid for one use only.',
      
      'back_field_3_label': 'Business',
      'back_field_3_value': offer.business_name || 'Qwikker Partner',
      
      'back_field_4_label': 'Contact',
      'back_field_4_value': 'Visit business or contact for details',
      
      // Styling - Professional business look
      'logo_text': offer.business_name || 'QWIKKER',
      'background_color': '#00d083', // Qwikker green
      'foreground_color': '#000000', // Black text
      'label_color': '#333333', // Dark gray labels
      
      // Link back to user (for tracking)
      'user_wallet_pass_id': userWalletPassId,
      'offer_id': offerId,
      
      // Barcode for scanning at business
      'barcode_message': `QWIKKER-OFFER-${offerId}`,
      'barcode_format': 'PKBarcodeFormatQR'
    };

    const response = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Authorization': MOBILE_WALLET_APP_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(offerPassData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('WalletPush offer pass creation error:', errorText);
      return NextResponse.json({ 
        success: false, 
        error: `Failed to create offer pass: ${response.status}` 
      }, { status: 500 });
    }

    const passData = await response.json();
    
    if (passData.url && passData.serialNumber) {
      // Log successful creation
      console.log('✅ Offer pass created:', {
        offerId,
        serialNumber: passData.serialNumber,
        businessName: offer.business_name
      });
      
      return NextResponse.json({ 
        success: true, 
        passUrl: passData.url,
        serialNumber: passData.serialNumber,
        message: 'Offer pass created successfully'
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid response from WalletPush' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error creating offer pass:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create offer pass' 
    }, { status: 500 });
  }
}
