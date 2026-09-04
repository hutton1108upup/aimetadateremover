import type { MetadataRoute } from "next"; import { sitemapRoutes } from "@/lib/publishing"; import { siteUrl } from "@/lib/site";
export default function sitemap():MetadataRoute.Sitemap{return sitemapRoutes.map((path)=>({url:new URL(path,siteUrl).toString(),lastModified:new Date("2026-09-04"),changeFrequency:path==="/"?"weekly":"monthly"}))}
