// ENHANCED WALLET PASS CREATION WITH DASHBOARD LINKS
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

    // STEP 1: Create the wallet pass
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
        
        // STEP 2: Add dashboard links to the back of the pass
        const updateUrl = `https://app2.walletpush.io/api/v1/passes/${data.serialNumber}`;
        
        return fetch(updateUrl, {
            method: 'PUT',
            headers: apiHeaders,
            body: JSON.stringify({
                // Dashboard link
                'back_field_1_label': '🏠 Your Dashboard',
                'back_field_1_value': 'Tap to open your personalized dashboard',
                'back_field_1_link': `https://qwikkerdashboard-theta.vercel.app/user/dashboard?wallet_pass_id=${data.serialNumber}`,
                
                // Discover link  
                'back_field_2_label': '🌍 Discover Local',
                'back_field_2_value': 'Find businesses & exclusive offers',
                'back_field_2_link': `https://qwikkerdashboard-theta.vercel.app/user/discover?wallet_pass_id=${data.serialNumber}`,
                
                // Support email
                'back_field_3_label': '📧 Support',
                'back_field_3_value': 'help@qwikker.com',
                'back_field_3_link': 'mailto:help@qwikker.com',
                
                // Website link
                'back_field_4_label': '🌐 Website',
                'back_field_4_value': 'bournemouth.qwikker.com',
                'back_field_4_link': 'https://bournemouth.qwikker.com'
            })
        }).then(() => data); // Return original data for next step
    })
    .then(data => {
        // STEP 3: Send to GHL (your existing webhook)
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
                'dashboard_url': `https://qwikkerdashboard-theta.vercel.app/user/dashboard?wallet_pass_id=${data.serialNumber}`
            }),
        }).then(() => data);
    })
    .then(data => {
        // STEP 4: Create user record in Supabase (NEW)
        return fetch('https://qwikkerdashboard-theta.vercel.app/api/ghl-webhook/user-creation', {
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
        
        // Show success message with dashboard link
        const successMessage = `
            <div style="background: #00d083; color: black; padding: 15px; border-radius: 8px; margin: 10px 0; text-align: center;">
                <h3>🎉 Pass Created Successfully!</h3>
                <p>Your personalized dashboard is ready!</p>
                <a href="https://qwikkerdashboard-theta.vercel.app/user/dashboard?wallet_pass_id=${data.serialNumber}" 
                   target="_blank" 
                   style="background: black; color: #00d083; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">
                   🏠 Open Your Dashboard
                </a>
            </div>
        `;
        
        // Add success message to page
        const successDiv = document.createElement('div');
        successDiv.innerHTML = successMessage;
        form.parentNode.insertBefore(successDiv, form.nextSibling);
        
        // Original wallet pass download
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
