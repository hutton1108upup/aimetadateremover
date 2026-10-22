"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, ChevronDown, Menu } from "lucide-react";
import { AuthControls } from "@/components/auth/auth-controls";
import { BrandLogo } from "./brand-logo";

const toolGroups = [
  {
    title: "Image cleaners",
    links: [
      ["JPEG Remover", "/remove-metadata-from-jpeg"],
      ["PNG Remover", "/remove-metadata-from-png"],
      ["Batch Remover", "/batch-metadata-remover"],
      ["GPS Remover", "/remove-gps-from-photo"],
      ["ComfyUI Workflow", "/comfyui-workflow-remover"],
      ["Stable Diffusion", "/stable-diffusion-metadata-remover"],
    ],
  },
  {
    title: "Document cleaners",
    links: [
      ["PDF Remover", "/pdf-metadata-remover"],
      ["Word Remover", "/docx-metadata-remover"],
    ],
  },
  {
    title: "Inspect metadata",
    links: [
      ["Image Checker", "/metadata-checker"],
      ["C2PA Checker", "/c2pa-metadata-checker"],
    ],
  },
] as const;

function isCurrentPath(pathname: string, href: string) {
  if (href === "/") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isToolsPath(pathname: string) {
  return toolGroups.some((group) => group.links.some(([, href]) => isCurrentPath(pathname, href)));
}

export function PublicHeader() {
  const pathname = usePathname() ?? "/";
  const workspace = pathname === "/workspace";
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);
  const toolsButtonRef = useRef<HTMLButtonElement>(null);
  const mobileRef = useRef<HTMLDetailsElement>(null);
  const mobileTriggerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function closeMenus() {
      setToolsOpen(false);
      if (mobileRef.current) { mobileRef.current.open = false; mobileRef.current.querySelectorAll("details[open]").forEach((details) => { details.removeAttribute("open"); }); }
    }
    function handlePointerDown(event: PointerEvent) {
      if (!toolsRef.current?.contains(event.target as Node)) setToolsOpen(false);
      if (mobileRef.current?.open && !mobileRef.current.contains(event.target as Node)) {
        closeMenus();
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (toolsOpen || mobileRef.current?.open) { closeMenus(); toolsButtonRef.current?.focus(); mobileTriggerRef.current?.focus(); }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => { document.removeEventListener("pointerdown", handlePointerDown); document.removeEventListener("keydown", handleKeyDown); };
  }, [toolsOpen]);

  function closeMobileMenu() {
    if (mobileRef.current) { mobileRef.current.open = false; mobileRef.current.querySelectorAll("details[open]").forEach((details) => details.removeAttribute("open")); }
  }

  return (
    <header className="site-header">
      <Link prefetch={false} href="/" className="brand"><BrandLogo /></Link>
      <nav className="desktop-primary-nav" aria-label="Primary navigation">
        <Link prefetch={false} className={isCurrentPath(pathname, "/") ? "active" : undefined} aria-current={isCurrentPath(pathname, "/") ? "page" : undefined} href="/">Cleaner</Link>
        <div className="tools-nav" ref={toolsRef}>
          <button ref={toolsButtonRef} type="button" className={isToolsPath(pathname) ? "active tools-trigger" : "tools-trigger"} aria-expanded={toolsOpen} aria-controls="tools-panel" onClick={() => setToolsOpen((open) => !open)}>Tools <ChevronDown aria-hidden="true" /></button>
          <div id="tools-panel" className="tools-panel" hidden={!toolsOpen} aria-hidden={!toolsOpen} aria-label="Tool categories">
            {toolGroups.map((group) => <section key={group.title}><h2>{group.title}</h2>{group.links.map(([label, href]) => <Link prefetch={false} href={href} key={href} onClick={() => setToolsOpen(false)} className={isCurrentPath(pathname, href) ? "active" : undefined} aria-current={isCurrentPath(pathname, href) ? "page" : undefined}>{label}</Link>)}</section>)}
            <Link prefetch={false} href="/supported-formats" className="tools-panel-footer" onClick={() => setToolsOpen(false)}>Supported formats <ArrowUpRight aria-hidden="true" /></Link>
          </div>
        </div>
        <Link prefetch={false} className={isCurrentPath(pathname, "/blog") ? "active" : undefined} aria-current={isCurrentPath(pathname, "/blog") ? "page" : undefined} href="/blog">Blog</Link>
        <Link prefetch={false} className={isCurrentPath(pathname, "/pricing") ? "active" : undefined} aria-current={isCurrentPath(pathname, "/pricing") ? "page" : undefined} href="/pricing">Pricing</Link>
      </nav>
      <details className="mobile-menu" ref={mobileRef} onKeyDown={(event) => { if (event.key === "Escape") { mobileRef.current!.open = false; mobileRef.current?.querySelectorAll("details[open]").forEach((details) => details.removeAttribute("open")); mobileTriggerRef.current?.focus(); } }}>
        <summary ref={mobileTriggerRef} role="button" aria-label="Open navigation"><Menu aria-hidden="true" /></summary>
        <div className="mobile-menu-panel">
          <Link prefetch={false} href="/" className={isCurrentPath(pathname, "/") ? "active" : undefined} aria-current={isCurrentPath(pathname, "/") ? "page" : undefined} onClick={closeMobileMenu}>Cleaner</Link>
          <details className="mobile-tools-group"><summary>Tools <ChevronDown aria-hidden="true" /></summary><div>{toolGroups.map((group) => <section key={group.title}><h2>{group.title}</h2>{group.links.map(([label, href]) => <Link prefetch={false} href={href} key={href} onClick={closeMobileMenu} className={isCurrentPath(pathname, href) ? "active" : undefined} aria-current={isCurrentPath(pathname, href) ? "page" : undefined}>{label}</Link>)}</section>)}<Link prefetch={false} href="/supported-formats" onClick={closeMobileMenu}>Supported formats</Link></div></details>
          <Link prefetch={false} href="/blog" className={isCurrentPath(pathname, "/blog") ? "active" : undefined} aria-current={isCurrentPath(pathname, "/blog") ? "page" : undefined} onClick={closeMobileMenu}>Blog</Link>
          <Link prefetch={false} href="/pricing" className={isCurrentPath(pathname, "/pricing") ? "active" : undefined} aria-current={isCurrentPath(pathname, "/pricing") ? "page" : undefined} onClick={closeMobileMenu}>Pricing</Link>
        </div>
      </details>
      <div className="header-account-actions"><AuthControls /><Link prefetch={false} aria-label={workspace ? "Back to cleaner" : "Open Workspace"} title={workspace ? "Back to cleaner" : "Open Workspace"} href={workspace ? "/" : "/workspace"} className={`header-cta ${workspace ? "header-cta-secondary" : ""}`}>{workspace ? <><ArrowLeft aria-hidden="true" /> <span className="header-cta-label">Back to cleaner</span></> : <><span className="header-cta-label">Open Workspace</span> <ArrowUpRight aria-hidden="true" /></>}</Link></div>
    </header>
  );
}
