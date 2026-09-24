import type { Metadata } from "next";
import { Inter, Noto_Serif_Display } from "next/font/google";
import "./globals.css";
import "@/components/feedback/feedback.css";
import { FeedbackWidget } from "@/components/feedback/feedback-widget";
import { siteUrl } from "@/lib/site";
import { routeData } from "@/lib/publishing";
import { brandName } from "@/lib/brand";
import { AnalyticsConsent } from "@/components/analytics/analytics-consent";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const notoSerif = Noto_Serif_Display({ variable: "--font-editorial", subsets: ["latin"], display: "swap", preload: false });
const googleVerification = process.env.NEXT_PUBLIC_GSC_VERIFICATION?.trim();
export const metadata: Metadata = { metadataBase: new URL(siteUrl), applicationName: brandName, appleWebApp: { title: brandName }, title: { default: routeData("/").title, template: `%s | ${brandName}` }, description: routeData("/").description, ...(googleVerification ? { verification: { google: googleVerification } } : {}) };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" className={`${inter.variable} ${notoSerif.variable}`}><body>{children}<FeedbackWidget /><AnalyticsConsent /></body></html>; }
