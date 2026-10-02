import Image from "next/image";
import { brandName } from "@/lib/brand";

export function BrandLogo() {
  return <><Image src="/brand/icon-color.svg" alt="" width={42} height={34} className="brand-icon" /><span className="brand-name">{brandName}</span></>;
}
