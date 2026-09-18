import { Mail } from "lucide-react";
import { supportEmail, supportMailto } from "@/lib/contact";

export function SupportContact({ subject, label }: { subject?: string; label?: string }) {
  return <a className="support-email" href={supportMailto(subject)}>
    <Mail aria-hidden="true" size={16} />
    <span>{label ?? supportEmail}</span>
  </a>;
}
