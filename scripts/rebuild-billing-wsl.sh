#!/usr/bin/env bash
set -euo pipefail
# Reuse only this task's dependency installation after the initial clean build.
source_dir="$(cd "$(dirname "$0")/.." && pwd -P)"
build_dir="$(cat "$source_dir/artifacts/google-login/wsl-build-path.txt")"
case "$build_dir" in /tmp/imagefinisher-auth-build-*) ;; *) echo 'Unexpected build directory'; exit 1;; esac
test -d "$build_dir/node_modules"
cmp "$source_dir/package.json" "$build_dir/package.json"
cmp "$source_dir/package-lock.json" "$build_dir/package-lock.json"
tar -C "$source_dir" -cf - src scripts migrations worker.mjs wrangler.jsonc wrangler.billing-test.jsonc | tar -C "$build_dir" -xf -
cd "$build_dir"
npm run cf:build
test -s .open-next/worker.js
cp -a .open-next/. "$source_dir/.open-next/"
echo 'Incremental Cloudflare build copied; dependency manifest unchanged.'
