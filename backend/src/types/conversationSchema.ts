import * as z from "zod";

export const CreateConversationSchema = z.object({
  title: z.string().min(1).optional(),
});
