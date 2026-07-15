#!/usr/bin/env bash
# Build the AppSail bundle (appsail/) via a linux/amd64 Docker build so the
# better-sqlite3 native binding matches the Catalyst AppSail runtime.
set -euo pipefail
cd "$(dirname "$0")/.."

docker build --platform linux/amd64 -f deploy/Dockerfile -t drishti-appsail-build .

containerId=$(docker create --platform linux/amd64 drishti-appsail-build)
trap 'docker rm -f "$containerId" >/dev/null 2>&1 || true' EXIT

rm -rf appsail
mkdir -p appsail
docker cp "$containerId":/app/.next/standalone/. appsail/
docker cp "$containerId":/app/.next/static appsail/.next/static
docker cp "$containerId":/app/public appsail/public
cp deploy/start.js appsail/start.js

# Never ship local SQLite workspaces — the app seeds itself on first boot.
rm -rf appsail/data

echo "appsail/ bundle ready ($(du -sh appsail | cut -f1))"
