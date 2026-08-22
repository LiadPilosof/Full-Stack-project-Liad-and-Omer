import { z } from "zod";

export const bookkeeperSignupSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, { message: "Full name must be at least 2 characters" })
      .max(120, { message: "Full name is too long" }),
    email: z
      .string()
      .trim()
      .email({ message: "Invalid email address" }),
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters" }),
    confirmPassword: z
      .string()
      .min(6, { message: "Confirm password must be at least 6 characters" }),
    phone: z
      .string()
      .trim()
      .regex(/^$|^\+?[0-9\-\s]{7,20}$/, { message: "Invalid phone number" })
      .optional()
      .or(z.literal("")),
    companyName: z
      .string()
      .trim()
      .min(2, { message: "Company / Firm name must be at least 2 characters" }),
    taxId: z
      .string()
      .trim()
      .min(5, { message: "Tax ID / Registration number must be at least 5 characters" })
      .max(20, { message: "Tax ID is too long" }),
    terms: z.boolean().refine((val) => val === true, {
      message: "You must accept the Terms of Service and Privacy Policy",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type BookkeeperSignupInput = z.infer<typeof bookkeeperSignupSchema>;

export const workerSignupSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, { message: "Full name must be at least 2 characters" })
      .max(120, { message: "Full name is too long" }),
    email: z
      .string()
      .trim()
      .email({ message: "Invalid email address" }),
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters" }),
    confirmPassword: z
      .string()
      .min(6, { message: "Confirm password must be at least 6 characters" }),
    phone: z
      .string()
      .trim()
      .regex(/^$|^\+?[0-9\-\s]{7,20}$/, { message: "Invalid phone number" })
      .optional()
      .or(z.literal("")),
    companyTaxId: z
      .string()
      .trim()
      .min(2, { message: "Please enter company Tax ID or company name" }),
    role: z.enum(["employee", "manager"], {
      message: "Please select your role: Worker or Manager",
    }),
    jobTitle: z.string().trim().max(80).optional().or(z.literal("")),
    department: z.string().trim().max(80).optional().or(z.literal("")),
    employeeNumber: z.string().trim().max(30).optional().or(z.literal("")),
    terms: z.boolean().refine((val) => val === true, {
      message: "You must accept the Terms of Service and Privacy Policy",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type WorkerSignupInput = z.infer<typeof workerSignupSchema>;
