import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ToolChip } from "@/lib/tools";

export function ToolStatus({ tools }: { tools: ToolChip[] }) {
  if (!tools.length) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {tools.map((tool) => (
        <Badge
          key={tool.id}
          variant={tool.status === "running" ? "running" : tool.status}
        >
          {tool.status === "running" ? (
            <Loader2 className="size-3 animate-spin" />
          ) : tool.status === "ok" ? (
            <span>✓</span>
          ) : (
            <span>✕</span>
          )}
          {tool.label}
        </Badge>
      ))}
    </div>
  );
}
