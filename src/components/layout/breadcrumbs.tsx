import Link from "next/link";
export function Breadcrumbs({ current }: { current: string }) { return <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><span aria-current="page">{current}</span></nav>; }
