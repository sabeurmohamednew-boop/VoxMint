import { permanentRedirect } from "next/navigation";

export default async function BillingPage() {
  permanentRedirect("/status");
}
