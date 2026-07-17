import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";

const root = process.cwd();
const healthUrl = "http://127.0.0.1:3000/api/health/live";
let ownedServer: ChildProcess | null = null;
let serverOutput = "";

async function isVoxMintReady(): Promise<boolean> {
  try {
    const response = await fetch(healthUrl, { signal: AbortSignal.timeout(1_500) });
    return response.ok && await response.text() === '{"status":"ok"}';
  } catch {
    return false;
  }
}

async function startServerIfNeeded(): Promise<void> {
  if (await isVoxMintReady()) return;
  const nextBin = resolve(root, "node_modules/next/dist/bin/next");
  ownedServer = spawn(process.execPath, [nextBin, "dev", "--hostname", "127.0.0.1"], {
    cwd: root,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    detached: process.platform !== "win32",
  });
  const capture = (chunk: Buffer) => {
    serverOutput = `${serverOutput}${chunk.toString("utf8")}`.slice(-20_000);
  };
  ownedServer.stdout?.on("data", capture);
  ownedServer.stderr?.on("data", capture);

  for (let attempt = 0; attempt < 90; attempt += 1) {
    if (await isVoxMintReady()) return;
    if (ownedServer.exitCode !== null) break;
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  throw new Error(`The read-only VoxMint server did not become ready.\n${serverOutput}`);
}

function stopOwnedServer(): void {
  if (!ownedServer?.pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(ownedServer.pid), "/t", "/f"], {
      windowsHide: true,
      stdio: "ignore",
    });
  } else {
    try {
      process.kill(-ownedServer.pid, "SIGKILL");
    } catch {
      // The server already stopped.
    }
  }
}

try {
  await startServerIfNeeded();
  const playwrightCli = resolve(root, "node_modules/@playwright/test/cli.js");
  const result = spawnSync(process.execPath, [playwrightCli, "test", "--config=playwright.readonly.config.ts", ...process.argv.slice(2)], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  stopOwnedServer();
}

process.exit(process.exitCode ?? 0);
