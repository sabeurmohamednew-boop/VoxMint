import Link from "next/link";
import { HelpContent } from "@/components/help/help-content";
import { LegalPage } from "@/components/public/legal-page";
import { getCurrentUser } from "@/lib/auth/session";
import { getPublicOperationsInfo } from "@/lib/config/env";

export default async function HelpPage() {
  const [user, operations] = await Promise.all([getCurrentUser(), Promise.resolve(getPublicOperationsInfo())]);
  return <LegalPage title="Help & Safety" intro="Practical guidance for creating permitted voices and handling generated audio safely."><p className="mb-6 text-sm"><Link className="text-[#af82f2]" href={user?.id ? "/dashboard" : "/login"}>{user?.id ? "Return to your workspace" : "Sign in for workspace help"}</Link></p><HelpContent supportEmail={operations.supportEmail} supportUrl={operations.supportUrl} abuseReportEmail={operations.abuseReportEmail} abuseReportUrl={operations.abuseReportUrl} /></LegalPage>;
}
