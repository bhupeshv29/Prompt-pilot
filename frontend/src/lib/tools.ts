export type ToolStatusKind = "running" | "ok" | "fail";

export type ToolChip = {
  id: string;
  tool: string;
  label: string;
  status: ToolStatusKind;
};

function fileName(path: string) {
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] || path;
}

export function toolLabel(tool: string, input?: unknown) {
  const args = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const verbs: Record<string, string> = {
    read: "Read",
    write: "Write",
    bash: "Run",
    diff_apply: "Patch",
    question: "Ask",
  };
  const verb = verbs[tool] ?? tool;

  if (typeof args.path === "string" && args.path.trim()) {
    return `${verb} ${fileName(args.path)}`;
  }
  if (typeof args.command === "string" && args.command.trim()) {
    const cmd = args.command.trim().split(/\s+/)[0];
    return `${verb} ${cmd}`;
  }
  return verb;
}
