import Link from "next/link";
import { VoxMintLogo } from "@/components/branding/voxmint-logo";
export default function NotFound() { return <main className="grid min-h-screen place-items-center p-6 text-center"><div><VoxMintLogo /><p className="mt-8 text-xs font-semibold uppercase tracking-[.2em] text-[#a778ed]">404</p><h1 className="mt-3 text-3xl font-bold">Page not found</h1><p className="mt-3 text-sm text-[var(--muted)]">The page may have moved or no longer exists.</p><Link href="/" className="button-primary mt-6 px-5">Return home</Link></div></main>; }
