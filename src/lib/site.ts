import type { Metadata } from "next";
import { routeData } from "./publishing";
export const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
export function metadataFor(path: string): Metadata { const page = routeData(path); return { title: { absolute: page.title }, description: page.description, alternates: { canonical: page.canonical }, robots: page.indexable ? undefined : { index: false, follow: true }, openGraph: { title: page.title, description: page.description, url: page.canonical, type: "website" } }; }
