import Link from "next/link";
import type { ReactNode } from "react";
import { InfoPage } from "./info-page";

export interface LegalSection { id: string; title: string; content: ReactNode }

export function LegalPage({ label, h1, lede, sections }: { label: string; h1: string; lede: string; sections: LegalSection[] }) {
  return <InfoPage label={label} h1={h1} lede={lede}>
    <article className="legal-document">
      <p className="legal-version">Version 1.0 draft · Updated <time dateTime="2026-09-18">September 18, 2026</time></p>
      <aside className="legal-summary" aria-label="Publication status"><strong>Draft for review</strong><p>Operator identity must be confirmed before this document becomes effective.</p></aside>
      {sections.map((section, index) => <section className="legal-section" id={section.id} key={section.id}><h2>{index + 1}. {section.title}</h2>{section.content}</section>)}
      <nav className="legal-related" aria-label="Related policies"><Link href="/privacy">Privacy Policy</Link><Link href="/terms">Terms of Service</Link><Link href="/">Back to the tools</Link></nav>
    </article>
  </InfoPage>;
}
