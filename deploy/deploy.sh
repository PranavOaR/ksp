#!/usr/bin/env bash
# Generate appsail/app-config.json (secrets stay out of git — appsail/ is
# gitignored) and deploy to Catalyst AppSail.
set -euo pipefail
cd "$(dirname "$0")/.."

CATALYST_PROJECT="${CATALYST_PROJECT:-drishti}"
CATALYST_ORG="${CATALYST_ORG:-60078252484}"
APPSAIL_STACK="node22" # must match the Node major in deploy/Dockerfile
APPSAIL_MEMORY=512

if [ ! -f appsail/server.js ]; then
  echo "appsail/ bundle missing — run deploy/build.sh first" >&2
  exit 1
fi

anthropicKey=$(grep '^ANTHROPIC_API_KEY=' .env.local | cut -d= -f2-)
if [ -z "$anthropicKey" ]; then
  echo "ANTHROPIC_API_KEY missing from .env.local" >&2
  exit 1
fi

authSecret=$(grep '^AUTH_SECRET=' .env.local | cut -d= -f2- || true)
if [ -z "$authSecret" ]; then
  authSecret=$(openssl rand -hex 32)
  printf 'AUTH_SECRET=%s\n' "$authSecret" >>.env.local
  echo "Generated AUTH_SECRET and saved it to .env.local"
fi

# Deployed demo-account password: never the well-known dev value from the
# public repo. Generated once, persisted in .env.local, shared with judges.
demoPassword=$(grep '^DEMO_PASSWORD=' .env.local | cut -d= -f2- || true)
if [ -z "$demoPassword" ]; then
  demoPassword="ksp-$(openssl rand -hex 4)"
  printf 'DEMO_PASSWORD=%s\n' "$demoPassword" >>.env.local
  echo "Generated DEMO_PASSWORD and saved it to .env.local"
fi

cat >appsail/app-config.json <<EOF
{
  "command": "node start.js",
  "build_path": ".",
  "stack": "$APPSAIL_STACK",
  "env_variables": {
    "ANTHROPIC_API_KEY": "$anthropicKey",
    "AUTH_SECRET": "$authSecret",
    "DEMO_PASSWORD": "$demoPassword"
  },
  "memory": $APPSAIL_MEMORY,
  "scripts": {}
}
EOF

catalyst deploy --only appsail --project "$CATALYST_PROJECT" --org "$CATALYST_ORG"
