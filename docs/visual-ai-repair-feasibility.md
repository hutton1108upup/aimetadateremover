# Visual AI Repair: one-scene validation gate

Status: internal evaluation specification. No customer-facing AI Repair feature or paid promise is enabled by this document.

## First scene

Repair small visible defects in an AI-generated still image before a client handoff: distorted fingers, doubled accessories, or a broken edge in a selected region. Keep the rest of the image and the subject identity stable. This is pixel editing, separate from browser-local metadata cleaning.

## Test set and comparison

- Collect 30 licensed or self-created images with a clear defect and an allowed target crop: 10 hands, 10 accessories, 10 object edges. Record the source license, original dimensions, crop box and a human-written success criterion for each.
- Run each image through the candidate service three times with the same task instructions. Save request duration, input and output pixel counts, provider charge, failure/retry count and output file size. Do not send these test images to a service until its storage, retention and training terms have been reviewed.
- Blind-review outputs alongside the original. Two reviewers score whether the target defect improved, whether the rest of the image changed, and whether new artifacts appeared. Resolve disagreements by inspecting the full-size image, not a thumbnail.
- Measure the median and 95th percentile processing time and the actual cost per accepted output, including retries. A result with a low per-call price but repeated failures is not viable.

## Go / no-go gate

Proceed to an internal prototype only if at least 24 of 30 images improve on the named defect, at least 27 of 30 preserve the rest of the composition acceptably, no output introduces a critical new defect, and cost plus latency fit a price that can be shown before purchase. A failure in any gate means refine the scene or provider and repeat the test set before promising the feature publicly.

## Product boundary after a pass

The repair flow would need an explicit upload disclosure, separate consent to the chosen provider, output review before download, server-enforced usage/cost limits, and deletion/retention behavior. None of those conditions are met by the current metadata workbench, whose image cleaning remains local to the browser.
