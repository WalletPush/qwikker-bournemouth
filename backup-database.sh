#!/bin/bash
# Manual Database Backup Script for Supabase Free Tier
# Run this BEFORE making any database changes

# Get your connection string from Supabase Dashboard → Project Settings → Database
# Format: postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres

echo "🔒 QWIKKER Database Backup Script"
echo "=================================="
echo ""
echo "⚠️  You need your Supabase connection string!"
echo "Get it from: Supabase Dashboard → Settings → Database → Connection String"
echo ""
read -p "Paste your connection string (with password): " CONNECTION_STRING

if [ -z "$CONNECTION_STRING" ]; then
    echo "❌ No connection string provided. Exiting."
    exit 1
fi

# Create backups directory
mkdir -p ./database-backups

# Generate timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="./database-backups/qwikker_backup_${TIMESTAMP}.sql"

echo ""
echo "📦 Exporting database to: $BACKUP_FILE"
echo ""

# Export entire database using pg_dump
pg_dump "$CONNECTION_STRING" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --file="$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Backup successful!"
    echo "📁 Saved to: $BACKUP_FILE"
    echo "💾 Size: $(du -h "$BACKUP_FILE" | cut -f1)"
    echo ""
    echo "🔐 To restore this backup later, run:"
    echo "   psql [CONNECTION_STRING] < $BACKUP_FILE"
else
    echo ""
    echo "❌ Backup failed! Check your connection string and try again."
    exit 1
fi

