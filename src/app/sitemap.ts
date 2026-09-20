import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";
import { sitemapRoutes } from "@/lib/publishing";
import { guides } from "@/lib/guides";

const refreshedGuidePaths = new Set(guides.filter((guide) => guide.slug !== "image-metadata-before-publishing").map((guide) => `/guides/${guide.slug}`));
const existingEditorialPaths = new Set(["/privacy", "/terms", "/pricing", "/guides", "/guides/image-metadata-before-publishing"]);

export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapRoutes.map((path) => ({
    url: new URL(path, siteUrl).toString(),
    lastModified: new Date(
      refreshedGuidePaths.has(path) ? "2026-09-20" :
      existingEditorialPaths.has(path) ? "2026-09-18" :
      ["/", "/metadata-checker", "/remove-metadata-from-png"].includes(path) ? "2026-09-08" :
      ["/remove-ai-detection-from-image"].includes(path) ? "2026-09-07" : "2026-09-04"
    ),
    changeFrequency: path === "/" ? "weekly" : "monthly",
  }));
}
