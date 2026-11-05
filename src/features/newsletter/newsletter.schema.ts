import { z } from "zod";

export const subscribeSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(200),
  turnstileToken: z.string().max(4096).nullish(),
});
