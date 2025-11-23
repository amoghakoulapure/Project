#!/usr/bin/env bash
set -euo pipefail

if [ ! -f .env ]; then
  echo ".env not found in $(pwd)" >&2
  exit 1
fi

# Load variables from .env (ignore comments and empty lines)
eval $(grep -v '^#' .env | xargs)

cat > config.js <<EOF
// Generated from .env — keep this file local and DO NOT commit to public repos.
export const SUPABASE_URL = '${SUPABASE_URL}';
export const SUPABASE_ANON_KEY = '${SUPABASE_ANON_KEY}';
export const TASKS_TABLE = '${TASKS_TABLE:-tasks}';
EOF

echo "config.js generated from .env"
