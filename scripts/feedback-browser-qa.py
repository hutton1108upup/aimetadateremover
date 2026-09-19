"""Local browser acceptance. Uses synthetic images; no external mail configuration."""
import json
import os
import struct
import zlib
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get("BASE_URL", "http://127.0.0.1:3180")
OUT = Path("artifacts/feedback")
OUT.mkdir(parents=True, exist_ok=True)
checks = []
errors = []

def passed(name):
    checks.append(name)
    print("PASS " + name, flush=True)

def chunk(kind, data):
    return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xffffffff)

fixture = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", 2, 2, 8, 2, 0, 0, 0)) + chunk(b"tEXt", b"parameters\0Steps: 20, Seed: 42, Sampler: Euler") + chunk(b"IDAT", zlib.compress(b"\0\xff\0\0\xff\0\0" * 2)) + chunk(b"IEND", b"")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    def create(width=1440, height=1000):
        context = browser.new_context(viewport={"width": width, "height": height})
        page = context.new_page()
        page.on("pageerror", lambda error: errors.append(str(error)))
        return context, page

    context, page = create()
    page.goto(BASE + "/feedback")
    page.wait_for_load_state("networkidle")
    expect(page.locator('meta[name="robots"]')).to_have_attribute("content", "noindex, follow")
    page.get_by_role("button", name="Submit feedback").click()
    expect(page.locator(".feedback-form").get_by_role("alert")).to_contain_text("at least one")
    page.get_by_text("More about you & other suggestions").click()
    page.get_by_label("Occupation or main role").select_option("designer")
    page.route("**/api/feedback", lambda route: route.abort("failed"))
    page.get_by_role("button", name="Submit feedback").click()
    expect(page.locator(".feedback-form").get_by_role("alert")).to_contain_text("answers are still here")
    expect(page.get_by_label("Occupation or main role")).to_have_value("designer")
    page.unroute("**/api/feedback")
    with page.expect_response("**/api/feedback") as response:
        page.get_by_role("button", name="Submit feedback").click()
    assert response.value.status in (200, 201), response.value.text()
    expect(page.get_by_role("status")).to_contain_text("feedback is received")
    page.screenshot(path=str(OUT / "feedback-received.png"), full_page=True)
    passed("Desktop: empty submission rejected, failed draft retained, occupation alone saved via actual local API")
    context.close()

    context, page = create(390, 844)
    page.goto(BASE + "/feedback")
    page.wait_for_load_state("networkidle")
    page.get_by_text("More about you & other suggestions").click()
    page.get_by_label("Age range").select_option(label="25–34")
    expect(page.get_by_role("checkbox")).not_to_be_checked()
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
    page.screenshot(path=str(OUT / "feedback-mobile-expanded.png"), full_page=True)
    with page.expect_response("**/api/feedback") as response:
        page.get_by_role("button", name="Submit feedback").click()
    assert response.value.status in (200, 201), response.value.text()
    expect(page.get_by_role("status")).to_contain_text("feedback is received")
    passed("Mobile 390px: no horizontal overflow, unchecked permission, age-only submission saved")
    context.close()

    context, page = create()
    page.clock.install()
    page.goto(BASE + "/workspace")
    page.wait_for_load_state("networkidle")
    expect(page.get_by_role("complementary", name="Share your experience")).to_have_count(0)
    page.clock.run_for(61000)
    expect(page.get_by_text("What brought you here today?")).to_be_visible()
    page.screenshot(path=str(OUT / "feedback-time-invitation.png"), full_page=True)
    page.get_by_role("button", name="Not now").click()
    page.reload()
    page.wait_for_load_state("networkidle")
    page.clock.run_for(70000)
    expect(page.get_by_role("complementary", name="Share your experience")).to_have_count(0)
    passed("60-second invitation and persisted dismissal verified using browser virtual clock")
    context.close()

    context, page = create()
    requests = []
    page.on("request", lambda request: requests.append((request.method, request.url)))
    page.goto(BASE + "/workspace")
    page.wait_for_load_state("networkidle")
    page.locator('input[type="file"]').set_input_files({"name": "synthetic-feedback-qa.png", "mimeType": "image/png", "buffer": fixture})
    download = page.get_by_role("button", name="Download clean copy", exact=True)
    expect(download).to_be_visible(timeout=20000)
    with page.expect_download():
        download.click()
    expect(page.get_by_text("Did you get what you needed?")).to_be_visible(timeout=7000)
    page.get_by_role("button", name="Share feedback", exact=True).click()
    expect(page.get_by_role("dialog", name="Share feedback")).to_be_visible()
    page.get_by_label("Partly", exact=True).check()
    prompt = page.get_by_label("What were you trying to do, and what is still unresolved?Optional", exact=True)
    expect(prompt).to_be_visible()
    prompt.fill("Synthetic review: batch workflow needs a folder picker.")
    page.screenshot(path=str(OUT / "feedback-download-dialog.png"))
    assert not [request for request in requests if request[0] == "POST"], requests
    page.keyboard.press("Escape")
    expect(page.get_by_role("dialog", name="Share feedback")).not_to_be_visible()
    passed("Actual synthetic image processed and downloaded; contextual survey opens after download; typing makes no POST")
    context.close()

    context, page = create(390, 844)
    page.goto(BASE + "/workspace")
    page.wait_for_load_state("networkidle")
    page.locator('input[type="file"]').set_input_files({"name": "invalid.png", "mimeType": "image/png", "buffer": b"invalid image"})
    page.get_by_role("button", name="Tell us what went wrong").click(timeout=15000)
    expect(page.get_by_role("dialog", name="Share feedback")).to_be_visible()
    expect(page.get_by_label("What were you trying to do, and where did you get stuck?Optional", exact=True)).to_be_visible()
    page.get_by_text("More about you & other suggestions").click()
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
    page.screenshot(path=str(OUT / "feedback-mobile-dialog.png"))
    page.get_by_role("button", name="Close feedback", exact=True).click()
    passed("Mobile failed-image manual feedback and close behavior work without waiting for timer")
    context.close()
    browser.close()

assert not errors, errors
passed("No browser page errors")
(OUT / "browser-qa.json").write_text(json.dumps({"base": BASE, "checks": checks, "passed": True, "realEmailSent": False, "pageErrors": errors}, indent=2), encoding="utf-8")
