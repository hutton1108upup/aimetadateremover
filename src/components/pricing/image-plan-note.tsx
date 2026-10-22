import Link from "next/link";

export function ImagePlanNote({ batch = false }: { batch?: boolean }) {
  return <p className="image-plan-note evidence-note">
    {batch && "Batch cleaning and ZIP downloads require Pro. "}
    Guests: 1 clean/day without an account. Free with Google sign-in: 5 single-image cleans/day in total.
    Pro: unlimited daily images, up to 10/batch with ZIP. Yearly: up to 30 across three batches, within device limits.
    Built-in samples are free to try. <Link className="text-link" href="/pricing">Compare plans</Link>.
  </p>;
}
