import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Enter the full name"),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._-]{3,30}$/, "3-30 letters, numbers, dot, dash or underscore"),
  phone: z.string().trim().optional(),
  password: z.string().min(8, "At least 8 characters"),
  role: z.enum(["TREASURER", "COLLECTOR"]),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
