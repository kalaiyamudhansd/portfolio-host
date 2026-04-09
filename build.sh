#!/usr/bin/env bash
set -euo pipefail

# Injects environment variables into config.js (local + Vercel).
#
# Local: create `.env` from `.env.example` — this script sources it when present.
# Vercel: Project → Settings → Environment Variables (same names).
#
# Server-only vars (CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, optional CLOUDINARY_CLOUD_NAME)
# are not used here; Vercel injects them into /api/* serverless functions at runtime.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

cp config.template.js config.js

# GNU sed (Linux/Vercel): sed -i …
# BSD sed (macOS): sed -i '' …
if sed --version >/dev/null 2>&1; then
  _sed_i() { sed -i "$@"; }
else
  _sed_i() { sed -i '' "$@"; }
fi

# Cloud name: VITE_ is canonical for client; CLOUDINARY_CLOUD_NAME alone (e.g. with API keys) also works.
_sed_i "s|%%CLOUD_NAME%%|${VITE_CLOUDINARY_CLOUD_NAME:-${CLOUDINARY_CLOUD_NAME:-}}|g" config.js
_sed_i "s|%%UPLOAD_PRESET%%|${VITE_CLOUDINARY_UPLOAD_PRESET:-}|g" config.js
_sed_i "s|%%ADMIN_PASSWORD%%|${VITE_ADMIN_PASSWORD:-}|g" config.js

echo "Config injected successfully"
