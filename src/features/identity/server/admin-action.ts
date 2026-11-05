import "server-only";
import type { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { firstError, formToObject } from "@/lib/validation";
import { AppError, ForbiddenError } from "@/server/errors";
import { requireAdmin, type SessionAdmin } from "./auth";
import { can, type Permission } from "./permissions";

type Ctx = { admin: SessionAdmin };

/**
 * Wraps an admin form action for `useActionState`: checks the session and the permission,
 * parses the form with Zod, and turns expected errors into a message. Unexpected errors still throw.
 */
export function adminFormAction<S extends z.ZodTypeAny>(
  permission: Permission | null,
  schema: S,
  handler: (input: z.infer<S>, ctx: Ctx) => Promise<ActionState>,
) {
  return async (_prev: ActionState, formData: FormData): Promise<ActionState> => {
    const admin = await requireAdmin();
    if (permission && !can(admin.role, permission)) return { error: new ForbiddenError().message };
    const parsed = schema.safeParse(formToObject(formData));
    if (!parsed.success) return { error: firstError(parsed.error) };
    try {
      return await handler(parsed.data, { admin });
    } catch (err) {
      if (err instanceof AppError) return { error: err.message };
      throw err;
    }
  };
}

/** Same checks for actions called with plain arguments (toggles, deletes). Throws on failure. */
export function adminCommand<S extends z.ZodTypeAny, R>(
  permission: Permission,
  schema: S,
  handler: (input: z.infer<S>, ctx: Ctx) => Promise<R>,
) {
  return async (input: z.input<S>): Promise<R> => {
    const admin = await requireAdmin();
    if (!can(admin.role, permission)) throw new ForbiddenError();
    return handler(schema.parse(input), { admin });
  };
}
