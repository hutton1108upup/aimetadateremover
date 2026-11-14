import { pricing } from "@/lib/pricing";
import Link from "next/link";

export function ImagePlanNote({ batch = false }: { batch?: boolean }) {
  return <p className="image-plan-note evidence-note">
    {batch && "Batch cleaning and ZIP downloads require Pro. "}
    Guests: {pricing.guestImagesPerDay} cleans/day without an account. Free with Google sign-in: {pricing.accountImagesPerDay} single-image cleans/day in total.
    Pro: unlimited daily images, up to {pricing.pro.monthly.batchMaxPhotos}/batch with ZIP. Yearly: up to {pricing.pro.yearly.sessionMaxImages} across three batches, within device limits.
    Built-in samples are free to try. <Link className="text-link" href="/pricing">Compare plans</Link>.
  </p>;
}
