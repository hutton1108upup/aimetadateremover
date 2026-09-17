#!/usr/bin/env bash
set -euo pipefail
# Build on a Linux filesystem with Linux dependencies. Never copy auth secrets.
source_dir="$(cd "$(dirname "$0")/.." && pwd -P)"
build_dir="$(mktemp -d /tmp/imagefinisher-auth-build-XXXXXX)"
tar -C "$source_dir" --exclude='./node_modules' --exclude='./.next' --exclude='./.open-next' --exclude='./.wrangler' --exclude='./.git' --exclude='./.dev.vars*' --exclude='./.env*' --exclude='client_secret*.json' --exclude='./cloudflare-env.d.ts' --exclude='./next-env.d.ts' --exclude='./artifacts' --exclude='./tsconfig.tsbuildinfo' -cf - . | tar -C "$build_dir" -xf -
cd "$build_dir"
npx --yes npm@10.9.4 install --package-lock-only --ignore-scripts --no-fund
npx --yes npm@10.9.4 ci --no-fund
npx --yes npm@10.9.4 run cf:build
test -s .open-next/worker.js
mkdir -p "$source_dir/.open-next" "$source_dir/artifacts/google-login"
cp -a .open-next/. "$source_dir/.open-next/"
cp package-lock.json "$source_dir/package-lock.json"
printf '%s\n' "$build_dir" > "$source_dir/artifacts/google-login/wsl-build-path.txt"
printf 'Cloudflare build verified and copied from %s\n' "$build_dir"
