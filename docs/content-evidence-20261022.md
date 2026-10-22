# Content and conversion improvements — 2026-10-22

## Scope and baseline

- Local branch: `codex/metadata-content-evidence`, based on `origin/main` `dea6d82`.
- Preserve the original `codex/gefeiSEO` checkout and its existing changes.
- No provider credentials copied, remote account configuration changed, purchase made, GitHub push or production deployment performed.
- The owner has no publishable original ComfyUI/ChatGPT exports available. All downloadable examples are explicitly synthetic. The ChatGPT article explicitly states the absence of an independently tested original export.

## Delivered

1. Clarified guest (1/day), signed-in Free (5/day total), Pro (10/batch) and Yearly session (30 across three batches) limits before image selection. Explained that device queue capacity is a separate limit. PDF/DOCX tools keep their existing independent behavior.
2. Corrected PNG compressed-text copy and inconsistent analytics/session-replay privacy copy. Added an October 22 privacy-update date without changing the shared terms version. Marked the image workspace for Clarity masking; added no popup or consent state flow.
3. Upgraded the existing ComfyUI, ChatGPT and general cleaning articles without changing their URLs. Added one batch client-delivery article. Preserved the recently added document guides and navigation changes. Added relevant tool links, related reading and updated sitemap dates.
4. Created four reproducible synthetic fixture pairs and a machine-readable report. Connected them to the guides, PNG page and ComfyUI page. Actual pixel comparison is separate from whole-file size or hash comparison.
5. Connected approved coarse processing events to the existing GA4 integration, with an independent transport allowlist. Added article views, article-to-tool clicks, checkout starts and verified paid-checkout-return events. Production analytics is disabled on local and preview hostnames.

## Evidence and reproduction

Run in PowerShell from this worktree root. Existing dependencies are installed.

```powershell
node scripts/metadata-evidence.mjs
npm.cmd run test -- --maxWorkers=2
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
```

`metadata-evidence.mjs` uses the actual metadata core and a headless Chromium process. It generates small files owned by this project, never reads customer images, and makes no external requests. It writes downloadable originals, processed copies and `report.json` to `public/samples/metadata-evidence/`, plus the matching render data at `src/lib/metadata-evidence.json`. The generated report is a dated snapshot; rerun and update its date when refreshing evidence.

For browser checks, start the built preview in one terminal:

```powershell
npm.cmd run start -- --hostname 127.0.0.1 --port 3197
```

In another terminal at the same root, use a Python environment with Playwright installed:

```powershell
python scripts/content_evidence_qa.py
```

The QA script refuses a remote BASE_URL. Account endpoints are mocked, but image workers, cleaning, result rendering and file/ZIP downloads are real. This checks the UI integration, not payment-provider or real-user quota acceptance. Close this run's preview when it is no longer needed.

Verified evidence:

- Four fixture pairs retain dimensions, encoded image payload hashes and Chromium-decoded pixel hashes. The oversized-text fixture deliberately produces a partial result. The artificial-GPS JPEG keeps the same byte size even after GPS is removed.
- Full suite: 165 tests passed before the added Strict Mode integration case; the updated analytics test set then passed all 8 cases, including that additional case.
- TypeScript, ESLint and Next production build passed. No metadata core, auth API, billing API, provider configuration or quota enforcement logic changed.
- Browser report: `artifacts/content-evidence-qa/results.json` — 18 checks, 390/1440 widths, four downloadable sample pairs, actual workflow-file download identical to independently generated output, safe-batch ZIP summary 3 included / 1 needs review, no uncaught page errors and no production analytics requests.
- `artifacts/content-tests.log`, `artifacts/content-analytics-tests.log`, `artifacts/content-integration-tests.log`, `artifacts/content-lint.log`, `artifacts/content-typecheck.log`, `artifacts/content-build.log` retain check output.

## Analytics interpretation

| Event | Meaning |
| --- | --- |
| `metadata_article_view` | A known published article was opened. |
| `metadata_tool_link_click` | A marked article link to an allowlisted tool was clicked. |
| `metadata_select_files` / `metadata_scan_success` | Selection and successful inspection; use `source` to separate `sample` and `file`. |
| `metadata_clean_success` | Processing completed; does not alone prove all selected fields were removed. |
| `metadata_verify_success` / `metadata_verify_review` | Supported verification passed / unresolved findings remain. |
| `metadata_download_initiated` | A browser download action started; not proof that a file was saved or delivered. ZIP events are per included image, not one event per archive. |
| `metadata_checkout_started` | The website obtained a checkout URL; not payment success. |
| `metadata_paid_checkout_return` | A return page received a matching paid, unexpired active subscription from the production status API. Excludes pending/test states and deduplicates in the tab. Not a revenue ledger, a count of unique purchases or proof of a new customer. |

No file name, image bytes, raw prompt, GPS value, account email or order ID is added to these event payloads. Public route attribution is allowlisted and excludes query strings. The paid-return marker stores only plan/expiry in session storage; when storage is blocked, deduplication covers the page lifetime only. Real paid accounting remains the payment provider/database responsibility. GA4 default visit behavior and Clarity remain separate from the custom event transport.

## Remaining verification

- No actual original ComfyUI/ChatGPT export case study, large-file compatibility benchmark or physical iPhone test.
- No production GA4 ingestion/DebugView check, custom-dimension setup, Clarity recording review or real payment.
- No deployment or live SEO/AI-recommendation outcome claimed. Production account/resource confirmation is required before remote publication.

Sources checked for article/settings accuracy:

- https://docs.comfy.org/development/api-development/workflow-metadata
- https://help.openai.com/en/articles/8912793-provenance-signals-in-openai-generated-content
- https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-masking
