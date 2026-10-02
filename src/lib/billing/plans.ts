import { pricing } from "@/lib/pricing";
import type { BillingConfig } from "./config";
export type PlanId = "monthly" | "yearly";
export function isPlanId(value:unknown):value is PlanId { return value === "monthly" || value === "yearly"; }
export function planDetails(id:PlanId) {
  return {id, name:id === "monthly" ? "Pro Monthly" : "Pro Yearly", amount:pricing.pro[id].standardAmountUsd,
    introAmount:id === "monthly" ? pricing.pro.monthly.firstPurchaseAmountUsd : pricing.pro.yearly.firstYearAmountUsd,
    introDays:pricing.pro[id].introDays, batchMaxPhotos:10, sessionMaxImages:id === "yearly" ? 30 : 10};
}
export function productForPlan(config:BillingConfig,id:PlanId) { return id === "monthly" ? config.monthlyProductId : config.yearlyProductId; }
export function planForProduct(config:Pick<BillingConfig,"productId"|"monthlyProductId"|"yearlyProductId">,productId:string) {
  if(productId && productId === config.monthlyProductId)return "monthly" as const;
  if(productId && productId === config.yearlyProductId)return "yearly" as const;
  if(productId && productId === config.productId)return "legacy" as const;
  return null;
}
