#!/bin/bash

# 🚨 EMERGENCY BACKUP SCRIPT
# Creates immediate backup of production database before any risky operations

set -e  # Exit on any error

echo "🚨 EMERGENCY BACKUP STARTING..."

# Get current timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backups/emergency"
BACKUP_FILE="emergency_backup_${TIMESTAMP}.sql"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "📦 Creating backup: $BACKUP_FILE"

# Create backup using Supabase CLI
pnpm exec supabase db dump --linked --file="$BACKUP_DIR/$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ EMERGENCY BACKUP COMPLETED: $BACKUP_DIR/$BACKUP_FILE"
    echo "📊 Backup size: $(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)"
else
    echo "❌ EMERGENCY BACKUP FAILED!"
    exit 1
fi

echo "🔒 Backup secured. Proceeding with operation..."

