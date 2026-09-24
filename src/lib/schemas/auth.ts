import { z } from "zod"
import { USER_ROLES, SHEPHERD_CATEGORIES, ORG_LEVELS, TITLES } from "@/lib/constants"

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

export const CreateUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  title: z.enum(TITLES).optional(),
  email: z.string().email("Invalid email address"),
  role: z.enum(USER_ROLES),
  organizationId: z.string().length(24, "Invalid organization ID"),
  organizationLevel: z.enum(ORG_LEVELS),
  shepherdCategory: z.enum(SHEPHERD_CATEGORIES).optional(),
  whatsappPhone: z
    .string()
    .regex(/^\+?[0-9]{10,15}$/, "Invalid phone number")
    .optional(),
})

export const ResetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export const SetupAccountSchema = z
  .object({
    token: z.string().min(1, "Missing setup token"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export type LoginInput = z.infer<typeof LoginSchema>
export type CreateUserInput = z.infer<typeof CreateUserSchema>
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>
export type SetupAccountInput = z.infer<typeof SetupAccountSchema>
