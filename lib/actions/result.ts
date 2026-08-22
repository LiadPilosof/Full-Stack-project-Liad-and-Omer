import { z } from "zod";

export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: string;
      code: ErrorCode;
      fieldErrors?: Record<string, string[]>;
    };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(
  code: ErrorCode,
  error: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<never> {
  return { ok: false, code, error, fieldErrors };
}

export function fromZod<T>(error: z.ZodError<T>): ActionResult<never> {
  const { formErrors, fieldErrors } = z.flattenError(error);

  const perField: Record<string, string[]> = {};
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (Array.isArray(messages) && messages.length > 0) {
      perField[field] = messages as string[];
    }
  }

  const first = Object.values(perField)[0]?.[0] ?? formErrors[0];
  return fail(
    "VALIDATION",
    first ?? "Please check the highlighted fields.",
    perField,
  );
}
