import Link from "next/link";
import { ArrowRight, FolderOpen, LockKeyhole, ShieldCheck } from "lucide-react";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { SupportContact } from "@/components/layout/support-contact";
import { PlanCard } from "@/components/pricing/plan-card";
import { FAQSection } from "@/components/marketing/faq-section";
import { metadataFor } from "@/lib/site";
import { pricing } from "@/lib/pricing";

export const metadata = metadataFor("/pricing");

const faqs = [
  { question: "What does Free include?", answer: "Free is forever free with 5 photos per day, no batch processing, one-click Google sign-in, no credit card and standard processing speed." },
  { question: "How much does Pro cost?", answer: "Pro Monthly is $9.90/month, with a first-purchase offer of $4.90/month. Pro Yearly is $89.90/year, with a first-year offer of $49.90/year. Later renewals use the standard price under the checkout terms." },
  { question: "What does Pro include?", answer: "Both Pro plans include unlimited daily image count, batches of up to 10 photos and priority execution. Yearly also includes up to 30 images per processing session across up to three 10-image batches, cancel or change subscription controls and VIP support." },
  { question: "What image formats are supported?", answer: "JPEG and PNG cleaning are supported. WebP inspection is available, but WebP cleaning is not. Processing stays in your browser and the original file remains unchanged." },
  { question: "Do you upload my images?", answer: "No. Inspection, cleaning and verification stay in your browser. Original files remain unchanged, and the cleaned result is a separate copy. WebP remains inspection-only." },
];

const rows = [
  ["Daily image count", "5 photos/day", "Unlimited", "Unlimited"],
  ["Batch processing", "Not included", "Up to 10 photos/batch", "Up to 10 photos/batch"],
  ["Processing session", "Not specified", "Not specified", "Up to 30 images across 3 batches"],
  ["Execution speed", "Standard", "Priority", "Priority"],
  ["Price", "Forever free", "$9.90/month; first purchase $4.90", "$89.90/year; first year $49.90"],
  ["Subscription controls", "No subscription", "Cancel anytime", "Cancel or change"],
  ["Support", "Standard", "Standard", "VIP support"],
  ["Supported cleaning", "JPEG and PNG", "JPEG and PNG", "JPEG and PNG"],
  ["WebP", "Inspection only", "Inspection only", "Inspection only"],
];

export default function PricingPage() {
  return <><PublicHeader /><main className="pricing-page">
    <section className="pricing-hero"><div className="page-container">
      <Breadcrumbs current="Pricing" />
      <div className="pricing-intro"><p className="eyebrow">Simple plans. Private by design.</p><h1>A little cleanup.<br />Or a whole batch.</h1><p>Choose the plan that fits your image cleanup workflow. Your images stay in your browser.</p></div>
      <div className="pricing-plans">
        <PlanCard label="FREE FOREVER" name="Free" audience="For everyday image cleanup." price="$0" priceNote="forever free" allowance={`${pricing.free.dailyImageLimit} photos / day`} allowanceNote="No batch processing" features={["One-click Google sign-in", "No credit card", "Standard processing speed", "JPEG & PNG cleaning; WebP inspection only"]} action={<Link className="button primary" href="/workspace">Use the workspace <ArrowRight size={16} aria-hidden="true" /></Link>} />
        <PlanCard featured label="MOST POPULAR" name="Pro Monthly" audience="For recurring batch workflows." price={`$${pricing.pro.monthly.standardAmountUsd}`} priceNote={`USD / month · first purchase $${pricing.pro.monthly.firstPurchaseAmountUsd}`} allowance="Unlimited daily image count" allowanceNote="Up to 10 photos per batch" features={["Priority execution", "Cancel anytime", "JPEG & PNG cleaning; WebP inspection only"]} />
        <PlanCard label="BEST VALUE" name="Pro Yearly" audience="For teams that prefer annual billing." price={`$${pricing.pro.yearly.standardAmountUsd}`} priceNote={`USD / year · first year $${pricing.pro.yearly.firstYearAmountUsd}`} allowance="Unlimited daily image count" allowanceNote="Up to 10 photos per batch" features={["Up to 30 images per session across three batches", "Priority execution", "Cancel or change subscription", "VIP support"]} />
      </div>
      <p className="pricing-fineprint">Offer prices apply to the first purchase or first year. Later renewals use the standard price under the checkout terms.</p>
      <div className="pricing-trust"><span><LockKeyhole size={16} aria-hidden="true" />No image uploads</span><span><ShieldCheck size={16} aria-hidden="true" />Originals preserved</span><span><FolderOpen size={16} aria-hidden="true" />Batch-ready workflow</span></div>
    </div></section>
    <section className="section section-alt pricing-comparison"><div className="page-container"><p className="eyebrow">The details, side by side</p><h2>Choose the workflow you need.</h2><div className="pricing-table-wrap" role="region" aria-label="Plan comparison, scroll horizontally on smaller screens" tabIndex={0}><table className="pricing-table"><caption>Plan features and supported image formats.</caption><thead><tr><th scope="col">Feature</th><th scope="col">Free</th><th scope="col">Pro Monthly</th><th scope="col">Pro Yearly</th></tr></thead><tbody>{rows.map(([feature, ...values]) => <tr key={feature}><th scope="row">{feature}</th>{values.map((value, index) => <td key={index}>{value}</td>)}</tr>)}</tbody></table></div><p className="pricing-contact">Need a plan detail clarified? <SupportContact subject="AI Metadata Remover pricing question" />.</p></div></section>
    <FAQSection title="Before you choose a plan" items={faqs} />
  </main><PublicFooter /></>;
}
