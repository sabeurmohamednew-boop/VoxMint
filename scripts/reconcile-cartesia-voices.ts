import { prisma } from "@/lib/db/prisma";
import { getVoiceProvider } from "@/lib/providers";
import { reconcileVoiceRecords } from "@/lib/providers/reconciliation";

async function main() {
  const apply = process.argv.includes("--apply");
  const provider = getVoiceProvider();
  if (provider.name !== "cartesia" || !provider.getVoiceState) {
    throw new Error("Cartesia must be the active provider to reconcile Cartesia voices.");
  }
  const records = await prisma.voice.findMany({
    where: { provider: "cartesia", deletedAt: null },
    select: { id: true, providerVoiceId: true, status: true, providerMetadata: true },
    orderBy: { createdAt: "asc" },
  });
  const metadataById = new Map(records.map((record) => [record.id, record.providerMetadata]));
  const results = await reconcileVoiceRecords(records, (id) => provider.getVoiceState!(id), {
    apply,
    markMissing: async (record) => {
      const existing = metadataById.get(record.id);
      const preserved = existing && typeof existing === "object" && !Array.isArray(existing) ? existing : {};
      await prisma.voice.update({
        where: { id: record.id },
        data: {
          status: "FAILED",
          providerMetadata: { ...preserved, reconciliationState: "provider_missing", reconciledAt: new Date().toISOString() },
        },
      });
    },
  });
  console.table(results.map((result) => ({ id: result.id, previousStatus: result.previousStatus, providerState: result.state, action: result.action })));
  console.info(apply ? "Applied provider-missing status updates only." : "Dry run only. Pass --apply to mark missing provider records as failed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Reconciliation failed.");
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
