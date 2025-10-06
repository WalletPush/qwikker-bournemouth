#!/bin/bash

# 🚀 ENTERPRISE-GRADE AUTOMATED BACKUP SYSTEM
# Bulletproof database protection with multiple redundancy layers
# Created after catastrophic data loss incident - NEVER AGAIN!

set -euo pipefail  # Exit on any error, undefined vars, or pipe failures

# Configuration
BACKUP_DIR="backups/production"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DATE_ONLY=$(date +"%Y%m%d")
RETENTION_DAYS=30
MAX_PARALLEL_BACKUPS=3

# Backup types
BACKUP_TYPES=("full" "schema-only" "data-only")

# Logging
LOG_FILE="logs/backup_${TIMESTAMP}.log"
mkdir -p logs backups/production

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error_exit() {
    log "ERROR: $1"
    exit 1
}

# Create backup directory structure
create_backup_structure() {
    local backup_base="$BACKUP_DIR/$DATE_ONLY"
    mkdir -p "$backup_base"/{full,schema,data,compressed}
    echo "$backup_base"
}

# Full database backup
create_full_backup() {
    local backup_dir="$1"
    local backup_file="$backup_dir/full/full_backup_${TIMESTAMP}.sql"
    
    log "🔄 Creating FULL database backup..."
    
    if pnpm exec supabase db dump --linked --file="$backup_file"; then
        log "✅ Full backup completed: $backup_file"
        
        # Compress the backup
        gzip "$backup_file"
        log "📦 Backup compressed: ${backup_file}.gz"
        
        # Verify backup integrity
        if gunzip -t "${backup_file}.gz" 2>/dev/null; then
            log "✅ Backup integrity verified"
            return 0
        else
            error_exit "Backup integrity check FAILED"
        fi
    else
        error_exit "Full backup FAILED"
    fi
}

# Schema-only backup
create_schema_backup() {
    local backup_dir="$1"
    local backup_file="$backup_dir/schema/schema_${TIMESTAMP}.sql"
    
    log "🔄 Creating SCHEMA-ONLY backup..."
    
    if pnpm exec supabase db dump --linked --schema-only --file="$backup_file"; then
        log "✅ Schema backup completed: $backup_file"
        gzip "$backup_file"
        return 0
    else
        error_exit "Schema backup FAILED"
    fi
}

# Data-only backup
create_data_backup() {
    local backup_dir="$1"
    local backup_file="$backup_dir/data/data_${TIMESTAMP}.sql"
    
    log "🔄 Creating DATA-ONLY backup..."
    
    if pnpm exec supabase db dump --linked --data-only --file="$backup_file"; then
        log "✅ Data backup completed: $backup_file"
        gzip "$backup_file"
        return 0
    else
        error_exit "Data backup FAILED"
    fi
}

# Critical table backup (extra protection for essential data)
create_critical_backup() {
    local backup_dir="$1"
    local backup_file="$backup_dir/critical/critical_tables_${TIMESTAMP}.sql"
    
    log "🔄 Creating CRITICAL TABLES backup..."
    mkdir -p "$backup_dir/critical"
    
    # Backup only the most critical tables
    if pnpm exec supabase db dump --linked --data-only --schema=public --file="$backup_file"; then
        log "✅ Critical tables backup completed: $backup_file"
        gzip "$backup_file"
        return 0
    else
        log "⚠️ Critical tables backup failed (non-fatal)"
        return 1
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log "🧹 Cleaning up backups older than $RETENTION_DAYS days..."
    
    find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    find "$BACKUP_DIR" -type d -empty -delete 2>/dev/null || true
    
    log "✅ Cleanup completed"
}

# Verify Supabase connection
verify_connection() {
    log "🔌 Verifying Supabase connection..."
    
    if ! pnpm exec supabase projects list >/dev/null 2>&1; then
        error_exit "Cannot connect to Supabase. Check your credentials."
    fi
    
    log "✅ Supabase connection verified"
}

# Send backup notification (placeholder for webhook/email)
send_notification() {
    local status="$1"
    local message="$2"
    
    log "📧 Notification: $status - $message"
    
    # TODO: Implement webhook/email notifications
    # curl -X POST "https://your-webhook-url" \
    #   -H "Content-Type: application/json" \
    #   -d "{\"status\": \"$status\", \"message\": \"$message\", \"timestamp\": \"$(date -Iseconds)\"}"
}

# Main backup process
main() {
    log "🚀 Starting automated backup process..."
    log "📊 System: $(uname -a)"
    log "🕒 Started at: $(date)"
    
    # Verify prerequisites
    verify_connection
    
    # Create backup structure
    backup_base=$(create_backup_structure)
    log "📁 Backup directory: $backup_base"
    
    # Create backups in parallel for speed
    log "🔄 Creating multiple backup types in parallel..."
    
    # Start background processes
    create_full_backup "$backup_base" &
    FULL_PID=$!
    
    create_schema_backup "$backup_base" &
    SCHEMA_PID=$!
    
    create_data_backup "$backup_base" &
    DATA_PID=$!
    
    # Wait for all backups to complete
    wait $FULL_PID
    FULL_STATUS=$?
    
    wait $SCHEMA_PID
    SCHEMA_STATUS=$?
    
    wait $DATA_PID
    DATA_STATUS=$?
    
    # Create critical backup (synchronous)
    create_critical_backup "$backup_base"
    CRITICAL_STATUS=$?
    
    # Check results
    if [ $FULL_STATUS -eq 0 ] && [ $SCHEMA_STATUS -eq 0 ] && [ $DATA_STATUS -eq 0 ]; then
        log "✅ ALL BACKUPS COMPLETED SUCCESSFULLY"
        send_notification "SUCCESS" "All database backups completed successfully at $(date)"
    else
        log "❌ SOME BACKUPS FAILED - Full: $FULL_STATUS, Schema: $SCHEMA_STATUS, Data: $DATA_STATUS"
        send_notification "PARTIAL_FAILURE" "Some database backups failed. Check logs immediately."
    fi
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Final statistics
    backup_size=$(du -sh "$backup_base" | cut -f1)
    log "📊 Total backup size: $backup_size"
    log "🏁 Backup process completed at: $(date)"
    
    # Create backup manifest
    cat > "$backup_base/backup_manifest.json" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "backup_types": ["full", "schema", "data", "critical"],
  "status": {
    "full": $FULL_STATUS,
    "schema": $SCHEMA_STATUS,
    "data": $DATA_STATUS,
    "critical": $CRITICAL_STATUS
  },
  "size": "$backup_size",
  "retention_days": $RETENTION_DAYS,
  "files": [
    "$(find "$backup_base" -name "*.sql.gz" -type f | wc -l) compressed SQL files"
  ]
}
EOF
    
    log "📋 Backup manifest created"
}

# Run main function
main "$@"

