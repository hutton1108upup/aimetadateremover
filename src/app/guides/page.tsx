import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { InfoPage } from "@/components/marketing/info-page";
import { metadataFor } from "@/lib/site";
import { guides } from "@/lib/guides";
export const metadata = metadataFor("/guides");
export default function Page() { return <InfoPage label="Guides" h1="Practical Image Metadata Guides" lede="Evidence-bounded explanations of what travels with an image, what each field means, and what you might lose by removing it."><div className="guide-grid guide-grid-expanded">{guides.map((guide) => <Link href={`/guides/${guide.slug}`} key={guide.slug}><BookOpen aria-hidden="true" /><span><small>{guide.kicker} · Updated {guide.updated}</small><h2>{guide.title}</h2><p>{guide.description}</p><b>Read the guide <ArrowRight aria-hidden="true" /></b></span></Link>)}</div></InfoPage>; }
