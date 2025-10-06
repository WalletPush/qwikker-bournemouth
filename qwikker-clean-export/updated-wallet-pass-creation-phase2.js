// PHASE 2 WALLET PASS CREATION WITH PASSWORD GATE REDIRECT
// Replace your existing wallet pass creation code with this

document.getElementById('vipPassForm').addEventListener('submit', function (event) {
    event.preventDefault();
    const form = event.target;
    const button = form.querySelector('button');
    const notification = form.querySelector('.loading-notification');
    const firstName = form.First_Name.value.trim();
    const lastName = form.Last_Name.value.trim();
    const email = form.email.value.trim();

    if (!firstName || !lastName || !email) {
        alert('Please fill out all fields.');
        return;
    }

    button.innerHTML = 'Creating Your Pass<span class="loading-dots"></span>';
    button.disabled = true;
    notification.textContent = 'Please wait. Pass Creation in progress...';
    notification.style.display = 'block';

    const apiUrl = `https://app2.walletpush.io/api/v1/templates/${MOBILE_WALLET_TEMPLATE_ID}/pass`;
    const apiHeaders = {
        'Authorization': MOBILE_WALLET_APP_KEY,
        'Content-Type': 'application/json',
    };

    // STEP 1: Create the wallet pass (unchanged from original)
    fetch(apiUrl, {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({ 
            'First_Name': firstName, 
            'Last_Name': lastName, 
            'Email': email 
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (!data.url) throw new Error('Pass creation failed.');
        
        // STEP 2: Send to GHL (your existing webhook - unchanged)
        return fetch(HIGHLEVEL_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                'First_Name': firstName,
                'Last_Name': lastName,
                'email': email,
                'serialNumber': data.serialNumber,
                'passTypeIdentifier': data.passTypeIdentifier,
                'url': data.url,
                'device': /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
                // NEW: Add dashboard URL for GHL
                'dashboard_url': `http://localhost:3001/phase2-gate?wallet_pass_id=${data.serialNumber}`
            }),
        }).then(() => data);
    })
    .then(data => {
        // STEP 3: Create user record in Supabase (NEW)
        return fetch('http://localhost:3001/api/ghl-webhook/user-creation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                'first_name': firstName,
                'last_name': lastName,
                'email': email,
                'serialNumber': data.serialNumber,
                'passTypeIdentifier': data.passTypeIdentifier,
                'url': data.url,
                'device': /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
            }),
        }).then(() => data);
    })
    .then(data => {
        notification.style.display = 'none';
        
        // PHASE 2: Show success message with password gate link (CHANGED)
        const successMessage = `
            <div style="background: linear-gradient(135deg, #00d083, #00b86f); color: black; padding: 20px; border-radius: 12px; margin: 15px 0; text-align: center; box-shadow: 0 4px 15px rgba(0, 208, 131, 0.3);">
                <h3 style="margin: 0 0 10px 0; font-size: 20px;">🎉 Pass Created Successfully!</h3>
                <p style="margin: 0 0 15px 0; font-size: 14px;">Your Qwikker VIP Pass is ready to download!</p>
                
                <div style="background: rgba(0,0,0,0.1); padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <h4 style="margin: 0 0 10px 0; font-size: 16px;">🚀 Phase 2 Demo Access</h4>
                    <p style="margin: 0 0 10px 0; font-size: 13px;">Test our new dashboard with exclusive features!</p>
                    <a href="http://localhost:3001/phase2-gate?wallet_pass_id=${data.serialNumber}" 
                       target="_blank" 
                       style="background: black; color: #00d083; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 14px; margin-top: 5px;">
                       🎯 Access Phase 2 Demo
                    </a>
                </div>
                
                <div style="border-top: 1px solid rgba(0,0,0,0.1); padding-top: 15px; margin-top: 15px;">
                    <p style="margin: 0 0 10px 0; font-size: 13px; opacity: 0.8;">Or continue with current Qwikker:</p>
                    <a href="https://app.walletpush.io/ai/21?ID=${data.serialNumber}" 
                       target="_blank" 
                       style="background: transparent; color: black; border: 1px solid black; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 14px;">
                       🤖 Use Current AI Companion
                    </a>
                </div>
            </div>
        `;
        
        // Add success message to page
        const successDiv = document.createElement('div');
        successDiv.innerHTML = successMessage;
        form.parentNode.insertBefore(successDiv, form.nextSibling);
        
        // Original wallet pass download (unchanged)
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
            window.location.href = data.url.replace('?t=', '.pkpass?t=');
        } else {
            window.location.href = data.url;
        }
        
        button.textContent = 'Pass Created - Check Your Wallet!';
    })
    .catch(error => {
        console.error('Error:', error);
        notification.style.display = 'none';
        alert('An error occurred. Please try again.');
        button.textContent = 'Create My Pass';
        button.disabled = false;
    });
});

// OPTIONAL: Auto-redirect to Phase 2 after pass download
// Uncomment this if you want automatic redirect after 5 seconds
/*
setTimeout(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const serialNumber = urlParams.get('serial') || 'new-user';
    window.location.href = `https://qwikkerdashboard-theta.vercel.app/phase2-gate?wallet_pass_id=${serialNumber}`;
}, 5000);
*/
