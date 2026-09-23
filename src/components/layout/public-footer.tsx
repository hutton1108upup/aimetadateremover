import Link from "next/link";
import { SupportContact } from "./support-contact";

export function PublicFooter() {
  return <footer className="site-footer">
    <div className="footer-main">
      <div><b>ImageFinisher</b><p>Inspect it. Clean it. Check it. Download it.</p><div className="footer-support" id="contact"><strong>Customer support</strong><SupportContact /><small>Questions, data requests and account closure.</small></div></div>
      <div><span>Tools</span><Link prefetch={false} href="/metadata-checker">Metadata Checker</Link><Link prefetch={false} href="/remove-metadata-from-png">PNG Remover</Link><Link prefetch={false} href="/remove-ai-detection-from-image">Detection limits</Link><Link prefetch={false} href="/workspace">Workspace</Link></div>
      <div><span>Learn</span><Link prefetch={false} href="/pricing">Pricing</Link><Link prefetch={false} href="/guides">Guides</Link><Link prefetch={false} href="/about">About</Link><Link prefetch={false} href="/feedback">Share feedback</Link></div>
      <div><span>Legal</span><Link prefetch={false} href="/privacy">Privacy Policy</Link><Link prefetch={false} href="/terms">Terms of Service</Link></div>
    </div>
    <div className="footer-bottom"><span>Your images stay in your browser.</span><span>Keep your original and check every downloaded copy.</span></div>
  </footer>;
}
