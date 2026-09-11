import * as z from "zod";

export const AuthSchema = z.object({
  email: z.email(),
  password: z.string().min(6, "Atleast 6 character is required"),
});
