import * as z from "zod";

export const CreateMessageSchema = z.object({
  content: z.string().min(1),
});
