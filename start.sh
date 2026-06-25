#!/bin/bash
set -e
export DATA_DIR="${DATA_DIR:-/app/data}"
mkdir -p "$DATA_DIR/db"
node init-db.js
cp "$DATA_DIR/db/data.sqlite" ~/.9router/db/data.sqlite 2>/dev/null || true
mkdir -p ~/.9router/db
cp "$DATA_DIR/db/data.sqlite" ~/.9router/db/data.sqlite
exec npx 9router --port 20128 --no-browser --skip-update
