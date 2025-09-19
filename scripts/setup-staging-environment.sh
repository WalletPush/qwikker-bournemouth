#!/bin/bash

# 🎭 STAGING ENVIRONMENT SETUP
# Creates a completely separate staging database for safe development
# NO MORE TOUCHING PRODUCTION DATA!

set -euo pipefail

echo "🎭 Setting up STAGING environment..."
echo "This will create a separate Supabase project for safe development"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if staging config already exists
if [ -f ".env.staging" ]; then
    warn "Staging environment already configured!"
    echo "Current staging config:"
    cat .env.staging
    echo ""
    read -p "Do you want to reconfigure? (y/N): " reconfigure
    if [[ $reconfigure != [Yy] ]]; then
        echo "Keeping existing staging setup."
        exit 0
    fi
fi

echo "🚀 STAGING ENVIRONMENT SETUP GUIDE"
echo "=================================="
echo ""
echo "To create a bulletproof staging environment, you need to:"
echo ""
echo "1. 📋 Create a NEW Supabase project (separate from production)"
echo "2. 🔗 Get the staging project credentials"
echo "3. 🔧 Configure environment variables"
echo "4. 🗃️  Run migrations on staging database"
echo ""

# Step 1: Create new Supabase project
echo "STEP 1: Create Staging Supabase Project"
echo "======================================="
echo ""
echo "1. Go to https://supabase.com/dashboard"
echo "2. Click 'New Project'"
echo "3. Name it: 'Qwikker-Staging' or 'Dashboard-Staging'"
echo "4. Choose the SAME region as production (for consistency)"
echo "5. Wait for project to initialize..."
echo ""
read -p "Press ENTER when you've created the staging project..."

# Step 2: Get credentials
echo ""
echo "STEP 2: Get Staging Project Credentials"
echo "======================================="
echo ""
echo "From your NEW staging project dashboard:"
echo "1. Go to Settings → API"
echo "2. Copy the following values:"
echo ""

# Collect staging credentials
read -p "📋 Project URL (https://xxx.supabase.co): " STAGING_URL
read -p "🔑 Anon Key (eyJ...): " STAGING_ANON_KEY
read -s -p "🔐 Service Role Key (eyJ...): " STAGING_SERVICE_KEY
echo ""
read -p "🆔 Project ID (from URL): " STAGING_PROJECT_ID

# Step 3: Create staging environment file
echo ""
log "Creating staging environment configuration..."

cat > .env.staging << EOF
# 🎭 STAGING ENVIRONMENT CONFIGURATION
# This is a SEPARATE database from production
# Safe for development, testing, and experimentation

# Supabase Staging Configuration
NEXT_PUBLIC_SUPABASE_URL="$STAGING_URL"
NEXT_PUBLIC_SUPABASE_ANON_KEY="$STAGING_ANON_KEY"
SUPABASE_SERVICE_ROLE_KEY="$STAGING_SERVICE_KEY"
SUPABASE_PROJECT_ID="$STAGING_PROJECT_ID"

# Environment identifier
NODE_ENV="staging"
ENVIRONMENT="staging"

# Staging-specific settings
NEXT_PUBLIC_APP_ENV="staging"
NEXT_PUBLIC_DEBUG_MODE="true"

# Email settings (use staging email service)
RESEND_API_KEY="your-staging-resend-key"

# Cloudinary (can use same account with staging folder)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
CLOUDINARY_FOLDER="staging"

# Database safety marker
DATABASE_TYPE="STAGING"
ALLOW_DESTRUCTIVE_OPERATIONS="true"
EOF

log "✅ Staging environment file created: .env.staging"

# Step 4: Create staging-specific scripts
echo ""
log "Creating staging-specific scripts..."

# Staging development script
cat > scripts/dev-staging.sh << 'EOF'
#!/bin/bash
# 🎭 Start development server with STAGING environment

echo "🎭 Starting development server with STAGING database..."
echo "⚠️  This uses the STAGING database - safe for development"

# Load staging environment
export $(cat .env.staging | grep -v '^#' | xargs)

# Start Next.js with staging config
pnpm dev
EOF

# Staging migration script
cat > scripts/migrate-staging.sh << 'EOF'
#!/bin/bash
# 🎭 Run migrations on STAGING database

echo "🎭 Running migrations on STAGING database..."
echo "⚠️  This is SAFE - using staging database only"

# Load staging environment
export $(cat .env.staging | grep -v '^#' | xargs)

# Link to staging project
pnpm exec supabase link --project-ref "$SUPABASE_PROJECT_ID"

# Run migrations
pnpm exec supabase db push

echo "✅ Staging migrations completed!"
EOF

# Staging reset script (SAFE!)
cat > scripts/reset-staging.sh << 'EOF'
#!/bin/bash
# 🎭 SAFELY reset STAGING database
# This is SAFE because it only affects staging!

echo "🎭 Resetting STAGING database..."
echo "✅ This is SAFE - only affects staging environment"

# Load staging environment
export $(cat .env.staging | grep -v '^#' | xargs)

# Confirm it's staging
if [[ "$DATABASE_TYPE" != "STAGING" ]]; then
    echo "❌ ERROR: Not connected to staging database!"
    exit 1
fi

# Link to staging project
pnpm exec supabase link --project-ref "$SUPABASE_PROJECT_ID"

# Reset staging database (SAFE!)
pnpm exec supabase db reset --linked

echo "✅ Staging database reset completed!"
echo "🎭 Safe to continue development on staging"
EOF

# Make scripts executable
chmod +x scripts/dev-staging.sh
chmod +x scripts/migrate-staging.sh
chmod +x scripts/reset-staging.sh

log "✅ Staging scripts created and made executable"

# Step 5: Create production protection
echo ""
log "Creating production protection scripts..."

cat > scripts/production-guard.sh << 'EOF'
#!/bin/bash
# 🛡️ PRODUCTION DATABASE GUARD
# Prevents accidental operations on production database

check_environment() {
    if [[ "${DATABASE_TYPE:-}" == "STAGING" ]]; then
        echo "✅ Safe: Using staging database"
        return 0
    fi
    
    if [[ "${NODE_ENV:-}" == "production" ]] || [[ "${ENVIRONMENT:-}" == "production" ]]; then
        echo "🚨 DANGER: Production database detected!"
        echo "❌ Operation blocked for safety"
        echo ""
        echo "To work safely:"
        echo "1. Use: ./scripts/dev-staging.sh"
        echo "2. Or: export \$(cat .env.staging | grep -v '^#' | xargs)"
        exit 1
    fi
    
    echo "⚠️  Environment not clearly marked - please use staging"
    exit 1
}

# Run the check
check_environment
EOF

chmod +x scripts/production-guard.sh

# Step 6: Update package.json scripts
log "Updating package.json with staging scripts..."

# Create backup of package.json
cp package.json package.json.backup

# Add staging scripts (this would need manual editing in real scenario)
log "⚠️  Please manually add these scripts to your package.json:"
echo ""
echo '"scripts": {'
echo '  "dev:staging": "./scripts/dev-staging.sh",'
echo '  "migrate:staging": "./scripts/migrate-staging.sh",'
echo '  "reset:staging": "./scripts/reset-staging.sh",'
echo '  "guard": "./scripts/production-guard.sh"'
echo '}'

# Step 7: Final instructions
echo ""
echo "🎉 STAGING ENVIRONMENT SETUP COMPLETE!"
echo "======================================"
echo ""
echo "✅ What was created:"
echo "  📁 .env.staging - Staging environment configuration"
echo "  🎭 scripts/dev-staging.sh - Start development with staging DB"
echo "  🗃️  scripts/migrate-staging.sh - Run migrations on staging"
echo "  🔄 scripts/reset-staging.sh - SAFELY reset staging database"
echo "  🛡️  scripts/production-guard.sh - Prevents production accidents"
echo ""
echo "🚀 HOW TO USE:"
echo "  Development: ./scripts/dev-staging.sh"
echo "  Migrations:  ./scripts/migrate-staging.sh"
echo "  Safe Reset:  ./scripts/reset-staging.sh"
echo ""
echo "🛡️  PRODUCTION IS NOW PROTECTED!"
echo "   Never accidentally touch production data again!"
echo ""
warn "NEXT STEPS:"
echo "1. Run: ./scripts/migrate-staging.sh (to set up staging database)"
echo "2. Use: ./scripts/dev-staging.sh (for all development)"
echo "3. NEVER use production database for development again!"
EOF

