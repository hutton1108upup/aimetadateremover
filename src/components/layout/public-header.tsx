"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Check, Menu } from "lucide-react";

const navigation = [
  { href: "/", label: "Metadata Cleaner" },
  { href: "/metadata-checker", label: "Metadata Checker" },
  { href: "/remove-metadata-from-png", label: "PNG Remover" },
  { href: "/guides", label: "Guides" },
];

function isCurrentPath(pathname: string, href: string) {
  if (href === "/") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PublicHeader() {
  const pathname = usePathname() ?? "/";
  const workspace = pathname === "/workspace";

  function closeMobileMenu(event: React.MouseEvent<HTMLAnchorElement>) {
    event.currentTarget.closest("details")?.removeAttribute("open");
  }

  return (
    <header className="site-header">
      <Link href="/" className="brand"><span><Check aria-hidden="true" /></span>ImageFinisher</Link>
      <nav aria-label="Primary navigation">
        {navigation.map((item) => {
          const current = isCurrentPath(pathname, item.href);
          return <Link className={current ? "active" : undefined} aria-current={current ? "page" : undefined} href={item.href} key={item.href}>{item.label}</Link>;
        })}
      </nav>
      <details className="mobile-menu">
        <summary role="button" aria-label="Open navigation"><Menu aria-hidden="true" /></summary>
        <div>
          {navigation.map((item) => {
            const current = isCurrentPath(pathname, item.href);
            return <Link className={current ? "active" : undefined} aria-current={current ? "page" : undefined} href={item.href} key={item.href} onClick={closeMobileMenu}>{item.label}</Link>;
          })}
        </div>
      </details>
      <Link href={workspace ? "/" : "/workspace"} className={`header-cta ${workspace ? "header-cta-secondary" : ""}`}>
        {workspace ? <><ArrowLeft aria-hidden="true" /> Back to cleaner</> : <>Open Workspace <ArrowUpRight aria-hidden="true" /></>}
      </Link>
    </header>
  );
}
