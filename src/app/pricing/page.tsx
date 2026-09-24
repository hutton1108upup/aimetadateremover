import Link from "next/link";
import { ArrowRight, Clock3, Info, LockKeyhole, ShieldCheck } from "lucide-react";
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
  { question: "Can I use AI Metadata Remover without an account?", answer: "Yes. The Guest plan is designed for one free single-image clean per day. A free Google account increases that allowance to three single-image cleans per day in total, not four. Metadata inspection is free on every plan." },
  { question: "What counts as a batch task?", answer: "One batch task processes one selected group of JPEG or PNG images with one set of cleaning options and prepares a ZIP download. The limit is 30 images and 200 MB on desktop, or 10 images and 100 MB on mobile. Each image must be 25 MB or smaller. A single-image run on Batch Pro also counts as one task; your three free single-image cleans remain available separately." },
  { question: "When do daily allowances reset?", answer: "The planned allowances reset at 00:00 UTC each day (08:00 in China and Singapore). Unused daily allowances do not roll over. Your daily reset is separate from the paid plan’s 30-day renewal cycle." },
  { question: "Is $4.99 the price per day?", answer: "No. Batch Pro costs USD 4.99 for each 30-day period, with up to 20 batch tasks on each day while the subscription is active. It renews automatically every 30 days unless canceled. This is a fixed 30-day cycle, rather than renewal on the same date of each calendar month. Applicable taxes will be shown before payment." },
  { question: "How will cancellation and refunds work?", answer: "Once subscriptions open, online cancellation must be available in account billing before the next renewal. Canceling stops future charges; access continues until the end of the paid period. The planned policy allows a full refund for the first purchase within seven days if no paid batch task has been used. Duplicate charges and service failures are reviewed separately, and mandatory consumer rights are preserved. See the Terms of Service for details." },
  { question: "Will a failed task use my allowance?", answer: "Under these plans, a task only uses its allowance when the supported output is ready and the usage confirmation succeeds. Failed or canceled tasks restore reserved allowance. Downloading the same result again in the current session does not count twice. Closing the page discards local results, so download your files before leaving." },
  { question: "Do paid plans upload my images?", answer: "No. Inspection, cleaning and verification stay in your browser. Account and billing systems will handle only the information needed for access, payments and usage accounting. They do not need your image bytes, filenames, prompts or raw metadata. WebP remains inspection-only, and AI visual repair is not included." },
  { question: "Can I subscribe today?", answer: "Not yet. This page previews the upcoming plans. Subscriptions and daily usage limits have not launched, and checkout is unavailable. You can use the current workspace now. We will enable purchases only after recurring payments, daily allowances and online cancellation work together." },
];
const rows = [
  ["Daily cleaning allowance", "1 single image", "3 single images", "20 batch tasks + 3 single images"],
  ["Metadata inspection", "Free", "Free", "Free"],
  ["Images per cleaning task", "1", "1", "Up to 30 desktop / 10 mobile"],
  ["Maximum image size", "25 MB", "25 MB", "25 MB"],
  ["Batch size limit", "Not included", "Not included", "200 MB desktop / 100 MB mobile"],
  ["Cleaned file verification", "Included", "Included", "Included"],
  ["ZIP batch export", "Not included", "Not included", "Included"],
  ["Image processing", "In your browser", "In your browser", "In your browser"],
  ["Account required", "No", "Google sign-in", "Google sign-in"],
  ["Automatic renewal", "None", "None", "$4.99 every 30 days"],
];

export default function PricingPage() {
  return <><PublicHeader /><main className="pricing-page">
    <section className="pricing-hero"><div className="page-container">
      <Breadcrumbs current="Pricing" />
      <div className="pricing-intro"><p className="eyebrow">Simple plans. Private by design.</p><h1>A little cleanup.<br />Or a whole batch.</h1><p>Start with a free daily allowance. Choose Batch Pro when you have a queue of images to prepare. Your originals stay yours, and your images stay in your browser.</p></div>
      <aside className="pricing-launch-note" aria-label="Plan availability"><Info size={20} aria-hidden="true" /><p><strong>Upcoming plans.</strong> Subscriptions and daily limits are not live yet. Explore the plans below or use the current workspace. No payment is collected from this page.</p></aside>
      <div className="pricing-plans">
        <PlanCard name="Guest" audience="For an occasional image, without signing in." price="$0" priceNote="no account needed" allowance={`${pricing.guestImagesPerDay} image / day`} allowanceNote="One single-image clean, with verification." features={["Free metadata inspection", "JPEG & PNG cleaning", "Download a separate copy", "Original file stays unchanged"]} action={<Link className="button secondary" href="/workspace">Try the workspace <ArrowRight size={16} aria-hidden="true" /></Link>} />
        <PlanCard name="Free account" audience="For a few images in your everyday workflow." price="$0" priceNote="with Google sign-in" allowance={`${pricing.accountImagesPerDay} images / day`} allowanceNote="Three single-image cleans in total." features={["Everything in Guest", "An allowance shared across your account", "One image per cleaning task", "No payment details required"]} action={<a className="button secondary" href="/auth/start" target="_blank" rel="noopener noreferrer">Sign in with Google<span className="sr-only"> (opens in a new tab)</span><ArrowRight size={16} aria-hidden="true" /></a>} />
        <PlanCard featured name="Batch Pro" audience="For creators preparing more images at once." price={`$${pricing.amountUsd}`} priceNote={`USD / ${pricing.periodDays} days`} allowance={`${pricing.batchJobsPerDay} batch tasks / day`} allowanceNote="Up to 30 images per batch on desktop." features={["Everything in Free account", "Up to 10 images per batch on mobile", "Batch cleaning and individual verification", "Download cleaned files together as a ZIP"]} action={<><button className="button primary" disabled aria-describedby="batch-launch">Subscriptions coming soon</button><p id="batch-launch" className="plan-renewal">Renews automatically every 30 days. Cancel future renewals online once subscriptions open.</p></>} />
      </div>
      <p className="pricing-fineprint">Daily allowances reset at 00:00 UTC. No daily rollover. Batch Pro is USD $4.99 every 30 days, plus applicable taxes shown at checkout. <Link href="/terms#fees">Billing & refund terms</Link>.</p>
      <div className="pricing-trust"><span><LockKeyhole size={16} aria-hidden="true" />No image uploads</span><span><ShieldCheck size={16} aria-hidden="true" />Originals preserved</span><span><Clock3 size={16} aria-hidden="true" />Clear daily allowances</span></div>
    </div></section>
    <section className="section"><div className="page-container pricing-details"><div><p className="eyebrow">Know what counts</p><h2>One batch.<br />One task.</h2><p>A daily task is a group of images, not a charge for every image. Check your files, choose the supported fields to clean, and get a separate ZIP of the results.</p><p>Desktop: up to 30 images / 200 MB.<br />Mobile: up to 10 images / 100 MB.<br />Every image: up to 25 MB.</p><p>JPEG and PNG cleaning. WebP inspection only.</p></div><ol className="pricing-rules"><li><strong>Inspect before you spend an allowance</strong><p>Reading metadata is free. Your cleaning allowance applies to preparing a supported cleaned copy.</p></li><li><strong>A complete result counts once</strong><p>One batch uses one task when its supported output is ready. Failed or canceled tasks restore reserved allowance.</p></li><li><strong>Repeat a download, not the charge</strong><p>Download the same result again in the current session without using another task. A new group or new cleaning settings starts a new task.</p></li><li><strong>A fresh allowance every day</strong><p>Daily limits reset at 00:00 UTC and do not accumulate. If you cancel Pro, paid access lasts until your current 30-day period ends.</p></li></ol></div></section>
    <section className="section section-alt pricing-comparison"><div className="page-container"><p className="eyebrow">The details, side by side</p><h2>Find your everyday fit.</h2><div className="pricing-table-wrap" role="region" aria-label="Plan comparison, scroll horizontally on smaller screens" tabIndex={0}><table className="pricing-table"><caption>Upcoming plan features. Daily metering and subscriptions are not active yet.</caption><thead><tr><th scope="col">Feature</th><th scope="col">Guest</th><th scope="col">Free account</th><th scope="col">Batch Pro</th></tr></thead><tbody>{rows.map(([feature, ...values]) => <tr key={feature}><th scope="row">{feature}</th>{values.map((value,index) => <td key={index}>{value}</td>)}</tr>)}</tbody></table></div><p className="pricing-contact">Not sure which plan fits? <SupportContact subject="AI Metadata Remover pricing question" />.</p></div></section>
    <FAQSection title="Before you choose a plan" items={faqs} />
  </main><PublicFooter /></>;
}
