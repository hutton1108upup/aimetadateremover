import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";
import { sitemapRoutes } from "@/lib/publishing";
import { guides } from "@/lib/guides";

const existingEditorialPaths = new Set(["/privacy", "/terms", "/pricing", "/blog", "/blog/image-metadata-before-publishing"]);
const brandRefreshPaths = new Set(["/", "/metadata-checker", "/remove-metadata-from-png", "/about"]);
const contentRefreshPaths = new Set(["/", "/supported-formats"]);
const newToolPaths = new Set(["/batch-metadata-remover", "/supported-formats", "/comfyui-workflow-remover", "/stable-diffusion-metadata-remover", "/remove-metadata-from-jpeg", "/c2pa-metadata-checker", "/remove-gps-from-photo", "/pdf-metadata-remover", "/docx-metadata-remover"]);
const documentToolPaths = new Set(["/pdf-metadata-remover", "/docx-metadata-remover"]);
const guideLastModified = new Map(guides.map((guide) => [`/blog/${guide.slug}`, guide.updatedIso]));
const gscMvpPaths = new Set(["/", "/remove-ai-detection-from-image", "/batch-metadata-remover", "/remove-gps-from-photo", "/c2pa-metadata-checker", "/blog"]);

export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapRoutes.map((path) => ({
    url: new URL(path, siteUrl).toString(),
    lastModified: new Date(
      guideLastModified.get(path) ?? (contentRefreshPaths.has(path) ? "2026-10-21" : documentToolPaths.has(path) ? "2026-10-21" : gscMvpPaths.has(path) ? "2026-10-12" : newToolPaths.has(path) ? "2026-09-28" :
      existingEditorialPaths.has(path) ? "2026-09-18" :
      brandRefreshPaths.has(path) ? "2026-09-24" :
      ["/", "/metadata-checker", "/remove-metadata-from-png"].includes(path) ? "2026-09-08" :
      ["/remove-ai-detection-from-image"].includes(path) ? "2026-09-07" : "2026-09-04")
    ),
    changeFrequency: path === "/" ? "weekly" : "monthly",
  }));
}
