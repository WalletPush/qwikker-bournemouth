# 🏠 LOCALHOST TESTING GUIDE - PHASE 2 WALLET INTEGRATION

## 🚀 **READY FOR LOCAL TESTING!**

All links have been configured for localhost testing. No deployment needed yet!

---

## 🧪 **LOCAL TESTING URLS**

### **✅ USER DASHBOARD CHAT:**
```
http://localhost:3000/user/chat?wallet_pass_id=DAVID-TEST-123
```

### **✅ ADMIN DASHBOARD:**
```
http://localhost:3000/admin
# Login → AI Chat Testing tab
```

### **✅ PHASE 2 PASSWORD GATE:**
```
http://localhost:3000/phase2-gate?wallet_pass_id=DAVID-TEST-123
```

### **✅ WALLET PASS UPDATE TOOL:**
```
http://localhost:3000/admin/wallet-pass-update
```

### **✅ EMBED CHAT (IFRAME):**
```
http://localhost:3000/embed/chat?wallet_pass_id=DAVID-TEST-123
```

---

## 🎯 **TESTING CHECKLIST**

### **STEP 1: Start Your Local Server**
```bash
cd /Users/qwikker/qwikkerdashboard
pnpm dev
# Server starts on http://localhost:3000
```

### **STEP 2: Test User Dashboard Chat**
```bash
# Visit this URL:
http://localhost:3000/user/chat?wallet_pass_id=DAVID-TEST-123

# ✅ Should show:
# - "Your AI Concierge" header
# - "Welcome back, David!" (if user exists)
# - WalletPush AI chat iframe
# - Full responsive height
```

### **STEP 3: Test Admin Dashboard**
```bash
# Visit this URL:
http://localhost:3000/admin

# ✅ Should show:
# - Login page (if not logged in)
# - After login: Admin dashboard with tabs
# - Click "AI Chat Testing" tab
# - See WalletPush AI chat in admin mode
```

### **STEP 4: Test Phase 2 Password Gate**
```bash
# Visit this URL:
http://localhost:3000/phase2-gate?wallet_pass_id=DAVID-TEST-123

# ✅ Should show:
# - Password entry form
# - Enter "Admin123" → redirects to user dashboard
# - "Use Current Qwikker" → redirects to WalletPush AI
```

### **STEP 5: Test Wallet Pass Updates**
```bash
# Visit this URL:
http://localhost:3000/admin/wallet-pass-update

# ✅ Should show:
# - Update tool interface
# - "Update All Existing Passes" button
# - Shows localhost URLs in environment info
```

---

## 🔧 **WALLET PASS CREATION TESTING**

### **Update Your Existing Form:**
1. **Replace your wallet pass creation JavaScript** with the code from:
   ```
   updated-wallet-pass-creation-phase2.js
   ```

2. **The success page will now show:**
   ```html
   🎉 Pass Created Successfully!
   
   🚀 Phase 2 Demo Access
   [Link to: http://localhost:3000/phase2-gate?wallet_pass_id=SERIAL]
   
   OR
   
   🤖 Use Current AI Companion
   [Link to: https://app.walletpush.io/ai/21?ID=SERIAL]
   ```

### **Test Flow:**
```
1. Create wallet pass using your form
2. Check success page shows localhost links
3. Click "Phase 2 Demo" → should open password gate
4. Click "Current AI" → should open WalletPush AI
```

---

## 🤖 **AI CHAT TESTING**

### **What You'll See:**

**User Dashboard Chat:**
```
🤖 Your AI Concierge
Welcome back, David! Ask me about local businesses, offers, and recommendations.

[WalletPush AI Chat - Full Height]
- iframe: https://app.walletpush.io/ai/21?embed=True&ID=DAVID-TEST-123
- Auto-resizing based on content
- Geolocation support (if enabled)
```

**Admin Dashboard Chat:**
```
🤖 AI Chat Console
Test and interact with the AI concierge for Bournemouth.

[WalletPush AI Chat - Full Height]
- iframe: https://app.walletpush.io/ai/21?embed=True&ID=admin
- Same AI users see
- Testing mode for validation
```

---

## 📱 **MOBILE TESTING**

### **Test on Your Phone:**
```bash
# Find your local IP address:
# Mac: System Preferences → Network → Advanced → TCP/IP
# Usually something like: 192.168.1.100

# Then visit on your phone:
http://192.168.1.100:3000/user/chat?wallet_pass_id=DAVID-TEST-123
```

### **Or Use Localhost Tunnel:**
```bash
# Install ngrok (optional):
npx ngrok http 3000

# Use the https URL it provides for testing
```

---

## 🔍 **TROUBLESHOOTING**

### **Common Issues:**

**1. "AI chat not loading"**
- Check browser console for iframe errors
- Ensure WalletPush AI instance #21 is active
- Try different user ID parameter

**2. "Password gate not redirecting"**
- Check URL has `wallet_pass_id` parameter
- Verify localhost:3000 is running
- Check browser console for errors

**3. "Admin dashboard not showing AI tab"**
- Ensure you're logged in as admin
- Check the "AI Chat Testing" tab exists
- Verify admin permissions

**4. "Wallet pass creation errors"**
- Check your WalletPush API credentials
- Verify GHL webhook is accessible
- Check browser network tab for failed requests

---

## 🎯 **WHAT TO TEST**

### **✅ Functionality Tests:**
- [ ] User chat loads WalletPush AI with correct user ID
- [ ] Admin chat loads in testing mode
- [ ] Password gate accepts "Admin123" and redirects
- [ ] "Current Qwikker" button opens WalletPush AI
- [ ] Wallet pass creation shows localhost links
- [ ] All iframes resize properly
- [ ] Mobile responsive design works

### **✅ User Experience Tests:**
- [ ] Chat interface feels smooth and responsive
- [ ] AI remembers context between messages
- [ ] Navigation between dashboards works
- [ ] Error states handle gracefully
- [ ] Loading states show properly

### **✅ Integration Tests:**
- [ ] User ID passes correctly to AI
- [ ] Geolocation works (if enabled)
- [ ] Chat history persists
- [ ] Admin can test same AI as users
- [ ] All localhost URLs work correctly

---

## 🚀 **READY FOR LOCAL DEMO!**

Everything is configured for localhost testing:

**🏠 All URLs use `http://localhost:3000`**  
**🤖 WalletPush AI integration complete**  
**📱 Mobile-responsive design**  
**🔧 No deployment needed yet**

**Start your server with `pnpm dev` and test away! 🎯**
