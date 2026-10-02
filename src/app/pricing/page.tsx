import Link from "next/link";
import { ArrowRight, FolderOpen, LockKeyhole, ShieldCheck } from "lucide-react";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { SupportContact } from "@/components/layout/support-contact";
import { BillingPanel } from "@/components/pricing/billing-panel";
import { PlanCard } from "@/components/pricing/plan-card";
import { FAQSection } from "@/components/marketing/faq-section";
import { metadataFor } from "@/lib/site";
import { pricing } from "@/lib/pricing";

export const metadata = metadataFor("/pricing");

const faqs = [
  { question: "What does Free include?", answer: "Guests receive 1 single-image clean per day. After Google sign-in, Free includes 5 single-image cleans per day in total, with no batch processing. Google sign-in is required for the 5-image allowance, and no credit card is needed." },
  { question: "How much does Pro cost?", answer: "Pro Monthly is $4.90 for the first 30 days, then $9.90 per month. Pro Yearly is $49.90 for the first 365 days, then $89.90 per year. Your checkout shows the total due and next renewal date before you pay." },
  { question: "What does Pro include?", answer: "Both Pro plans include unlimited daily image count and batches of up to 10 photos. Yearly also includes up to 30 images per processing session across three batches. Cleaning and verification stay in your browser on every plan." },
  { question: "What image formats are supported?", answer: "JPEG and PNG cleaning are supported. WebP inspection is available, but WebP cleaning is not. Processing stays in your browser and the original file remains unchanged." },
  { question: "Do you upload my images?", answer: "No. Inspection, cleaning and verification stay in your browser. Original files remain unchanged, and the cleaned result is a separate copy. WebP remains inspection-only." },
  { question: "Can I cancel a Pro subscription?", answer: "Yes. Cancel before your next renewal to stop future charges. Your Pro access continues through the end of the paid period. The renewal price and date are shown before you pay." },
];

const rows = [
  ["Daily image count", "5 photos/day", "Unlimited", "Unlimited"],
  ["Batch processing", "Not included", "Up to 10 photos/batch", "Up to 10 photos/batch"],
  ["Processing session", "Not specified", "Not specified", "Up to 30 images across 3 batches"],
  ["Batch ZIP download", "Not included", "Included", "Included"],
  ["Price", "Forever free", "$4.90 first 30 days; then $9.90/month", "$49.90 first 365 days; then $89.90/year"],
  ["Subscription controls", "No subscription", "Cancel future renewals", "Cancel future renewals"],
  ["Support", "Email support", "Email support", "Email support"],
  ["Supported cleaning", "JPEG and PNG", "JPEG and PNG", "JPEG and PNG"],
  ["WebP", "Inspection only", "Inspection only", "Inspection only"],
];

export default function PricingPage() {
  return <><PublicHeader /><main className="pricing-page">
    <section className="pricing-hero"><div className="page-container">
      <Breadcrumbs current="Pricing" />
      <div className="pricing-intro"><p className="eyebrow">Simple plans. Private by design.</p><h1>A little cleanup.<br />Or a whole batch.</h1><p>Clean a few images free, or choose Pro for recurring batch work. Your images stay in your browser.</p></div>
      <div className="pricing-plans">
        <PlanCard label="FREE FOREVER" name="Free" audience="For everyday image cleanup." price="$0" priceNote="forever free" allowance={`${pricing.free.dailyImageLimit} photos / day`} allowanceNote="No batch processing" features={["5/day with Google; guests 1/day", "No credit card", "JPEG & PNG cleaning", "WebP inspection"]} action={<Link className="button primary" href="/workspace">Use the workspace <ArrowRight size={16} aria-hidden="true" /></Link>} />
        <PlanCard featured label="MONTHLY PLAN" name="Pro Monthly" audience="For recurring batch workflows." price={`$${pricing.pro.monthly.firstPurchaseAmountUsd}`} regularPrice={`$${pricing.pro.monthly.standardAmountUsd}`} priceNote={`First 30 days · then $${pricing.pro.monthly.standardAmountUsd}/month`} allowance="Unlimited daily image count" allowanceNote="Up to 10 photos per batch" features={["Batch ZIP downloads", "Cancel future renewals", "JPEG & PNG cleaning; WebP inspection only"]} action={<BillingPanel compact plan="monthly" />} />
        <PlanCard label="BEST VALUE" name="Pro Yearly" audience="For teams that prefer annual billing." price={`$${pricing.pro.yearly.firstYearAmountUsd}`} regularPrice={`$${pricing.pro.yearly.standardAmountUsd}`} priceNote={`First 365 days · then $${pricing.pro.yearly.standardAmountUsd}/year`} allowance="Unlimited daily image count" allowanceNote="Up to 10 photos per batch" features={["Up to 30 images per session across three batches", "Batch ZIP downloads", "Cancel future renewals", "JPEG & PNG cleaning; WebP inspection only"]} action={<BillingPanel compact plan="yearly" />} />
      </div>
      <p className="pricing-fineprint">Each Google account may use the monthly offer once and the yearly offer once. The introductory periods last 30 and 365 days respectively; later renewals are billed per calendar month or year at the standard price. Canceling, refunding or switching plans does not reset an offer. Daily free allowances reset at 00:00 UTC.</p>
      <div className="pricing-trust"><span><LockKeyhole size={16} aria-hidden="true" />No image uploads</span><span><ShieldCheck size={16} aria-hidden="true" />Originals preserved</span><span><FolderOpen size={16} aria-hidden="true" />Batch-ready workflow</span></div>
    </div></section>
    <section className="section section-alt pricing-comparison"><div className="page-container"><p className="eyebrow">The details, side by side</p><h2>Choose the workflow you need.</h2><div className="pricing-table-wrap" role="region" aria-label="Plan comparison, scroll horizontally on smaller screens" tabIndex={0}><table className="pricing-table"><caption>Plan features and supported image formats.</caption><thead><tr><th scope="col">Feature</th><th scope="col">Free</th><th scope="col">Pro Monthly</th><th scope="col">Pro Yearly</th></tr></thead><tbody>{rows.map(([feature, ...values]) => <tr key={feature}><th scope="row">{feature}</th>{values.map((value, index) => <td key={index}>{value}</td>)}</tr>)}</tbody></table></div><p className="pricing-contact">Need a plan detail clarified? <SupportContact subject="AI Metadata Remover pricing question" />.</p></div></section>
    <FAQSection title="Before you choose a plan" items={faqs} />
  </main><PublicFooter /></>;
}
