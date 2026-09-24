// Product contract approved on 2026-09-24. Checkout and paid entitlements are not live.
export const pricing = {
  status: "preview",
  free: { dailyImageLimit: 5, batchProcessing: false, signIn: "Google", processingSpeed: "standard" },
  pro: {
    monthly: { standardAmountUsd: "9.90", firstPurchaseAmountUsd: "4.90", periodLabel: "month", batchMaxPhotos: 10 },
    yearly: { standardAmountUsd: "89.90", firstYearAmountUsd: "49.90", periodLabel: "year", batchMaxPhotos: 10, sessionMaxImages: 30 },
    dailyImageLimit: null,
    priorityExecution: true,
  },
  currentWorkspace: { desktopFiles: 30, desktopBatchMb: 200, mobileFiles: 10, mobileBatchMb: 100, maxFileMb: 25 },
} as const;
