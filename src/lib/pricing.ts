// Product contract approved on 2026-09-24. Keep billing and workspace entitlements aligned before release.
export const pricing = {
  free: { dailyImageLimit: 5, batchProcessing: false, signIn: "Google" },
  pro: {
    monthly: { standardAmountUsd: "9.90", firstPurchaseAmountUsd: "4.90", periodLabel: "month", batchMaxPhotos: 10 },
    yearly: { standardAmountUsd: "89.90", firstYearAmountUsd: "49.90", periodLabel: "year", batchMaxPhotos: 10, sessionMaxImages: 30 },
    dailyImageLimit: null,
    batchZip: true,
  },
} as const;
