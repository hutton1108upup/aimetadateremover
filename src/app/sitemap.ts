import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";
import { sitemapRoutes } from "@/lib/publishing";

export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapRoutes.map((path) => ({
    url: new URL(path, siteUrl).toString(),
    lastModified: new Date(
      ["/privacy", "/terms"].includes(path) ? "2026-09-17" :
      ["/", "/metadata-checker", "/remove-metadata-from-png", "/guides/image-metadata-before-publishing"].includes(path) ? "2026-09-08" :
      ["/remove-ai-detection-from-image"].includes(path) ? "2026-09-07" : "2026-09-04"
    ),
    changeFrequency: path === "/" ? "weekly" : "monthly",
  }));
}
