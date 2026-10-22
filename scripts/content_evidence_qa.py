"""Local UI checks; billing responses are mocked, processing and downloads are real."""
import json
import os
from pathlib import Path
import zipfile
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "artifacts" / "content-evidence-qa"
OUT.mkdir(parents=True, exist_ok=True)
BASE = os.environ.get("BASE_URL", "http://127.0.0.1:3197")
assert BASE.startswith(("http://127.0.0.1:", "http://localhost:")), "Local preview only"
SLUGS = ["stable-diffusion-comfyui-metadata", "chatgpt-dalle-image-metadata", "image-metadata-before-publishing", "batch-remove-image-metadata-client-delivery"]
checks = []
errors = []
requests = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    try:
        context = browser.new_context(viewport={"width": 1440, "height": 1000}, accept_downloads=True)
        def account_mock(route):
            url = route.request.url
            if "/api/billing/usage" in url:
                route.fulfill(json={"allowZip": True})
            elif "/api/billing/status" in url:
                route.fulfill(json={"enabled": True, "checkoutEnabled": True, "environment": "test", "signedIn": False, "plan": "Guest", "unlimited": False, "singleRemaining": 1, "singleLimit": 1, "batchLimit": 0, "batchRemaining": 0, "subscriptions": []})
            elif "/api/auth/get-session" in url:
                route.fulfill(json=None, body="null", content_type="application/json")
            else:
                route.fulfill(json={"enabled": False})
        context.route("**/api/**", account_mock)
        context.add_init_script("window.__contentEvents=[]; window.addEventListener('imagefinisher:funnel', e => { if(e.detail) window.__contentEvents.push(e.detail); });")
        page = context.new_page()
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("request", lambda request: requests.append(request.url))
        for width in [390, 1440]:
            page.set_viewport_size({"width": width, "height": 900})
            for route in [*[f"/blog/{slug}" for slug in SLUGS], "/batch-metadata-remover", "/remove-metadata-from-png", "/privacy", "/blog"]:
                response = page.goto(BASE + route, wait_until="networkidle")
                assert response.status == 200, (route, response.status)
                expect(page.locator("h1")).to_have_count(1)
                assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), (route, width, "horizontal overflow")
                if route.startswith("/blog/"):
                    assert page.locator('link[rel="canonical"]').get_attribute("href") == "https://aimetadataremover.pro" + route
                    expect(page.locator('a[data-article-tool]').first).to_be_visible()
                    assert page.locator('script[type="application/ld+json"]').count() >= 1
                if route == "/privacy":
                    text = page.locator("main").inner_text()
                    assert "has no such integration" not in text
                    assert "remote session replay" not in text
                    assert "October 22, 2026" in text
                checks.append({"path": route, "width": width, "http": 200, "overflow": False})
            page.goto(BASE + "/blog/image-metadata-before-publishing", wait_until="networkidle")
            page.screenshot(path=str(OUT / f"guide-{width}.png"), full_page=True)
            page.goto(BASE + "/batch-metadata-remover", wait_until="networkidle")
            expect(page.get_by_text("Batch cleaning and ZIP downloads require Pro.", exact=False).first).to_be_visible()
            page.screenshot(path=str(OUT / f"batch-{width}.png"), full_page=True)

        page.set_viewport_size({"width": 390, "height": 844})
        page.goto(BASE + "/blog/stable-diffusion-comfyui-metadata", wait_until="networkidle")
        page.get_by_role("link", name="Clean a ComfyUI PNG", exact=False).first.click()
        page.wait_for_url("**/comfyui-workflow-remover")
        page.wait_for_load_state("networkidle")
        expect(page.locator('[aria-label="Local image metadata workspace"]')).to_have_attribute("data-clarity-mask", "true")
        page.locator('input[type="file"]').set_input_files(str(ROOT / "public/samples/metadata-evidence/workflow-png-original.png"))
        expect(page.get_by_role("heading", name="Cleaning complete", exact=True)).to_be_visible(timeout=20000)
        with page.expect_download() as download_info:
            page.get_by_role("button", name="Download clean copy", exact=True).click()
        downloaded = OUT / "workflow-browser-cleaned.png"
        download_info.value.save_as(str(downloaded))
        assert downloaded.read_bytes() == (ROOT / "public/samples/metadata-evidence/workflow-png-cleaned.png").read_bytes()
        events = page.evaluate("window.__contentEvents")
        names = {event["event"] for event in events}
        assert {"article_view", "tool_link_click", "select_files", "clean_success", "verify_success", "download_initiated"} <= names, names
        assert any(event["event"] == "download_initiated" and event.get("source") == "file" for event in events)
        assert "workflow-png-original" not in json.dumps(events)
        checks.append({"flow": "article-to-tool-to-real-local-processing-to-download", "billing": "mocked", "outputMatchesFixture": True})
        page.screenshot(path=str(OUT / "mobile-workflow-result.png"), full_page=True)

        page.goto(BASE + "/batch-metadata-remover", wait_until="networkidle")
        page.get_by_role("button", name="Try a safe batch", exact=True).click()
        zip_button = page.get_by_role("button", name="Download completed images (ZIP)", exact=True)
        expect(zip_button).to_be_enabled(timeout=20000)
        expect(page.get_by_text("3 of 3 files included", exact=False)).to_be_visible(timeout=20000)
        with page.expect_download() as zip_info:
            zip_button.click()
        archive = OUT / "safe-batch.zip"
        zip_info.value.save_as(str(archive))
        with zipfile.ZipFile(archive) as zipped:
            summary = json.loads(zipped.read("batch-results.json"))
            assert summary["summary"] == {"selected": 3, "included": 3, "needsReview": 1, "excluded": 0}, summary
        assert any(event.get("source") == "sample" and event["event"] == "verify_review" for event in page.evaluate("window.__contentEvents"))
        checks.append({"flow": "safe-batch-zip", "summary": summary["summary"]})

        report_response = context.request.get(BASE + "/samples/metadata-evidence/report.json")
        assert report_response.status == 200
        report = report_response.json()
        for sample in report["samples"]:
            for key in ["original", "cleaned"]:
                assert context.request.get(BASE + sample[key]).status == 200
        sitemap = context.request.get(BASE + "/sitemap.xml").text()
        for slug in SLUGS:
            assert f"https://aimetadataremover.pro/blog/{slug}" in sitemap
        assert "https://aimetadataremover.pro/workspace" not in sitemap
        assert not any("google-analytics.com" in url or "googletagmanager.com" in url or "clarity.ms" in url for url in requests), "Local preview sent production analytics"
        assert not errors, errors
        result = {"checks": checks, "downloadableSamples": len(report["samples"]), "uncaughtErrors": errors, "productionAnalyticsRequests": 0, "scope": "Chromium desktop/mobile viewport simulation; mocked account endpoints; actual browser image worker and downloads. No real payment, GA4 ingestion, iPhone or production deployment tested."}
        (OUT / "results.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
        print(json.dumps({"checks": len(checks), "samplePairs": len(report["samples"]), "errors": len(errors), "report": str(OUT / "results.json")}))
    finally:
        browser.close()
