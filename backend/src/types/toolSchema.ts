import * as z from "zod";

export const ReadSchema = z.object({
  path: z.string().min(1),
});

export const WriteSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
});

export const BashSchema = z.object({
  command: z.string().min(1),
});

export const DiffApplySchema = z.object({
  path: z.string().min(1),
  diff: z.string().min(1),
});
