#!/bin/sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
IMAGE_NAME="${IMAGE_NAME:-wealth-plus:latest}"
HOST_PORT="${HOST_PORT:-4000}"
DATA_DIR="${DATA_DIR:-$HOME/wealth-plus-data}"

JWT_SECRET="JWT_SECRET_12345secretkeythatshouldberandomandsecure"
JWT_REFRESH_SECRET="JWT_SECRET_67890secretkeythatshouldalsberandomandsecure"
SEED_USER1_PASSWORD="Welcome1!"
SEED_USER2_PASSWORD="Welcome1!"

if [ -z "$JWT_SECRET" ] || [ -z "$JWT_REFRESH_SECRET" ]; then
  echo "JWT_SECRET and JWT_REFRESH_SECRET must be set."
  exit 1
fi

if [ ${#JWT_SECRET} -lt 32 ] || [ ${#JWT_REFRESH_SECRET} -lt 32 ]; then
  echo "JWT secrets must be at least 32 characters long."
  exit 1
fi

if [ -z "$SEED_USER1_PASSWORD" ] || [ -z "$SEED_USER2_PASSWORD" ]; then
  echo "SEED_USER1_PASSWORD and SEED_USER2_PASSWORD must be set."
  exit 1
fi

mkdir -p "$DATA_DIR"

cd "$SCRIPT_DIR"

docker build -t "$IMAGE_NAME" .

docker run --rm -p "$HOST_PORT:4000" \
  -v "$DATA_DIR:/data" \
  -e JWT_SECRET="$JWT_SECRET" \
  -e JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET" \
  -e SEED_USER1_PASSWORD="$SEED_USER1_PASSWORD" \
  -e SEED_USER2_PASSWORD="$SEED_USER2_PASSWORD" \
  "$IMAGE_NAME"
