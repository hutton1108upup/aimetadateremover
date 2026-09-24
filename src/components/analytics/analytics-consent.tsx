"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "aimr.analytics-consent.v1";
type ConsentChoice = "accepted" | "rejected";

function AnalyticsScripts() {
  const gaId = process.env.NEXT_PUBLIC_GA4_ID?.trim() || "G-KEN9N69DMT";
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID?.trim() || "ynac141k23";

  useEffect(() => {
    if (gaId && !document.querySelector(`script[data-analytics="ga4"]`)) {
      const loader = document.createElement("script");
      loader.async = true;
      loader.dataset.analytics = "ga4";
      loader.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
      document.head.appendChild(loader);

      const config = document.createElement("script");
      config.dataset.analytics = "ga4-config";
      config.textContent = `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${gaId}', { anonymize_ip: true });`;
      document.head.appendChild(config);
    }

    if (clarityId && !document.querySelector(`script[data-analytics="clarity"]`)) {
      const script = document.createElement("script");
      script.dataset.analytics = "clarity";
      script.textContent = `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window,document,"clarity","script","${clarityId}");`;
      document.head.appendChild(script);
    }
  }, [gaId, clarityId]);

  return null;
}

export function AnalyticsConsent() {
  const [choice, setChoice] = useState<ConsentChoice | null>(() => {
    if (typeof window === "undefined") return null;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "accepted" || saved === "rejected" ? saved : null;
  });

  function choose(nextChoice: ConsentChoice) {
    window.localStorage.setItem(STORAGE_KEY, nextChoice);
    setChoice(nextChoice);
  }

  if (choice === "accepted") return <AnalyticsScripts />;
  if (choice !== null) return null;

  return (
    <aside aria-label="Analytics cookie choices" className="analytics-consent">
      <p>We use Google Analytics and Microsoft Clarity to understand site visits and improve the service. Optional analytics run only if you accept. <a href="/privacy">Privacy Policy</a></p>
      <div>
        <button type="button" onClick={() => choose("rejected")}>Reject optional analytics</button>
        <button type="button" onClick={() => choose("accepted")}>Accept analytics</button>
      </div>
    </aside>
  );
}
