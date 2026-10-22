import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Check, CircleAlert, Eye } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeader } from "@/components/layout/public-header";
import { FAQSection, type FAQItem } from "./faq-section";
import {
  UnifiedImageWorkspace,
  type ToolFocus,
} from "@/components/tool/unified-image-workspace";
import { DocumentWorkspace } from "@/components/tool/document-workspace";
import { appSchema, faqSchema } from "@/lib/structured-data";
import { siteUrl } from "@/lib/site";
import { MetadataEvidence } from "./metadata-evidence";
export interface ToolPageProps {
  path: string;
  h1: string;
  intro: string;
  label: string;
  defaultMode?: "inspect" | "clean";
  acceptedFormats?: Array<"jpeg" | "png" | "webp">;
  focus?: ToolFocus;
  documentKind?: "pdf" | "docx";
  sectionTitles?: { coverage: string; preserved: string; steps: string };
  children?: ReactNode;
  specifics: Array<{ title: string; body: string }>;
  preserved: string[];
  limits: string[];
  steps: Array<{ title: string; body: string }>;
  faqs: FAQItem[];
}
export function ToolPage(props: ToolPageProps) {
  const coverage =
    props.sectionTitles?.coverage ??
    (props.documentKind
      ? `What this ${props.documentKind.toUpperCase()} cleaner covers`
      : "What this tool covers");
  const preserved =
    props.sectionTitles?.preserved ??
    (props.documentKind
      ? `What stays in the ${props.documentKind.toUpperCase()} copy`
      : "Useful image data stays with the file");
  const steps =
    props.sectionTitles?.steps ??
    (props.documentKind
      ? `Choose a ${props.documentKind.toUpperCase()} and review the result`
      : "Choose an image and review the result");
  return (
    <>
      <PublicHeader />
      <main>
        <section className="tool-hero">
          <div className="page-container">
            <Breadcrumbs current={props.label} />
            <div className="tool-hero-copy">
              <p className="eyebrow">{props.documentKind || props.defaultMode === "inspect" ? "Free · runs locally · no account" : "Free daily allowance · runs locally"}</p>
              <h1>{props.h1}</h1>
              <p>{props.intro}</p>
            </div>
            {props.documentKind ? (
              <DocumentWorkspace kind={props.documentKind} />
            ) : (
              <UnifiedImageWorkspace
                variant="embedded"
                defaultMode={props.defaultMode}
                acceptedFormats={props.acceptedFormats}
                focus={props.focus}
              />
            )}
          </div>
        </section>
        <section className="section section-alt">
          <div className="page-container">
            <div className="section-heading">
              <p className="eyebrow">In this file</p>
              <h2>{coverage}</h2>
            </div>
            <div className="info-grid">
              {props.specifics.map((item, index) => (
                <article key={item.title}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="section">
          <div className="page-container preserve-grid">
            <div>
              <p className="eyebrow">In the output</p>
              <h2>{preserved}</h2>
              {props.preserved.map((item) => (
                <p className="check-line" key={item}>
                  <Check />
                  {item}
                </p>
              ))}
            </div>
            <div className="boundary-card">
              <CircleAlert />
              <h3>Limits to review</h3>
              {props.limits.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </div>
        </section>
        <section className="section section-alt">
          <div className="page-container">
            <div className="section-heading">
              <p className="eyebrow">Use the tool</p>
              <h2>{steps}</h2>
            </div>
            <ol className="step-list">
              {props.steps.map((step, index) => (
                <li key={step.title}>
                  <span>{index + 1}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
        {!props.documentKind && props.children}
        {(props.path === "/comfyui-workflow-remover" || props.path === "/remove-metadata-from-png") && <section className="section"><div className="page-container"><MetadataEvidence ids={props.path === "/comfyui-workflow-remover" ? ["workflow-png"] : ["transparent-png"]} /><Link className="text-link" href={props.path === "/comfyui-workflow-remover" ? "/blog/stable-diffusion-comfyui-metadata" : "/blog/image-metadata-before-publishing"}>Read the full cleaning and verification guide <ArrowRight /></Link></div></section>}
        <FAQSection
          title={`Questions about ${props.label.toLowerCase()}`}
          items={props.faqs}
        />
        <section className="section section-alt">
          <div className="page-container related-card">
            <span>
              <Eye />
              <b>Related local tools</b>
            </span>
            <div>
              <Link href="/">
                AI metadata cleaner <ArrowRight />
              </Link>
              {props.path !== "/metadata-checker" && <Link href="/metadata-checker">
                Metadata checker <ArrowRight />
              </Link>}
              {props.documentKind && (
                <>
                  <Link href="/pdf-metadata-remover">
                    PDF metadata remover <ArrowRight />
                  </Link>
                  <Link href="/docx-metadata-remover">
                    Word metadata remover <ArrowRight />
                  </Link>
                </>
              )}
              <Link href="/supported-formats">
                Supported formats <ArrowRight />
              </Link>
              {!props.documentKind && <Link href="/batch-metadata-remover">Batch metadata remover <ArrowRight /></Link>}
            </div>
          </div>
        </section>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqSchema(props.faqs)),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              appSchema(
                props.h1,
                props.intro,
                new URL(props.path, siteUrl).toString(),
              ),
            ),
          }}
        />
      </main>
      <PublicFooter />
    </>
  );
}
