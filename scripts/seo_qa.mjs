import { mkdir, writeFile } from "node:fs/promises";

const local=process.env.BASE_URL ?? "http://127.0.0.1:3173";
const live="https://aimetadateremover.pro";
const paths=["/","/metadata-checker","/remove-ai-detection-from-image","/remove-metadata-from-png","/workspace","/privacy","/robots.txt","/sitemap.xml"];
const report={checkedAt:new Date().toISOString(),local:[],live:[],gsc:"Current browser account has no access to sc-domain:aimetadateremover.pro; submission, indexing and query data could not be verified."};
for(const [label,origin] of [["local",local],["live",live]]) {
  for(const path of paths) {
    try {
      const response=await fetch(origin+path,{signal:AbortSignal.timeout(15000)});const html=await response.text();
      const canonical=html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1];
      const robots=html.match(/<meta[^>]*name="robots"[^>]*content="([^"]+)"/)?.[1];
      const schemas=[...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1])["@type"]);
      const entry={path,status:response.status,canonical,robots,schemas};
      if(path==="/sitemap.xml")entry.urls=[...html.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
      if(path==="/robots.txt")entry.body=html;
      report[label].push(entry);
      if(label==="local") {
        if(response.status!==200)throw new Error(`${path} status ${response.status}`);
        if(!path.endsWith(".xml") && !path.endsWith(".txt") && path!=="/workspace" && new URL(canonical).origin!==live)throw new Error(`${path} canonical is not the production origin`);
        if(path==="/workspace" && !robots?.includes("noindex"))throw new Error("Workspace must remain noindex");
        if(path==="/remove-metadata-from-png" && robots?.includes("noindex"))throw new Error("Tested PNG page is still noindex");
        if(path==="/sitemap.xml" && (entry.urls.length!==9 || !entry.urls.includes(live+"/remove-metadata-from-png") || entry.urls.includes(live+"/workspace")))throw new Error("Unexpected sitemap routes");
      }
    }catch(error){if(label==="local")throw error;report[label].push({path,error:error.message});}
  }
}
await mkdir("artifacts/phase1-review",{recursive:true});
await writeFile("artifacts/phase1-review/seo-qa.json",JSON.stringify(report,null,2));
console.log("PASS local SEO: nine public sitemap routes, PNG indexable, workspace noindex. Live state recorded separately; no deployment or GSC changes.");
