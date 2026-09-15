import path from "node:path";
import type { Sandbox } from "e2b";

const ROOT = "/home/user/project";

/**
 * path.posix — forces Linux /-style paths, not OS-dependent path.normalize (which is \ on Windows).
 *  Needed because E2B sandbox is Linux even if backend runs on Mac/Windows.

normalize(p) — pure string cleanup, no disk access: collapses //, resolves ./..:
"/a//b/../c" -> "/a/c", "src/../index.ts" -> "index.ts".
join(ROOT, raw) — ROOT + "/" + raw then normalized, so relative LLM input becomes absolute before the startsWith(ROOT+"/") jail check.
 */

export function resolveProjectPath(input: string) {
  const raw = input.trim().replaceAll("\\", "/");
  const resolved = raw.startsWith("/")
    ? path.posix.normalize(raw)
    : path.posix.normalize(path.posix.join(ROOT, raw));

  if (resolved !== ROOT && !resolved.startsWith(ROOT + "/")) {
    throw new Error("invalid path");
  }

  return resolved;
}

export async function readProjectFile(sandbox: Sandbox, input: string) {
  return sandbox.files.read(resolveProjectPath(input));
}

export async function writeProjectFile(
  sandbox: Sandbox,
  input: string,
  content: string,
) {
  await sandbox.files.write(resolveProjectPath(input), content);
}
