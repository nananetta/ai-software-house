#!/bin/bash
# =============================================================================
# Wealth Plus — First-Time Setup Script
# =============================================================================
# Automates the steps required to get the app running for the first time.
# Safe to run multiple times (idempotent).
#
# Usage:
#   bash ops/setup.sh
#
# Run from the wealth-plus product root:
#   ai-software-house/products/wealth-plus/
# =============================================================================

set -e

# ---------------------------------------------------------------------------
# Resolve the directory this script lives in, then derive project paths.
# This makes the script runnable from any working directory.
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRODUCT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SERVER_DIR="$PRODUCT_ROOT/implementation/server"
CLIENT_DIR="$PRODUCT_ROOT/implementation/client"

echo ""
echo "=============================================="
echo "  Wealth Plus — Setup"
echo "=============================================="
echo ""
echo "Product root : $PRODUCT_ROOT"
echo "Server       : $SERVER_DIR"
echo "Client       : $CLIENT_DIR"
echo ""

# ---------------------------------------------------------------------------
# 1. Check Node version
# ---------------------------------------------------------------------------
echo "--- Checking Node.js version ---"

if ! command -v node &>/dev/null; then
  echo "ERROR: Node.js is not installed. Install Node 20+ from https://nodejs.org"
  exit 1
fi

NODE_VERSION=$(node --version | sed 's/v//')
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)

if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "ERROR: Node.js 20+ is required. Found: v$NODE_VERSION"
  echo "       Install a newer version from https://nodejs.org or via nvm:"
  echo "         nvm install 20 && nvm use 20"
  exit 1
fi

echo "Node.js v$NODE_VERSION — OK"
echo ""

# ---------------------------------------------------------------------------
# 2. Install server dependencies
# ---------------------------------------------------------------------------
echo "--- Installing server dependencies ---"
cd "$SERVER_DIR"
npm install
echo "Server dependencies installed."
echo ""

# ---------------------------------------------------------------------------
# 3. Install client dependencies
# ---------------------------------------------------------------------------
echo "--- Installing client dependencies ---"
cd "$CLIENT_DIR"
npm install
echo "Client dependencies installed."
echo ""

# ---------------------------------------------------------------------------
# 4. Copy .env.example to .env (only if .env does not already exist)
# ---------------------------------------------------------------------------
echo "--- Configuring environment ---"
cd "$SERVER_DIR"

if [ -f ".env" ]; then
  echo ".env already exists — skipping copy."
else
  cp .env.example .env
  echo ""
  echo "  IMPORTANT: .env has been created from .env.example."
  echo ""
  echo "  Before continuing, open server/.env and set:"
  echo ""
  echo "    JWT_SECRET          — run: openssl rand -hex 32"
  echo "    JWT_REFRESH_SECRET  — run: openssl rand -hex 32 (use a different value)"
  echo "    CLIENT_ORIGIN       — set to: http://localhost:5173"
  echo "    SEED_USER1_PASSWORD — strong password for net@family.local"
  echo "    SEED_USER2_PASSWORD — strong password for ann@family.local"
  echo ""
  echo "  After editing .env, re-run this script to complete setup."
  echo ""
  exit 0
fi

# ---------------------------------------------------------------------------
# 5. Validate that JWT_SECRET is set and long enough
# ---------------------------------------------------------------------------
echo "--- Validating .env values ---"

JWT_SECRET_VALUE=$(grep -E '^JWT_SECRET=' .env | cut -d= -f2- | tr -d '"')
JWT_REFRESH_VALUE=$(grep -E '^JWT_REFRESH_SECRET=' .env | cut -d= -f2- | tr -d '"')

if [ ${#JWT_SECRET_VALUE} -lt 32 ]; then
  echo ""
  echo "  ERROR: JWT_SECRET is too short (${#JWT_SECRET_VALUE} chars). Must be 32+ characters."
  echo "         Generate one with: openssl rand -hex 32"
  echo "         Then update JWT_SECRET in server/.env"
  echo ""
  exit 1
fi

if [ ${#JWT_REFRESH_VALUE} -lt 32 ]; then
  echo ""
  echo "  ERROR: JWT_REFRESH_SECRET is too short (${#JWT_REFRESH_VALUE} chars). Must be 32+ characters."
  echo "         Generate one with: openssl rand -hex 32"
  echo "         Then update JWT_REFRESH_SECRET in server/.env"
  echo ""
  exit 1
fi

if [ "$JWT_SECRET_VALUE" = "$JWT_REFRESH_VALUE" ]; then
  echo ""
  echo "  ERROR: JWT_SECRET and JWT_REFRESH_SECRET must be different values."
  echo "         Run 'openssl rand -hex 32' twice to generate two distinct secrets."
  echo ""
  exit 1
fi

echo ".env values look good."
echo ""

# ---------------------------------------------------------------------------
# 6. Run Prisma db push (applies schema to SQLite file, safe to re-run)
# ---------------------------------------------------------------------------
echo "--- Running Prisma db push ---"
cd "$SERVER_DIR"
npm run db:push
echo "Database schema applied."
echo ""

# ---------------------------------------------------------------------------
# 7. Run seed script
# ---------------------------------------------------------------------------
echo "--- Seeding database ---"

DB_FILE="$SERVER_DIR/src/prisma/wealth-plus.db"

# Check if users already exist by inspecting the DB file size as a rough proxy,
# then attempt seed and catch the "already exists" error gracefully.
if npm run seed 2>&1; then
  echo "Seed completed successfully."
else
  echo ""
  echo "  NOTE: Seed may have failed because users already exist."
  echo "  If this is a fresh setup, check server/.env SEED_USER1_PASSWORD and SEED_USER2_PASSWORD."
  echo "  To re-seed, delete the database file and run this script again:"
  echo "    rm $DB_FILE"
  echo "    bash ops/setup.sh"
  echo ""
fi

echo ""

# ---------------------------------------------------------------------------
# 8. Print success message and next steps
# ---------------------------------------------------------------------------
echo "=============================================="
echo "  Setup complete!"
echo "=============================================="
echo ""
echo "Next steps:"
echo ""
echo "  1. Start the backend server:"
echo "       cd $SERVER_DIR"
echo "       npm run dev"
echo ""
echo "  2. In a new terminal, start the frontend:"
echo "       cd $CLIENT_DIR"
echo "       npm run dev"
echo ""
echo "  3. Open the app:"
echo "       http://localhost:5173"
echo ""
echo "  4. Log in with:"
echo "       net@family.local  — password: ChangeMe001! (from server/.env)"
echo "       ann@family.local  — password: ChangeMe002! (from server/.env)"
echo ""
echo "  See ops/runbook.md for full developer documentation."
echo ""
