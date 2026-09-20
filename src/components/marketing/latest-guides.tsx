import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { guides } from "@/lib/guides";
export function LatestGuides() { return <section className="section"><div className="page-container"><div className="section-heading split-heading"><div><p className="eyebrow">Read before you publish</p><h2>Latest technical guides</h2></div><Link className="text-link" href="/guides">View all guides <ArrowRight /></Link></div><div className="latest-guides-grid">{guides.map((guide) => <Link href={`/guides/${guide.slug}`} key={guide.slug}><BookOpen aria-hidden="true" /><span><small>{guide.kicker}</small><h3>{guide.title}</h3><p>{guide.description}</p></span></Link>)}</div></div></section>; }
