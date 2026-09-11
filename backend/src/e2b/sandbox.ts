import { Sandbox } from "e2b";
import { E2B_TEMPLATE } from "../config/constant";

const PREVIEW_PORT = 5173;
const TIMEOUT_MS = 60 * 60 * 1000;

function toPreview(sandbox: Sandbox) {
  return {
    e2bSandboxId: sandbox.sandboxId,
    previewUrl: `https://${sandbox.getHost(PREVIEW_PORT)}`,
  };
}

export async function createProjectSandbox() {
  const sandbox = await Sandbox.create(E2B_TEMPLATE, {
    timeoutMs: TIMEOUT_MS,
  });
  return toPreview(sandbox);
}

export async function connectProjectSandbox(e2bSandboxId: string) {
  const sandbox = await Sandbox.connect(e2bSandboxId, {
    timeoutMs: TIMEOUT_MS,
  });
  return toPreview(sandbox);
}

export async function killProjectSandbox(e2bSandboxId: string) {
  try {
    const sandbox = await Sandbox.connect(e2bSandboxId);
    await sandbox.kill();
  } catch (error) {
    console.log(error);
  }
}
