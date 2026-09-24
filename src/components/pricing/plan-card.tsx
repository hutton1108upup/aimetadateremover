import type { ReactNode } from "react";
import { Check, ArrowUpRight } from "lucide-react";

interface PlanCardProps {
  name: string;
  audience: string;
  price: string;
  priceNote: string;
  allowance: string;
  allowanceNote: string;
  features: string[];
  action: ReactNode;
  featured?: boolean;
}

export function PlanCard({ name, audience, price, priceNote, allowance, allowanceNote, features, action, featured = false }: PlanCardProps) {
  return <article className={`plan-card${featured ? " plan-card-featured" : ""}`}>
    <div className="plan-heading"><span className="plan-label">{featured ? "FOR BATCH WORK" : "FREE PLAN"}</span><ArrowUpRight aria-hidden="true" size={20} /></div>
    <h2>{name}</h2><p className="plan-audience">{audience}</p>
    <div className="plan-price"><strong>{price}</strong><span>{priceNote}</span></div>
    <div className="plan-allowance"><strong>{allowance}</strong><span>{allowanceNote}</span></div>
    <ul>{features.map(feature => <li key={feature}><Check aria-hidden="true" size={16}/><span>{feature}</span></li>)}</ul>
    <div className="plan-action">{action}</div>
  </article>;
}
