import * as z from "zod";

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, { error: "Username must be at least 3 characters long" })
    .max(20, { error: "Username cannot exceed 20 characters" })
    .regex(/^[a-zA-Z0-9_-]+$/, {
      error:
        "Username can only contain letters, numbers, underscores, and hyphens",
    }),
  password: z
    .string()
    .min(8, { error: "Password must be at least 8 characters long" })
    .max(100, { error: "Password is too long" }),
  email: z
    .string()
    .trim()
    .email({ error: "Invalid email address" })
    .optional()
    .or(z.literal("")),
});

export const loginSchema = z.object({
  username: z.string().trim().min(1, { error: "Username is required" }),
  password: z.string().min(1, { error: "Password is required" }),
});

export const adminLoginSchema = z.object({
  token: z.string().min(1, { error: "Admin token cannot be empty" }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
