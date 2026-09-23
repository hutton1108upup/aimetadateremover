import type { Metadata } from "next";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { BillingPanel } from "@/components/pricing/billing-panel";
export const metadata:Metadata={title:"Account billing | ImageFinisher",robots:{index:false,follow:false}};
export default function BillingPage(){return <><PublicHeader/><main className="section"><div className="page-container"><p className="eyebrow">Your account</p><h1>Subscription & daily allowance</h1><p>Track your plan, confirm a payment, or stop the next renewal.</p><BillingPanel/></div></main><PublicFooter/></>;}
