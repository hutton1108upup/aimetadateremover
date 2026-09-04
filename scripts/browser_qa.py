import os
import base64
import binascii
import struct
import sys
import zlib
from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE_URL", "http://127.0.0.1:3000")
ROUTES = {
    "/": "Inspect and Clean AI Metadata Before You Publish",
    "/metadata-checker": "Check What Metadata Is Hidden in Your Image",
    "/remove-ai-detection-from-image": "Understand and Clean File-Level AI Signals",
    "/remove-metadata-from-png": "Remove Metadata From PNG Images",
    "/guides": "Practical Image Metadata Guides",
    "/guides/image-metadata-before-publishing": "What Image Metadata Should You Review Before Publishing?",
    "/about": "A More Honest Image Handoff Workflow",
    "/privacy": "Your Image Stays in This Browser Session",
    "/terms": "Terms for Using the Metadata Tools",
    "/workspace": "Publish-ready workspace",
}

def require(condition, message):
    if not condition:
        raise AssertionError(message)

def png_chunk(kind, data):
    return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", binascii.crc32(kind + data) & 0xFFFFFFFF)

def sample_png():
    base = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=")
    return base[:-12] + png_chunk(b"tEXt", b"parameters\x00steps=30 seed=42") + base[-12:]

def assert_clean_png(data):
    require(data.startswith(b"\x89PNG\r\n\x1a\n"), "download is not a PNG")
    offset = 8
    idat = []
    while offset < len(data):
        length = struct.unpack(">I", data[offset:offset+4])[0]
        kind = data[offset+4:offset+8]
        payload = data[offset+8:offset+8+length]
        crc = struct.unpack(">I", data[offset+8+length:offset+12+length])[0]
        require(crc == (binascii.crc32(kind + payload) & 0xFFFFFFFF), f"invalid {kind!r} CRC")
        require(not (kind == b"tEXt" and payload.startswith(b"parameters\x00")), "target parameters metadata remained")
        if kind == b"IDAT": idat.append(payload)
        offset += 12 + length
    require(bool(zlib.decompress(b"".join(idat))), "encoded image payload is not decodable")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    desktop = browser.new_context(viewport={"width": 1440, "height": 900})
    page = desktop.new_page()
    console_errors = []
    page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)

    for route, heading in ROUTES.items():
        response = page.goto(BASE + route, wait_until="networkidle")
        require(response is not None and response.status == 200, f"{route} did not return HTTP 200")
        require(page.get_by_role("heading", name=heading, exact=True).first.is_visible(), f"{route} is missing its expected H1")
        print(f"PASS route {route}")

    page.goto(BASE + "/workspace", wait_until="networkidle")
    robots = page.locator('meta[name="robots"]').get_attribute("content") or ""
    require("noindex" in robots and "nofollow" in robots, "workspace must be noindex, nofollow")

    sitemap = desktop.request.get(BASE + "/sitemap.xml")
    require(sitemap.status == 200, "sitemap did not return HTTP 200")
    sitemap_text = sitemap.text()
    require("/workspace" not in sitemap_text and "/pricing" not in sitemap_text and "/ai-image-humanizer" not in sitemap_text, "sitemap exposed private or later-phase routes")

    page.goto(BASE + "/metadata-checker", wait_until="networkidle")
    outbound_processing = []
    page.on("request", lambda request: outbound_processing.append(request.url) if request.method != "GET" or "/api/" in request.url else None)
    starting_url = page.url
    page.get_by_label("Choose JPG, PNG, or WebP images").set_input_files({"name": "not-really.png", "mimeType": "image/png", "buffer": b"not image bytes"})
    page.locator(".error-banner").wait_for()
    require(page.url == starting_url, "file selection changed the public route")
    require(not outbound_processing, f"local processing made an unexpected write/API request: {outbound_processing}")
    require(page.get_by_role("button", name="Add images").is_visible(), "a failed file blocked the next selection")

    page.goto(BASE + "/remove-metadata-from-png", wait_until="networkidle")
    successful_requests = []
    page.on("request", lambda request: successful_requests.append(request.url) if request.method != "GET" or "/api/" in request.url else None)
    page.get_by_label("Choose JPG, PNG, or WebP images").set_input_files({"name": "workflow.png", "mimeType": "image/png", "buffer": sample_png()})
    page.wait_for_timeout(2000)
    status_text = page.locator(".preview-panel > p").text_content() or ""
    require("1 finding" in status_text, "valid PNG did not finish scanning; status=" + status_text + "; console=" + " | ".join(console_errors))
    require(page.locator(".error-banner").count() == 0, "valid PNG failed")
    page.get_by_role("tab", name="clean").click()
    page.get_by_role("button", name="Create clean copy").click()
    page.get_by_role("button", name="Download clean copy").wait_for()
    with page.expect_download() as download_info:
        page.get_by_role("button", name="Download clean copy").click()
    assert_clean_png(open(download_info.value.path(), "rb").read())
    require(not successful_requests, f"successful local clean made an unexpected write/API request: {successful_requests}")

    mobile = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True)
    mobile_page = mobile.new_page()
    mobile_page.goto(BASE + "/workspace", wait_until="networkidle")
    overflow = mobile_page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
    require(overflow <= 1, f"mobile workspace overflows horizontally by {overflow}px")
    require(mobile_page.get_by_text("Files stay in this browser session").is_visible(), "mobile privacy state is not visible")

    require(not console_errors, "browser console errors: " + " | ".join(console_errors))
    mobile.close()
    desktop.close()
    browser.close()
    print(f"PASS browser QA routes={len(ROUTES)} viewports=2 privacy=local-only")
