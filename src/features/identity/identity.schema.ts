import { z } from "zod";
import { formCheckbox, formInt, formText } from "@/lib/validation";
import { adminRoleEnum } from "@/server/db/schema";

export const PASSWORD_MIN = 10;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(1).max(200),
});

export const verifyCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{3}\s?\d{3}$/, "Enter the 6-digit code from the email."),
  rememberDevice: z.boolean().default(false),
});

export const changePasswordSchema = z.object({
  current: formText(z.string().min(1, "Enter your current password.")),
  next: formText(
    z.string().min(PASSWORD_MIN, `New password needs at least ${PASSWORD_MIN} characters.`).max(200),
  ),
});

export const addAdminSchema = z.object({
  email: formText(z.string().email("Enter a valid email.").max(200)).transform((s) => s.toLowerCase()),
  name: formText(z.string().max(120)).transform((s) => s || "Staff"),
  password: formText(
    z.string().min(PASSWORD_MIN, `Password needs at least ${PASSWORD_MIN} characters.`).max(200),
  ),
  role: z.enum(adminRoleEnum.enumValues).default("agent"),
});

export const updateStaffSchema = z.object({
  id: formInt(0, z.number().int().positive()),
  role: z.enum(adminRoleEnum.enumValues),
  isActive: formCheckbox(),
});
