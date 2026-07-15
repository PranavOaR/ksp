# Linux build environment for the AppSail bundle.
# Node major MUST match the "stack" in app-config.json (node22) so the
# better-sqlite3 prebuilt binding matches the AppSail runtime ABI.
FROM node:22-bookworm-slim

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build
