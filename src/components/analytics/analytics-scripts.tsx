"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { analyticsAllowed, subscribeToFunnelAnalytics } from "@/lib/analytics";
import { articlePaths, toolPaths, trackFunnel } from "@/lib/funnel";

type AnalyticsWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };

export function AnalyticsScripts() {
  const pathname = usePathname();
  const previousPath = useRef<string | null>(null);
  const gaId = process.env.NEXT_PUBLIC_GA4_ID?.trim() || "G-KEN9N69DMT";
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID?.trim() || "ynac141k23";

  useEffect(() => {
    // Previews and automated checks must not populate production analytics.
    if (!analyticsAllowed(window.location.hostname)) return;
    const analytics = window as AnalyticsWindow;
    analytics.dataLayer ??= [];
    // eslint-disable-next-line prefer-rest-params -- Preserve the standard gtag command queue format.
    analytics.gtag ??= function () { analytics.dataLayer!.push(arguments); };
    if (!document.querySelector('script[data-analytics="ga4"]')) {
      analytics.gtag("js", new Date());
      analytics.gtag("config", gaId, { anonymize_ip: true });
      const loader = document.createElement("script");
      loader.async = true;
      loader.dataset.analytics = "ga4";
      loader.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
      document.head.appendChild(loader);
    }
    if (!document.querySelector('script[data-analytics="clarity"]')) {
      const script = document.createElement("script");
      script.dataset.analytics = "clarity";
      script.textContent = `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window,document,"clarity","script",${JSON.stringify(clarityId)});`;
      document.head.appendChild(script);
    }
    return subscribeToFunnelAnalytics((name, parameters) => analytics.gtag?.("event", name, parameters));
  }, [gaId, clarityId]);

  useEffect(() => {
    if (previousPath.current !== pathname) {
      previousPath.current = pathname;
      if (pathname && articlePaths.has(pathname)) trackFunnel("article_view", { article: pathname });
    }
  }, [pathname]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[data-article-tool]") : null;
      if (!link || !articlePaths.has(window.location.pathname)) return;
      const destination = new URL(link.href);
      if (destination.origin === window.location.origin && toolPaths.has(destination.pathname)) {
        trackFunnel("tool_link_click", { article: window.location.pathname, target: destination.pathname });
      }
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
