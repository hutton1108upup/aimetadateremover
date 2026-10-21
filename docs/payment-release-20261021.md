# Payment release — 2026-10-21

## Result

Production checkout is enabled at https://aimetadataremover.pro in the confirmed Cloudflare account `7fd7ed1128ca3d125feaa279f4d4c547`, Worker `aimetadateremover`, D1 `25630523-1dae-4032-b45b-f539622320f2`. Waffo store `STO_5iFEBLTOBoV0tSNB4jxOTJ` has production eligibility and published monthly/yearly products; no duplicate review submission was needed.

The activation script backed up production D1, applied billing migrations, configured production secrets with checkout closed, registered the production webhook, deployed, checked the closed state, then enabled checkout and rechecked it. Initial code deployment version: `79123cd8-f165-459d-a771-8b563d3da76e`; the final secret update may create another version. Live API returns `environment=prod`, `enabled=true`, `checkoutEnabled=true`. The Cloudflare settings API confirms the correct production D1 binding despite a misleading deploy-console preview label.

## Code and tests

- Integrated main `7c29e06` into the existing billing branch, retaining mobile result navigation, SEO and PDF/DOCX tools alongside billing gates.
- Next.js / eslint-config-next `16.4.2`, Wrangler `4.151.3`, OpenNext Cloudflare `1.20.12`. The adapter update fixes the Next 16.4 `preview-props.json` manifest incompatibility observed on the test Worker. No generated dependency files were manually patched.
- 159 unit tests, TypeScript, ESLint, 12 real local auth/D1 checks, 11 release-guard tests and Linux Next/OpenNext build passed. An overloaded parallel test run timed out; rerunning with two workers passed all 159 without unhandled errors.
- Sandbox deployment `94cb769e-c626-4fcd-9bc7-691b16d0a2a3` passed pricing at 390/1440 widths, expected prices/login links/no horizontal overflow, and homepage/policies/PDF/DOCX routes with support links. Fourteen live negative payment checks passed.
- Production browser checks passed the same routes and widths. Production billing/auth status returned 200. These are browser/HTTP checks, not a fresh real Google-account purchase.

## Fresh sandbox card payments

Used the provider's documented successful sandbox card, with explicit Test Mode banners. No real card or real funds used.

- Monthly order `ORD_4bFxqUtE8k8PfKTBzVPaaO`: USD 4.90 paid; signed activation/payment receipts in D1; Pro Monthly, unlimited daily images and batch limit 10; task reserve/complete/duplicate complete passed.
- Yearly order `ORD_0e5cW1xb0tO8DnN2rq5mmf`: USD 49.90 paid; signed activation/payment receipts in D1; Pro Yearly, batch limit 10 and session limit 30; task reserve/complete/duplicate complete passed.
- Canceled future renewal for both through the website API; signed cancellation receipts confirmed. Synthetic sandbox sessions are distinct from real Google OAuth login.
- Historical renewal/failure/recovery receipts were rechecked. Future-period entitlement verification is explicitly read-only time replay, not a claim that calendar-time renewal happened today.

## Recovery and evidence

C: became full during builds. With specific user authorization, removed only this run's obsolete `/tmp/imagefinisher-auth-build-Zz0AN4` and reused `/tmp/imagefinisher-auth-build-ydJ0ic`. WSL recovered; corrupted npm cache entries were automatically refetched by npm. Prior task directories and personal files were not removed. Windows process TEMP/TMP and npm cache were pointed to this project's D: artifacts for checks.

Evidence (ignored, local only):

- `artifacts/payment-release-20261021/new-sandbox-receipts.json`
- `artifacts/payment-release-20261021/browser-imagefinisher-billing-test.duckweed1014.workers.dev.json`
- `artifacts/payment-release-20261021/browser-aimetadataremover.pro.json`
- `artifacts/payment-release-20261021/production-live.json`
- `artifacts/waffo-20261008/production-2026-10-21*/`: production backup and deployment result. Do not commit database backups, credentials or session fixtures.

## Limits

No real charge, production paid-webhook/entitlement delivery, payout or refund was performed. These require an explicitly authorized real purchase. Customer-support mailbox delivery was not retested. Dependency advisories remain in tooling/transitive packages; this is not a clean security-audit claim. Do not report local/build/sandbox success as real-money acceptance.
