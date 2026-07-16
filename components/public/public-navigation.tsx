import Link from "next/link";
import { VoxMintLogo } from "@/components/branding/voxmint-logo";

export function PublicHeader({ signedIn }: { signedIn: boolean }) {
  return <header className="mx-auto flex h-[76px] w-full max-w-[1220px] items-center justify-between px-5 sm:px-8"><Link href="/" aria-label="VoxMint home"><VoxMintLogo /></Link><nav aria-label="Public navigation" className="flex items-center gap-2">{signedIn ? <Link href="/dashboard" className="button-primary px-4">Open dashboard</Link> : <><Link href="/login" className="button-ghost px-4">Sign in</Link><Link href="/login?callbackUrl=%2Fdashboard" className="button-primary hidden px-4 sm:inline-flex">Get started</Link></>}</nav></header>;
}
