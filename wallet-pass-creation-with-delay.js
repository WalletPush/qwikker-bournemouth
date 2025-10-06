// Add this to your EXISTING wallet pass creation script on bournemouth.qwikker.com/join
// Replace the immediate redirect with a delayed redirect + welcome message

.then(data => {
    notification.style.display = 'none';
    
    // Show welcome message instead of immediate redirect
    const welcomeMessage = `
        <div id="welcomeMessage" style="background: linear-gradient(135deg, #00d083, #00b86f); color: black; padding: 30px; border-radius: 12px; margin: 20px 0; text-align: center; animation: fadeIn 0.5s ease-in;">
            <h2 style="margin: 0 0 15px 0; font-size: 24px;">🎉 Welcome to Qwikker!</h2>
            <p style="margin: 0 0 10px 0; font-size: 16px;">Your personalized pass has been created successfully</p>
            <p style="margin: 0; font-size: 14px; opacity: 0.8;">Redirecting to your dashboard in <span id="countdown">7</span> seconds...</p>
            
            <div style="margin-top: 20px;">
                <div style="background: rgba(0,0,0,0.2); height: 6px; border-radius: 3px; overflow: hidden;">
                    <div id="progressBar" style="background: black; height: 100%; width: 0%; transition: width 0.1s linear;"></div>
                </div>
            </div>
            
            <button onclick="redirectNow()" style="background: black; color: #00d083; border: none; padding: 10px 20px; border-radius: 6px; margin-top: 15px; cursor: pointer; font-weight: bold;">
                Skip Wait - Go Now →
            </button>
        </div>
        
        <style>
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        </style>
    `;
    
    // Add welcome message to page
    const welcomeDiv = document.createElement('div');
    welcomeDiv.innerHTML = welcomeMessage;
    form.parentNode.insertBefore(welcomeDiv, form.nextSibling);
    
    // Still trigger pass download
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
        window.location.href = data.url.replace('?t=', '.pkpass?t=');
    } else {
        window.location.href = data.url;
    }
    
    // Countdown and redirect logic
    let timeLeft = 7;
    const countdownElement = document.getElementById('countdown');
    const progressBar = document.getElementById('progressBar');
    
    const countdown = setInterval(() => {
        timeLeft--;
        if (countdownElement) countdownElement.textContent = timeLeft;
        if (progressBar) progressBar.style.width = `${((7 - timeLeft) / 7) * 100}%`;
        
        if (timeLeft <= 0) {
            clearInterval(countdown);
            redirectToDashboard();
        }
    }, 1000);
    
    // Global function for skip button
    window.redirectNow = function() {
        clearInterval(countdown);
        redirectToDashboard();
    };
    
    function redirectToDashboard() {
        // Try to use shortlink if available, fallback to direct URL
        const shortlinkUrl = data.dashboardShortlink || data.shortlink;
        const dashboardUrl = shortlinkUrl || `https://qwikkerdashboard-theta.vercel.app/user/dashboard?wallet_pass_id=${data.serialNumber}`;
        
        console.log('Redirecting to:', dashboardUrl);
        window.location.href = dashboardUrl;
    }
    
    button.textContent = 'Pass Created Successfully!';
})
