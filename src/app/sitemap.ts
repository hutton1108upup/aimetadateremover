import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";
import { sitemapRoutes } from "@/lib/publishing";
import { guides } from "@/lib/guides";

const existingEditorialPaths = new Set(["/privacy", "/terms", "/pricing", "/blog", "/blog/image-metadata-before-publishing"]);
const brandRefreshPaths = new Set(["/", "/metadata-checker", "/remove-metadata-from-png", "/about"]);
const guideLastModified = new Map(guides.map((guide) => [`/blog/${guide.slug}`, guide.updatedIso]));

export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapRoutes.map((path) => ({
    url: new URL(path, siteUrl).toString(),
    lastModified: new Date(
      guideLastModified.get(path) ?? (existingEditorialPaths.has(path) ? "2026-09-18" :
      brandRefreshPaths.has(path) ? "2026-09-24" :
      ["/", "/metadata-checker", "/remove-metadata-from-png"].includes(path) ? "2026-09-08" :
      ["/remove-ai-detection-from-image"].includes(path) ? "2026-09-07" : "2026-09-04")
    ),
    changeFrequency: path === "/" ? "weekly" : "monthly",
  }));
}
