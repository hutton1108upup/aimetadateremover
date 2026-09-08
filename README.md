# ImageFinisher

ImageFinisher is a local-first image metadata workbench built with Next.js. It helps users inspect supported JPEG, PNG, and WebP metadata, remove supported AI workflow fields from a new copy, rescan the output, and download an evidence-backed result without uploading the image.

`ImageFinisher` is a working product name. The configured production origin is `https://aimetadateremover.pro`; the PRD does not lock a final brand name.

## Current scope

Available in this Phase 1 review build:

- browser-local JPEG, PNG, and WebP metadata inspection;
- supported prompt, workflow, model, seed, sampler, EXIF, XMP, ICC, GPS, PNG text, and provenance findings;
- AI Workflow Clean for supported JPEG and PNG structures;
- output rescan, verification report, JSON export, individual download, and ZIP download;
- desktop and mobile workspaces;
- public metadata education pages plus a noindex workspace.

Evidence-gated features:

- Privacy Clean supports EXIF GPS, capture dates, device IDs, MakerNote payloads and JPEG thumbnails (both TIFF byte orders); it preserves orientation and copyright. Nested SubIFDs, strip/tiled thumbnails, overlapping or malformed EXIF are rejected. It does not certify removal of all private data. Full Clean remains disabled;
- WebP cleaning is scan-only;
- JPEG and WebP Content Credentials removal is scan-only;
- the PNG remover is public and indexable after the supported PNG/EXIF compatibility and browser download gates passed;
- AI visual repair, authentication, billing, credits, storage, and pricing are not implemented.

The product does not claim detector bypass, guaranteed platform acceptance, or an AI probability score.

## Requirements

- Node.js 20.9 or newer
- npm
- Node Playwright and a Chromium browser for `npm run test:e2e`

## Local development

```powershell
npm.cmd install
npm.cmd run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production build

```powershell
npm.cmd run build
npm.cmd run start
```

Set `NEXT_PUBLIC_APP_URL` to the final HTTPS origin before a production deployment so canonical URLs, Open Graph metadata, robots, and the sitemap use the public domain.

## Verification

```powershell
npm.cmd run test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd run test:e2e
```

The browser QA script checks the public routes in desktop and mobile viewports, noindex and sitemap boundaries, an invalid-file recovery path, and a real PNG scan-clean-rescan-download flow without write or upload requests.

To test a production server on another origin:

```powershell
$env:BASE_URL = "http://127.0.0.1:4173"
npm.cmd run test:e2e
```

## Review routes

- `/`
- `/metadata-checker`
- `/remove-ai-detection-from-image`
- `/remove-metadata-from-png` — public supported PNG cleaner
- `/workspace` — noindex, nofollow
- `/guides`
- `/guides/image-metadata-before-publishing`
- `/about`
- `/privacy`
- `/terms`

## Privacy boundary

Phase 1 does not implement an image upload API. File bytes, file names, previews, prompts, GPS values, and raw metadata remain inside the browser session. The original file is never overwritten.

## Phase 1 reliability review

See [the local acceptance record](docs/phase1-review.md) for scope, reproducible checks, supported privacy-cleaning boundaries, and the separate GSC / remote analytics blockers.

```powershell
$env:BASE_URL = "http://127.0.0.1:3173"
node scripts/workspace_qa.mjs
node scripts/seo_qa.mjs
```

The workspace QA includes 195 MB desktop / 95 MB mobile-emulation batches. Generated fixtures, screenshots and JSON evidence are written to ignored `artifacts/phase1-review/`.
