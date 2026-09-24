import type { Metadata } from "next";
import { Inter, Noto_Serif_Display } from "next/font/google";
import "./globals.css";
import { siteUrl } from "@/lib/site";
import { routeData } from "@/lib/publishing";
import { brandName } from "@/lib/brand";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const notoSerif = Noto_Serif_Display({ variable: "--font-editorial", subsets: ["latin"], display: "swap", preload: false });
export const metadata: Metadata = { metadataBase: new URL(siteUrl), applicationName: brandName, appleWebApp: { title: brandName }, title: { default: routeData("/").title, template: `%s | ${brandName}` }, description: routeData("/").description };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" className={`${inter.variable} ${notoSerif.variable}`}><body>{children}</body></html>; }
