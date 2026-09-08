import { describe, expect, it } from "vitest";
import { metadataFor, productionOrigin, resolveSiteUrl } from "../site";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

describe("public SEO origins", () => {
  it("defaults to the public origin and rejects misconfigured production origins", () => {
    expect(resolveSiteUrl("", true)).toBe(productionOrigin);
    expect(resolveSiteUrl(`${productionOrigin}/`, true)).toBe(productionOrigin);
    for (const value of ["http://localhost:3000", "https://preview.example.com", `${productionOrigin}/path`, `${productionOrigin}?q=1`, "https://user:pass@aimetadateremover.pro"]) {
      expect(() => resolveSiteUrl(value, true)).toThrow();
    }
    expect(resolveSiteUrl("http://localhost:3217", false)).toBe("http://localhost:3217");
  });
  it("publishes matching absolute canonical, social and sitemap URLs", () => {
    for (const entry of sitemap()) {
      const url = new URL(entry.url);
      expect(url.origin).toBe(productionOrigin);
      const metadata = metadataFor(url.pathname);
      expect(metadata.alternates?.canonical).toBe(entry.url);
      expect(metadata.openGraph?.url).toBe(entry.url);
    }
    expect(robots().sitemap).toBe(`${productionOrigin}/sitemap.xml`);
    expect(metadataFor("/remove-metadata-from-png").robots).toBeUndefined();
  });
});
