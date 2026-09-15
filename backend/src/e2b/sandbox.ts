import { Sandbox } from "e2b";
import { E2B_TEMPLATE } from "../config/constant";

const PREVIEW_PORT = 5173;
const TIMEOUT_MS = 5 * 60 * 1000;

const lifecycle = {
  onTimeout: { action: "pause" as const, keepMemory: false },
};

function toPreview(sandbox: Sandbox) {
  return {
    sandbox,
    e2bSandboxId: sandbox.sandboxId,
    previewUrl: `https://${sandbox.getHost(PREVIEW_PORT)}`,
  };
}


/**
 * 
 * 
 * - sandbox.commands.run(cmd,{timeoutMs:8000}) executes remotely in sandbox, not locally. Returns {exitCode}.
- Cmd: node -e "fetch('http://127.0.0.1:5173')...":
- node -e runs inline JS without a file.
- fetch(127.0.0.1:5173) — loopback to Vite default port PREVIEW_PORT. fetch rejects only on network-refused, not on HTTP 404/500, so any response = server up.
- .then(exit 0) / .catch(exit 1) maps to Unix convention: 0=success.
- return exitCode===0 -> true=up.
Used by ensureVite():27-48: if down, npm run dev & in background, then poll 20 x 500ms until viteIsUp().
 */

async function viteIsUp(sandbox: Sandbox) {
  const result = await sandbox.commands.run(
    `node -e "fetch('http://127.0.0.1:5173').then(()=>process.exit(0)).catch(()=>process.exit(1))"`,
    { timeoutMs: 8000 },
  );
  return result.exitCode === 0;
}

export async function ensureVite(sandbox: Sandbox) {
  try {
    if (await viteIsUp(sandbox)) return;
  } catch {
    // vite is down
  }

  await sandbox.commands.run("npm run dev", {
    cwd: "/home/user/project",
    background: true,
    timeoutMs: 0,
  });

  for (let i = 0; i < 20; i++) {
    try {
      if (await viteIsUp(sandbox)) return;
    } catch {
      // still starting
    }
    await new Promise((r) => setTimeout(r, 500));
  }
}

export async function createProjectSandbox() {
  const sandbox = await Sandbox.create(E2B_TEMPLATE, {
    timeoutMs: TIMEOUT_MS,
    lifecycle,
  });
  return toPreview(sandbox);
}

export async function connectProjectSandbox(e2bSandboxId: string) {
  const sandbox = await Sandbox.connect(e2bSandboxId, {
    timeoutMs: TIMEOUT_MS,
  });
  await ensureVite(sandbox);
  return toPreview(sandbox);
}

export async function restoreFromSnapshot(snapshotId: string) {
  const sandbox = await Sandbox.create(snapshotId, {
    timeoutMs: TIMEOUT_MS,
    lifecycle,
  });
  await ensureVite(sandbox);
  return toPreview(sandbox);
}

export async function getLiveProjectSandbox(opts: {
  e2bSandboxId: string;
  snapshotId?: string | null;
}) {
  try {
    return await connectProjectSandbox(opts.e2bSandboxId);
  } catch (error) {
    console.log(error);
    if (!opts.snapshotId) throw error;
    return restoreFromSnapshot(opts.snapshotId);
  }
}

export async function deleteProjectSnapshot(snapshotId: string) {
  try {
    await Sandbox.deleteSnapshot(snapshotId);
  } catch (error) {
    console.log(error);
  }
}

export async function createProjectSnapshot(
  e2bSandboxId: string,
  previousSnapshotId?: string | null,
) {
  const snapshot = await Sandbox.createSnapshot(e2bSandboxId);
  if (previousSnapshotId && previousSnapshotId !== snapshot.snapshotId) {
    await deleteProjectSnapshot(previousSnapshotId);
  }
  return snapshot.snapshotId;
}

export async function killProjectSandbox(e2bSandboxId: string) {
  try {
    const sandbox = await Sandbox.connect(e2bSandboxId);
    await sandbox.kill();
  } catch (error) {
    console.log(error);
  }
}

export async function pauseProjectSandbox(e2bSandboxId: string) {
  try {
    const sandbox = await Sandbox.connect(e2bSandboxId);
    await sandbox.pause({ keepMemory: false });
  } catch (error) {
    console.log(error);
  }
}
