"use client";

export default function GlobalError({ unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return <html lang="en"><body><main className="grid min-h-screen place-items-center bg-[var(--background)] p-6 text-[var(--foreground)]"><div className="panel max-w-lg p-8 text-center"><h1 className="text-2xl font-bold">VoxMint could not load</h1><p className="mt-3 text-sm text-[var(--foreground-secondary)]">A temporary application error occurred. Your saved workspace data has not been removed.</p><button type="button" className="button-primary mt-6 px-5" onClick={() => unstable_retry()}>Try again</button></div></main></body></html>;
}
