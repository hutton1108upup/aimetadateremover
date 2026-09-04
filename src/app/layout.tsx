import type { Metadata } from "next";
import { Inter, Noto_Serif_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const notoSerif = Noto_Serif_Display({ variable: "--font-editorial", subsets: ["latin"], display: "swap", preload: false });
export const metadata: Metadata = { metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"), title: { default: "AI Metadata Cleaner & Remover — Free, Private Tool", template: "%s | ImageFinisher" }, description: "Inspect and remove prompts, workflows, GPS, EXIF, XMP, IPTC and optional C2PA from images locally. Free metadata tools; visual repair is not available yet." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" className={`${inter.variable} ${notoSerif.variable}`}><body>{children}</body></html>; }
