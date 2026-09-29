import Link from "next/link";
import { SupportContact } from "./support-contact";
import { BrandLogo } from "./brand-logo";

export function PublicFooter() {
  return <footer className="site-footer">
    <div className="footer-main">
      <div><Link href="/" className="footer-brand"><BrandLogo /></Link><p>Inspect it. Clean it. Check it. Download it.</p><div className="footer-support" id="contact"><strong>Customer support</strong><SupportContact /><small>Questions, data requests and account closure.</small></div></div>
      <div><span>Tools</span><Link href="/batch-metadata-remover">Batch Remover</Link><Link href="/metadata-checker">Metadata Checker</Link><Link href="/supported-formats">Supported Formats</Link><Link href="/workspace">Workspace</Link></div>
      <div><span>Learn</span><Link href="/pricing">Pricing</Link><Link href="/blog">Blog</Link><Link href="/about">About</Link><Link href="/feedback">Share feedback</Link></div>
      <div><span>Legal</span><Link href="/privacy">Privacy Policy</Link><Link href="/terms">Terms of Service</Link></div>
    </div>
    <div className="footer-bottom"><span>Your images stay in your browser.</span><span>Keep your original and check every downloaded copy.</span></div>
  </footer>;
}
