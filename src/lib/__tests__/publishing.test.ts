import { describe, expect, it } from "vitest";
import { publicRoutes, sitemapRoutes } from "../publishing";
import sitemap from "@/app/sitemap";
import nextConfig from "../../../next.config";

describe("Phase 1 publishing manifest", () => {
  it("publishes only complete public routes and excludes private or later-phase surfaces", () => {
    expect(sitemapRoutes).toEqual([
      "/",
      "/metadata-checker",
      "/remove-ai-detection-from-image",
      "/remove-metadata-from-png",
      "/batch-metadata-remover",
      "/supported-formats",
      "/comfyui-workflow-remover",
      "/stable-diffusion-metadata-remover",
      "/remove-metadata-from-jpeg",
      "/c2pa-metadata-checker",
      "/remove-gps-from-photo",
      "/blog",
      "/blog/chatgpt-dalle-image-metadata",
      "/blog/stable-diffusion-comfyui-metadata",
      "/blog/c2pa-content-credentials-explained",
      "/blog/exif-gps-privacy-before-sharing",
      "/blog/jpeg-png-webp-metadata-support",
      "/blog/image-metadata-before-publishing",
      "/pricing",
      "/about",
      "/privacy",
      "/terms",
    ]);
    expect(publicRoutes.map((route) => route.path)).not.toEqual(expect.arrayContaining(["/workspace", "/ai-image-humanizer", "/remove-ai-look"]));
    expect(publicRoutes.find((route) => route.path === "/remove-metadata-from-png")?.indexable).toBe(true);
  });

  it("gives every public route independent page metadata", () => {
    for (const route of publicRoutes) {
      expect(route.title).toBeTruthy();
      expect(route.description).toBeTruthy();
      expect(route.h1).toBeTruthy();
      expect(route.canonical).toBe(route.path);
    }
    expect(new Set(publicRoutes.map((route) => route.title)).size).toBe(publicRoutes.length);
    expect(new Set(publicRoutes.map((route) => route.h1)).size).toBe(publicRoutes.length);
  });

  it("uses the last substantive route update for sitemap lastModified", () => {
    const entries = new Map(sitemap().map((entry) => [new URL(entry.url).pathname, entry]));
    for (const path of ["/", "/metadata-checker", "/remove-metadata-from-png", "/about"]) {
      expect(new Date(entries.get(path)?.lastModified ?? "").toISOString()).toBe("2026-09-24T00:00:00.000Z");
    }
    for (const path of ["/blog/chatgpt-dalle-image-metadata"]) {
      expect(new Date(entries.get(path)?.lastModified ?? "").toISOString()).toBe("2026-09-20T00:00:00.000Z");
    }
    for (const path of ["/privacy", "/terms", "/pricing", "/blog"]) {
      expect(new Date(entries.get(path)?.lastModified ?? "").toISOString()).toBe("2026-09-18T00:00:00.000Z");
    }
    for (const path of ["/blog/stable-diffusion-comfyui-metadata", "/blog/c2pa-content-credentials-explained", "/blog/exif-gps-privacy-before-sharing", "/blog/jpeg-png-webp-metadata-support", "/blog/image-metadata-before-publishing"]) {
      expect(new Date(entries.get(path)?.lastModified ?? "").toISOString()).toBe("2026-09-28T00:00:00.000Z");
    }
    for (const path of ["/batch-metadata-remover", "/comfyui-workflow-remover", "/stable-diffusion-metadata-remover", "/remove-metadata-from-jpeg", "/supported-formats", "/c2pa-metadata-checker", "/remove-gps-from-photo"]) {
      expect(new Date(entries.get(path)?.lastModified ?? "").toISOString()).toBe("2026-09-28T00:00:00.000Z");
    }
    expect(entries.has("/workspace")).toBe(false);
  });

  it("does not publish legacy Guides paths", () => {
    expect(sitemapRoutes.some((path) => path === "/guides" || path.startsWith("/guides/"))).toBe(false);
  });

  it("redirects legacy Guides routes to the matching Blog routes", async () => {
    const redirects = await nextConfig.redirects?.();
    expect(redirects).toEqual(expect.arrayContaining([
      { source: "/guides", destination: "/blog", permanent: true },
      { source: "/guides/:slug", destination: "/blog/:slug", permanent: true },
    ]));
  });
});
