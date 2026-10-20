#!/bin/bash
set -euo pipefail

# ==============================================================================
# Nightly Database & Vault Backup Script for AIROST Intranet (Ubuntu Host)
# ==============================================================================

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-/opt/backups}"
PROD_DUMP="${BACKUP_DIR}/mongo_prod_${TIMESTAMP}.gz"
VAULT_DUMP="${BACKUP_DIR}/vaultwarden_${TIMESTAMP}.tar.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date -Iseconds)] Starting backup process..."

# 1. Dump Production MongoDB container
if docker ps --format '{{.Names}}' | grep -q "^airost-mongodb-prod$"; then
  echo "Dumping MongoDB from container airost-mongodb-prod..."
  docker exec airost-mongodb-prod mongodump --archive --gzip > "$PROD_DUMP"
  echo "MongoDB dump saved to $PROD_DUMP ($(du -h "$PROD_DUMP" | cut -f1))"
else
  echo "WARNING: airost-mongodb-prod is not running, skipping mongo backup."
fi

# 2. Archive Vaultwarden data directory (if present)
if [ -d "/var/lib/docker/volumes/core_vaultwarden_data/_data" ]; then
  echo "Archiving Vaultwarden volume..."
  tar -czf "$VAULT_DUMP" -C /var/lib/docker/volumes/core_vaultwarden_data/_data .
  echo "Vaultwarden archive saved to $VAULT_DUMP"
fi

# 3. Sync to Google Drive via Rclone (if rclone is configured)
if command -v rclone &> /dev/null; then
  if rclone listremotes | grep -q "^gdrive:"; then
    echo "Syncing backups to Google Drive (gdrive:airost-backups)..."
    [ -f "$PROD_DUMP" ] && rclone copy "$PROD_DUMP" gdrive:airost-backups/mongo/
    [ -f "$VAULT_DUMP" ] && rclone copy "$VAULT_DUMP" gdrive:airost-backups/vault/
    echo "Upload completed successfully."
  else
    echo "Notice: Rclone 'gdrive:' remote not configured yet. Backups kept locally."
  fi
fi

# 4. Prune local backups older than 7 days
find "$BACKUP_DIR" -type f -name "mongo_prod_*.gz" -mtime +7 -delete
find "$BACKUP_DIR" -type f -name "vaultwarden_*.tar.gz" -mtime +7 -delete

echo "[$(date -Iseconds)] Backup routine finished."
