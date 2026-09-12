import path from "node:path";
import type { Sandbox } from "e2b";

const ROOT = "/home/user/project";

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
