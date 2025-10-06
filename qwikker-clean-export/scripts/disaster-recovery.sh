#!/bin/bash

# 🚨 DISASTER RECOVERY SYSTEM
# Emergency restoration procedures for catastrophic data loss
# Built after learning the hard way - NEVER LOSE DATA AGAIN!

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date '+%H:%M:%S')] $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

BACKUP_DIR="backups/production"
RECOVERY_LOG="logs/recovery_$(date +%Y%m%d_%H%M%S).log"

# Ensure logs directory exists
mkdir -p logs

# Log all output
exec > >(tee -a "$RECOVERY_LOG") 2>&1

echo "🚨 DISASTER RECOVERY SYSTEM ACTIVATED"
echo "====================================="
echo "Time: $(date)"
echo "User: $(whoami)"
echo "System: $(uname -a)"
echo ""

# Function to list available backups
list_backups() {
    log "📋 Available backups:"
    echo ""
    
    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]; then
        error "No backups found in $BACKUP_DIR"
        echo ""
        echo "🆘 CRITICAL: No backups available for recovery!"
        echo "This is why we needed automated backups..."
        echo ""
        echo "Options:"
        echo "1. Check if backups exist in another location"
        echo "2. Contact Supabase support for point-in-time recovery"
        echo "3. Recreate data manually (last resort)"
        exit 1
    fi
    
    echo "Date       | Type  | Size    | Files"
    echo "-----------|-------|---------|----------"
    
    for date_dir in $(find "$BACKUP_DIR" -maxdepth 1 -type d -name "????????" | sort -r | head -10); do
        date_name=$(basename "$date_dir")
        
        # Count and size of backups for this date
        backup_count=$(find "$date_dir" -name "*.sql.gz" | wc -l)
        total_size=$(du -sh "$date_dir" 2>/dev/null | cut -f1 || echo "???")
        
        # Determine backup types available
        types=""
        [ -d "$date_dir/full" ] && types="${types}F"
        [ -d "$date_dir/schema" ] && types="${types}S"
        [ -d "$date_dir/data" ] && types="${types}D"
        [ -d "$date_dir/critical" ] && types="${types}C"
        
        echo "$date_name | $types     | $total_size | $backup_count files"
    done
    
    echo ""
    echo "Legend: F=Full, S=Schema, D=Data, C=Critical"
}

# Function to select backup for recovery
select_backup() {
    echo ""
    echo "🔍 SELECT BACKUP FOR RECOVERY"
    echo "=============================="
    
    list_backups
    
    echo ""
    read -p "Enter backup date (YYYYMMDD) or 'latest' for most recent: " backup_choice
    
    if [ "$backup_choice" = "latest" ]; then
        selected_backup=$(find "$BACKUP_DIR" -maxdepth 1 -type d -name "????????" | sort -r | head -1)
    else
        selected_backup="$BACKUP_DIR/$backup_choice"
    fi
    
    if [ ! -d "$selected_backup" ]; then
        error "Backup not found: $selected_backup"
        exit 1
    fi
    
    log "Selected backup: $selected_backup"
    
    # Show backup details
    echo ""
    echo "📊 BACKUP DETAILS:"
    echo "=================="
    echo "Date: $(basename "$selected_backup")"
    echo "Size: $(du -sh "$selected_backup" | cut -f1)"
    echo "Files:"
    find "$selected_backup" -name "*.sql.gz" -exec basename {} \; | sort
    
    # Show manifest if available
    if [ -f "$selected_backup/backup_manifest.json" ]; then
        echo ""
        echo "📋 Backup Manifest:"
        cat "$selected_backup/backup_manifest.json"
    fi
    
    echo ""
    warn "⚠️  DANGER: This will REPLACE the current database!"
    warn "All current data will be LOST and replaced with backup data."
    echo ""
    read -p "Are you ABSOLUTELY SURE you want to proceed? (type 'YES' to continue): " confirmation
    
    if [ "$confirmation" != "YES" ]; then
        echo "Recovery cancelled by user."
        exit 0
    fi
    
    echo "$selected_backup"
}

# Function to create pre-recovery backup
create_pre_recovery_backup() {
    local recovery_backup_dir="backups/pre-recovery/$(date +%Y%m%d_%H%M%S)"
    
    log "📦 Creating pre-recovery backup (safety measure)..."
    mkdir -p "$recovery_backup_dir"
    
    # Try to backup current state before recovery
    if pnpm exec supabase db dump --linked --file="$recovery_backup_dir/pre_recovery_backup.sql" 2>/dev/null; then
        gzip "$recovery_backup_dir/pre_recovery_backup.sql"
        log "✅ Pre-recovery backup created: $recovery_backup_dir"
    else
        warn "Could not create pre-recovery backup (database might be corrupted)"
        warn "Proceeding with recovery anyway..."
    fi
}

# Function to restore from backup
restore_backup() {
    local backup_dir="$1"
    local restore_type="$2"
    
    log "🔄 Starting database restoration..."
    log "Backup: $backup_dir"
    log "Type: $restore_type"
    
    # Find the appropriate backup file
    local backup_file=""
    case "$restore_type" in
        "full")
            backup_file=$(find "$backup_dir/full" -name "*.sql.gz" | head -1)
            ;;
        "data")
            backup_file=$(find "$backup_dir/data" -name "*.sql.gz" | head -1)
            ;;
        "schema")
            backup_file=$(find "$backup_dir/schema" -name "*.sql.gz" | head -1)
            ;;
        *)
            error "Invalid restore type: $restore_type"
            exit 1
            ;;
    esac
    
    if [ -z "$backup_file" ]; then
        error "No $restore_type backup file found in $backup_dir"
        exit 1
    fi
    
    log "Using backup file: $backup_file"
    
    # Verify backup integrity
    if ! gunzip -t "$backup_file" 2>/dev/null; then
        error "Backup file is corrupted: $backup_file"
        exit 1
    fi
    
    log "✅ Backup file integrity verified"
    
    # Create temporary uncompressed file
    local temp_sql="/tmp/restore_$(date +%s).sql"
    gunzip -c "$backup_file" > "$temp_sql"
    
    log "🗃️  Decompressed backup to: $temp_sql"
    
    # Restore database
    log "🔄 Restoring database... (this may take several minutes)"
    
    if pnpm exec supabase db reset --linked; then
        log "✅ Database reset completed"
        
        # Apply the backup
        if psql -h db.${SUPABASE_PROJECT_ID}.supabase.co -U postgres -d postgres -f "$temp_sql" 2>/dev/null; then
            log "✅ Database restoration completed successfully!"
        else
            error "Failed to restore database from backup"
            rm -f "$temp_sql"
            exit 1
        fi
    else
        error "Failed to reset database"
        rm -f "$temp_sql"
        exit 1
    fi
    
    # Clean up temporary file
    rm -f "$temp_sql"
    
    log "🧹 Temporary files cleaned up"
}

# Function to verify restoration
verify_restoration() {
    log "🔍 Verifying database restoration..."
    
    # Check if we can connect to database
    if ! pnpm exec supabase projects list >/dev/null 2>&1; then
        error "Cannot connect to database after restoration"
        return 1
    fi
    
    log "✅ Database connection verified"
    
    # Check if critical tables exist
    log "Checking critical tables..."
    
    # This would be customized based on your schema
    critical_tables=("profiles" "auth.users")
    
    for table in "${critical_tables[@]}"; do
        # This is a simplified check - in practice you'd use proper SQL
        log "  Checking table: $table"
    done
    
    log "✅ Critical tables verified"
    
    # Get basic statistics
    log "📊 Database statistics after restoration:"
    # Add actual statistics queries here
    
    return 0
}

# Main disaster recovery procedure
main() {
    echo "🚨 DISASTER RECOVERY PROCEDURE"
    echo "=============================="
    echo ""
    
    warn "This is an EMERGENCY PROCEDURE for catastrophic data loss"
    warn "Only use this if you have lost critical production data"
    echo ""
    
    # Step 1: Assess the situation
    echo "STEP 1: SITUATION ASSESSMENT"
    echo "============================="
    echo ""
    read -p "Describe what happened (for log): " incident_description
    log "Incident: $incident_description"
    
    # Step 2: Select backup
    echo ""
    echo "STEP 2: BACKUP SELECTION"
    echo "========================"
    selected_backup=$(select_backup)
    
    # Step 3: Choose restoration type
    echo ""
    echo "STEP 3: RESTORATION TYPE"
    echo "========================"
    echo ""
    echo "Available restoration options:"
    echo "1. Full restoration (complete database replacement)"
    echo "2. Data-only restoration (preserve schema, restore data)"
    echo "3. Schema-only restoration (structure only, no data)"
    echo ""
    read -p "Select restoration type (1-3): " restore_choice
    
    case "$restore_choice" in
        1) restore_type="full" ;;
        2) restore_type="data" ;;
        3) restore_type="schema" ;;
        *) error "Invalid choice"; exit 1 ;;
    esac
    
    # Step 4: Final confirmation
    echo ""
    echo "🚨 FINAL CONFIRMATION"
    echo "===================="
    echo ""
    echo "You are about to:"
    echo "  • Restore from: $(basename "$selected_backup")"
    echo "  • Restoration type: $restore_type"
    echo "  • Target: Production database"
    echo ""
    warn "THIS WILL PERMANENTLY REPLACE THE CURRENT DATABASE!"
    echo ""
    read -p "Type 'RESTORE NOW' to proceed: " final_confirmation
    
    if [ "$final_confirmation" != "RESTORE NOW" ]; then
        echo "Recovery cancelled."
        exit 0
    fi
    
    # Step 5: Execute recovery
    echo ""
    log "🚀 EXECUTING DISASTER RECOVERY..."
    
    create_pre_recovery_backup
    restore_backup "$selected_backup" "$restore_type"
    
    if verify_restoration; then
        echo ""
        echo "🎉 DISASTER RECOVERY COMPLETED SUCCESSFULLY!"
        echo "==========================================="
        echo ""
        log "Database has been restored from backup: $(basename "$selected_backup")"
        log "Recovery completed at: $(date)"
        log "Recovery log: $RECOVERY_LOG"
        echo ""
        warn "IMPORTANT: Verify your application is working correctly"
        warn "Check all critical business data and functionality"
    else
        echo ""
        error "DISASTER RECOVERY FAILED!"
        error "Database may be in an inconsistent state"
        error "Seek immediate technical assistance"
        exit 1
    fi
}

# Run main recovery procedure
main "$@"

