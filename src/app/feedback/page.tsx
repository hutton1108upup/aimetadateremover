import type { Metadata } from "next";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { FeedbackForm } from "@/components/feedback/feedback-form";

export const metadata: Metadata = { title: "Share feedback", description: "Tell us what you need from ImageFinisher. Every question is optional.", robots: { index: false, follow: true } };
export default function FeedbackPage() {
  return <><PublicHeader /><main className="feedback-page"><div className="feedback-page-intro"><p className="eyebrow">Built around your experience</p><h1>A better tool starts with your feedback.</h1><p>A task you could not finish. An idea that would save time. We would like to hear it.</p></div><div className="feedback-page-card"><FeedbackForm trigger="manual" path="/feedback" /></div></main><PublicFooter /></>;
}
