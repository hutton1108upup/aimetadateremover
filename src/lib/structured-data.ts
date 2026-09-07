import type { FAQItem } from "@/components/marketing/faq-section";
export function faqSchema(items: FAQItem[]) { return { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: items.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) }; }
export function appSchema(name: string, description: string, url: string) { return { "@context": "https://schema.org", "@type": "WebApplication", name, description, url, applicationCategory: "MultimediaApplication", operatingSystem: "Any modern browser", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } }; }

export function websiteSchema(url: string) { return { "@context": "https://schema.org", "@type": "WebSite", "@id": `${url}/#website`, name: "ImageFinisher", url: `${url}/` }; }
