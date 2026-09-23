export interface BillingEnvironment {
  AUTH_DB: D1Database;
  AUTH_BASE_URL?: string;
  AUTH_SECRET?: string;
  WAFFO_ENVIRONMENT?: string;
  WAFFO_MERCHANT_ID?: string;
  WAFFO_PRIVATE_KEY?: string;
  WAFFO_STORE_ID?: string;
  WAFFO_SUBSCRIPTION_PRODUCT_ID?: string;
  WAFFO_CHECKOUT_ENABLED?: string;
  BILLING_METERING_ENABLED?: string;
}
export const consentVersion = "batch-pro-monthly-2026-09-23";
export function billingConfig(env: BillingEnvironment) {
  const environment = env.WAFFO_ENVIRONMENT;
  if (environment !== "test" && environment !== "prod") throw new Error("Billing environment is not configured");
  const baseURL = new URL(env.AUTH_BASE_URL || "http://localhost:3180");
  const local = ["localhost", "127.0.0.1"].includes(baseURL.hostname);
  if (baseURL.protocol !== "https:" && !(local && baseURL.protocol === "http:")) throw new Error("Invalid billing origin");
  const config = { environment: environment as "test"|"prod", baseURL: baseURL.origin, merchantId: env.WAFFO_MERCHANT_ID || "", privateKey: (env.WAFFO_PRIVATE_KEY || "").replace(/\\n/g,"\n"), storeId: env.WAFFO_STORE_ID || "", productId: env.WAFFO_SUBSCRIPTION_PRODUCT_ID || "" };
  const ready = Boolean(config.merchantId && config.privateKey && config.storeId && config.productId && env.AUTH_SECRET);
  return { ...config, ready, checkoutEnabled: ready && env.WAFFO_CHECKOUT_ENABLED === "true" && env.BILLING_METERING_ENABLED === "true", meteringEnabled: env.BILLING_METERING_ENABLED === "true" };
}
export type BillingConfig = ReturnType<typeof billingConfig>;
