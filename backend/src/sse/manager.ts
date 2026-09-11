import type { Response } from "express";

const clients = new Map<string, Set<Response>>();

export function addClient(conversationId: string, res: Response) {
  const set = clients.get(conversationId) ?? new Set();
  set.add(res);
  clients.set(conversationId, set);
}

export function removeClient(conversationId: string, res: Response) {
  const set = clients.get(conversationId);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) clients.delete(conversationId);
}

export function emit(conversationId: string, event: string, data: unknown) {
  const set = clients.get(conversationId);
  if (!set) return;

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of set) {
    res.write(payload);
  }
}
