#!/bin/bash
# =============================================================================
# Wealth Plus — Database Backup Script
# =============================================================================
# Copies the SQLite database to a backups/ directory with a datestamped name.
# Keeps only the 12 most recent backups (older ones are deleted automatically).
#
# Usage:
#   bash ops/backup.sh
#
# For automated weekly backups, add to crontab (runs every Sunday at 02:00):
#   0 2 * * 0 /absolute/path/to/ops/backup.sh >> /absolute/path/to/backups/backup.log 2>&1
#
# Run from the wealth-plus product root OR from any location — paths are resolved
# relative to this script's location.
# =============================================================================

set -e

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Number of recent backups to keep. Older ones are deleted.
KEEP_BACKUPS=12

# ---------------------------------------------------------------------------
# Resolve paths
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRODUCT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

DB_FILE="$PRODUCT_ROOT/implementation/server/src/prisma/wealth-plus.db"
BACKUP_DIR="$PRODUCT_ROOT/backups"

# ---------------------------------------------------------------------------
# Verify the source database file exists
# ---------------------------------------------------------------------------
if [ ! -f "$DB_FILE" ]; then
  echo "ERROR: Database file not found at:"
  echo "       $DB_FILE"
  echo ""
  echo "Has the app been set up? Run: bash ops/setup.sh"
  exit 1
fi

# ---------------------------------------------------------------------------
# Create backups directory if it does not exist
# ---------------------------------------------------------------------------
mkdir -p "$BACKUP_DIR"

# ---------------------------------------------------------------------------
# Generate the backup filename with today's date
# ---------------------------------------------------------------------------
DATE_STAMP=$(date +%Y-%m-%d)
BACKUP_FILENAME="wealth-plus-${DATE_STAMP}.db"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILENAME"

# ---------------------------------------------------------------------------
# Copy the database file
# ---------------------------------------------------------------------------
cp "$DB_FILE" "$BACKUP_PATH"

echo "Backup created: $BACKUP_PATH"

# ---------------------------------------------------------------------------
# Delete oldest backups, keeping only the $KEEP_BACKUPS most recent
# ---------------------------------------------------------------------------
# List all wealth-plus-*.db files in the backup directory sorted by name
# (date-stamped names sort chronologically), then delete all but the last N.

BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/wealth-plus-*.db 2>/dev/null | wc -l | tr -d ' ')

if [ "$BACKUP_COUNT" -gt "$KEEP_BACKUPS" ]; then
  DELETE_COUNT=$(( BACKUP_COUNT - KEEP_BACKUPS ))
  echo "Removing $DELETE_COUNT old backup(s) (keeping last $KEEP_BACKUPS)..."

  ls -1 "$BACKUP_DIR"/wealth-plus-*.db | sort | head -n "$DELETE_COUNT" | while read -r OLD_BACKUP; do
    rm "$OLD_BACKUP"
    echo "  Deleted: $OLD_BACKUP"
  done
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
FINAL_COUNT=$(ls -1 "$BACKUP_DIR"/wealth-plus-*.db 2>/dev/null | wc -l | tr -d ' ')

echo ""
echo "Done. $FINAL_COUNT backup(s) stored in $BACKUP_DIR"
echo ""
ls -lh "$BACKUP_DIR"/wealth-plus-*.db 2>/dev/null || true
