import type { Metadata } from "next";
import { routeData } from "./publishing";

export const productionOrigin = "https://aimetadateremover.pro";

export function resolveSiteUrl(configured = process.env.NEXT_PUBLIC_APP_URL, production = process.env.NODE_ENV === "production") {
  const url = new URL(configured?.trim() || productionOrigin);
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/" || !["http:", "https:"].includes(url.protocol)) {
    throw new Error("NEXT_PUBLIC_APP_URL must be an HTTP(S) origin without a path, query or credentials.");
  }
  if (production && url.origin !== productionOrigin) {
    throw new Error(`Production NEXT_PUBLIC_APP_URL must be ${productionOrigin}.`);
  }
  return url.origin;
}

export const siteUrl = resolveSiteUrl();
export const socialImage = { url: new URL("/images/metadata-cleaner-preview.png", siteUrl).toString(), width: 1200, height: 630, alt: "ImageFinisher metadata cleaner showing verification of the built-in PNG sample" };

export function metadataFor(path: string): Metadata {
  const page = routeData(path);
  const canonical = new URL(page.canonical, siteUrl).toString();
  return {
    title: { absolute: page.title }, description: page.description,
    alternates: { canonical },
    robots: page.indexable ? undefined : { index: false, follow: true },
    openGraph: { title: page.title, description: page.description, url: canonical, type: "website", siteName: "ImageFinisher", images: [socialImage] },
    twitter: { card: "summary_large_image", title: page.title, description: page.description, images: [socialImage] },
  };
}
