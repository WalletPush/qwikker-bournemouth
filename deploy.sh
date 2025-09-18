#!/bin/bash

echo "🚀 Starting QWIKKER Deployment..."

# Stop any running servers
echo "📱 Stopping development server..."
pkill -f "next dev" || true

# Add all changes
echo "📝 Adding changes to git..."
git add .

# Commit changes
echo "💾 Committing email service integration..."
git commit -m "feat: integrate Resend email service with improved templates"

# Check current branch
echo "🌿 Current branch:"
git branch --show-current

# Switch to main if not already there
if [ "$(git branch --show-current)" != "main" ]; then
    echo "🔄 Switching to main branch..."
    git checkout main
    echo "🔀 Merging feature branch..."
    git merge feature/settings-page
fi

# Push to GitHub
echo "⬆️ Pushing to GitHub..."
git push origin main

echo "✅ Git operations complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Go to vercel.com"
echo "2. Import your GitHub repo"
echo "3. Add environment variables"
echo "4. Deploy!"
echo ""
echo "🔗 Your dad will be able to test at: https://your-app-name.vercel.app/onboarding"
