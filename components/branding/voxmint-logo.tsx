import { AudioWaveform } from "lucide-react";

export function VoxMintLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5" aria-label="VoxMint">
      <span className="relative grid h-8 w-8 place-items-center text-[#9a5df0]">
        <span className="absolute inset-0 rounded-full bg-[#7447e8]/15 blur-md" />
        <AudioWaveform className="relative h-7 w-7" strokeWidth={2.3} aria-hidden="true" />
      </span>
      {!compact && <span className="text-[18px] font-bold tracking-[-0.025em] text-[var(--foreground)]">VoxMint</span>}
    </span>
  );
}
