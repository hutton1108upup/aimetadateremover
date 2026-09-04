import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeader } from "@/components/layout/public-header";
export function InfoPage({ label, h1, lede, children }: { label: string; h1: string; lede: string; children: React.ReactNode }) { return <><PublicHeader/><main><section className="info-hero"><div className="page-container"><Breadcrumbs current={label}/><p className="eyebrow">ImageFinisher</p><h1>{h1}</h1><p>{lede}</p></div></section><section className="section section-alt"><div className="page-container prose-dark">{children}</div></section></main><PublicFooter/></>; }
