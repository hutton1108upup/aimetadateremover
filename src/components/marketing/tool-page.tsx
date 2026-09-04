import Link from "next/link";
import { ArrowRight, Check, CircleAlert, Eye } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeader } from "@/components/layout/public-header";
import { FAQSection, type FAQItem } from "./faq-section";
import { UnifiedImageWorkspace } from "@/components/tool/unified-image-workspace";
import { appSchema, faqSchema } from "@/lib/structured-data";
import { siteUrl } from "@/lib/site";

export interface ToolPageProps {
  path: string; h1: string; intro: string; label: string; defaultMode?: "inspect" | "clean"; acceptedFormats?: Array<"jpeg" | "png" | "webp">;
  specifics: Array<{ title: string; body: string }>; preserved: string[]; limits: string[]; steps: Array<{ title: string; body: string }>; faqs: FAQItem[];
}

export function ToolPage(props: ToolPageProps) {
  return <><PublicHeader /><main><section className="tool-hero"><div className="page-container"><Breadcrumbs current={props.label} /><div className="tool-hero-copy"><p className="eyebrow">Free · local-first · no account</p><h1>{props.h1}</h1><p>{props.intro}</p></div><UnifiedImageWorkspace variant="embedded" defaultMode={props.defaultMode} acceptedFormats={props.acceptedFormats} /></div></section>
    <section className="section section-alt"><div className="page-container"><div className="section-heading"><p className="eyebrow">What this page does</p><h2>Focused on one publishing decision</h2></div><div className="info-grid">{props.specifics.map((item,index)=><article key={item.title}><span>{String(index+1).padStart(2,"0")}</span><h3>{item.title}</h3><p>{item.body}</p></article>)}</div></div></section>
    <section className="section"><div className="page-container preserve-grid"><div><p className="eyebrow">Preserved by default</p><h2>Useful image data stays put</h2>{props.preserved.map((item)=><p className="check-line" key={item}><Check />{item}</p>)}</div><div className="boundary-card"><CircleAlert /><h3>What this cannot guarantee</h3>{props.limits.map((item)=><p key={item}>{item}</p>)}</div></div></section>
    <section className="section section-alt"><div className="page-container"><div className="section-heading"><p className="eyebrow">How it works</p><h2>Readable evidence before an irreversible choice</h2></div><ol className="step-list">{props.steps.map((step,index)=><li key={step.title}><span>{index+1}</span><div><h3>{step.title}</h3><p>{step.body}</p></div></li>)}</ol></div></section>
    <FAQSection title={`About ${props.label.toLowerCase()}`} items={props.faqs} />
    <section className="section section-alt"><div className="page-container related-card"><span><Eye /><b>Continue the workflow</b></span><div><Link href="/metadata-checker">Inspect before removing <ArrowRight /></Link><Link href="/workspace">Open full workspace <ArrowRight /></Link></div></div></section>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(props.faqs)) }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema(props.h1, props.intro, new URL(props.path, siteUrl).toString())) }} />
  </main><PublicFooter /></>;
}
