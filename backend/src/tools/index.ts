import type { Sandbox } from "e2b";
import { readProjectFile, writeProjectFile } from "../e2b/filesystem";
import {
  BashSchema,
  DiffApplySchema,
  ReadSchema,
  WriteSchema,
} from "../types/toolSchema";
import { applyPatch } from "diff";

export async function executeTool(
  sandbox: Sandbox,
  name: string,
  args: unknown,
) {
  try {
    if (name === "read") {
      const { path } = ReadSchema.parse(args);
      const content = await readProjectFile(sandbox, path);
      return { ok: true, path, content };
    }

    if (name === "write") {
      const { path, content } = WriteSchema.parse(args);
      await writeProjectFile(sandbox, path, content);
      return { ok: true, path };
    }

    if (name === "bash") {
      const { command } = BashSchema.parse(args);
      const result = await sandbox.commands.run(command, {
        cwd: "/home/user/project",
        timeoutMs: 60_000,
      });
      return {
        ok: result.exitCode === 0,
        command,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
      };
    }
    if (name === "diff_apply") {
      const { path, diff } = DiffApplySchema.parse(args);
      const current = await readProjectFile(sandbox, path);
      const next = applyModelPatch(current, diff);

      if (next === false || next === current) {
        return { ok: false, path, error: "patch did not apply" };
      }

      await writeProjectFile(sandbox, path, next);
      return { ok: true, path };
    }
    return { ok: false, error: `unknown tool: ${name}` };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "tool failed",
    };
  }
}

//helper
function applyModelPatch(current: string, diff: string) {
  const cleaned = diff
    .replace(/^```(?:diff)?\n?/m, "")
    .replace(/```$/m, "")
    .trim();

  const oldLines: string[] = [];
  const newLines: string[] = [];

  for (const line of cleaned.split("\n")) {
    if (
      line.startsWith("***") ||
      line.startsWith("@@") ||
      line.startsWith("---") ||
      line.startsWith("+++") ||
      line.startsWith("diff ") ||
      line.startsWith("index ")
    ) {
      continue;
    }

    if (line.startsWith("-")) oldLines.push(line.slice(1));
    else if (line.startsWith("+")) newLines.push(line.slice(1));
    else if (line.startsWith(" ")) {
      oldLines.push(line.slice(1));
      newLines.push(line.slice(1));
    }
  }

  const oldBlock = oldLines.join("\n");
  const newBlock = newLines.join("\n");

  if (oldBlock && current.includes(oldBlock)) {
    return current.replace(oldBlock, newBlock);
  }

  const patched = applyPatch(current, cleaned);
  if (patched === false) return false;
  return patched;
}
