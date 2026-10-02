// Approved 2026-10-02: each Google account may claim each plan offer once.
export const pricing = {
  guestImagesPerDay: 1,
  accountImagesPerDay: 5,
  resetTimezone: "UTC",
  free: { dailyImageLimit: 5, batchProcessing: false, signIn: "Google" },
  pro: {
    monthly: { standardAmountUsd: "9.90", firstPurchaseAmountUsd: "4.90", introDays: 30, periodLabel: "month", batchMaxPhotos: 10 },
    yearly: { standardAmountUsd: "89.90", firstYearAmountUsd: "49.90", introDays: 365, periodLabel: "year", batchMaxPhotos: 10, sessionMaxImages: 30 },
    dailyImageLimit: null,
    batchZip: true,
  },
} as const;
