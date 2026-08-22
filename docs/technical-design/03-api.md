# API Design — Server Actions, Route Handlers, RPCs

## 1. When to use which

| Mechanism | Used for | Why |
| --- | --- | --- |
| **Server Component data fetching** | every read that renders a page | No endpoint to write, no client-side fetch, payroll data never enters a JS bundle |
| **Server Action** | every mutation triggered by a form | Progressive enhancement, automatic CSRF protection, `revalidatePath` in the same round trip |
| **Route Handler** | file downloads, webhooks, cron, health | Needs real HTTP semantics: redirects, streaming, `Cache-Control`, external callers |
| **Postgres RPC** | state transitions with invariants | Needs row locks and multi-statement atomicity (see `02-rls.md`) |

We deliberately do **not** build a REST CRUD API over the tables. Supabase already
exposes PostgREST guarded by RLS; adding hand-written `/api/employees` routes would
mean a third place to enforce authorization and the most likely place to forget.

## 2. The action contract

Server Actions never throw across the boundary. Throwing produces a generic
"An error occurred in the Server Components render" in production, which is
useless to the user and to us. Instead every action returns a discriminated union:

```ts
// lib/actions/result.ts
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: ErrorCode; fieldErrors?: Record<string, string[]> };

export type ErrorCode =
  | "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND"
  | "VALIDATION" | "CONFLICT" | "RATE_LIMITED" | "INTERNAL";
```

Every action is composed from the same middleware so authentication, validation,
role checking, and error mapping cannot be skipped by accident:

```ts
// lib/actions/wrap.ts
export function action<TIn extends ZodTypeAny, TOut>(config: {
  schema: TIn;
  roles?: AppRole[];
  handler: (input: z.infer<TIn>, ctx: ActionContext) => Promise<TOut>;
}) {
  return async (raw: unknown): Promise<ActionResult<TOut>> => {
    try {
      const ctx = await requireContext();               // session + membership or throw
      if (config.roles && !config.roles.includes(ctx.role)) {
        return fail("FORBIDDEN", "You do not have access to this action.");
      }
      const parsed = config.schema.safeParse(raw);
      if (!parsed.success) return fromZod(parsed.error); // -> VALIDATION + fieldErrors
      return { ok: true, data: await config.handler(parsed.data, ctx) };
    } catch (e) {
      return mapError(e);                                // PG codes -> ErrorCode
    }
  };
}
```

`mapError` translates Postgres reality into product language:

| Postgres | `ErrorCode` | Message shown |
| --- | --- | --- |
| `42501` insufficient privilege (RLS) | `FORBIDDEN` | "You do not have permission to do that." |
| `23505` unique violation | `CONFLICT` | Context-specific, e.g. "This employee already has a pay slip for March 2026." |
| `23P01` exclusion violation | `CONFLICT` | "You already have a request covering these dates." |
| `23503` foreign key violation | `NOT_FOUND` | "That employee no longer exists." |
| `P0001` raised by our RPCs | mapped by message | "This request was already decided by someone else." |
| anything else | `INTERNAL` | "Something went wrong. Please try again." + logged with a trace id |

The `42501` row is the safety net that matters: even if a role check is missing
from an action, RLS rejects the statement and the user gets a clean 403 instead of
silent data corruption.

## 3. Actions by role

All actions live in `lib/actions/` grouped by domain, each file starting with
`"use server"`.

### Shared / any authenticated user

| Action | Input | Effect |
| --- | --- | --- |
| `updateMyProfile` | `{ fullName, phone, locale }` | Updates own `profiles` row |
| `getPayslipDownloadUrl` | `{ payslipId }` | Verifies visibility via RLS read, mints a 60s signed URL, audit-logs `payslip.download` |
| `getDocumentDownloadUrl` | `{ documentId }` | Same for `documents` |

### Employee

| Action | Input | Notes |
| --- | --- | --- |
| `submitTimeOffRequest` | `{ leaveTypeId, startDate, endDate, reason? }` | Server recomputes `working_days` from the company calendar — never trusts the client's number. Checks balance, then inserts as `pending`. |
| `cancelTimeOffRequest` | `{ requestId }` | Calls `cancel_time_off` RPC; only while `pending` |

```ts
// lib/actions/time-off.ts
"use server";

export const submitTimeOffRequest = action({
  schema: timeOffRequestSchema,
  roles: ["employee", "manager", "bookkeeper"],
  async handler(input, ctx) {
    const employeeId = await requireEmployeeId(ctx);

    const workingDays = await calcWorkingDays(ctx.supabase, {
      companyId: ctx.companyId,
      start: input.startDate,
      end: input.endDate,
    });
    if (workingDays === 0) {
      throw new AppError("VALIDATION", "Those dates contain no working days.");
    }

    const balance = await getLeaveBalance(ctx.supabase, employeeId, input.leaveTypeId);
    if (balance.available_days < workingDays) {
      throw new AppError(
        "VALIDATION",
        `You have ${balance.available_days} days available but requested ${workingDays}.`,
      );
    }

    const { data, error } = await ctx.supabase
      .from("time_off_requests")
      .insert({
        company_id: ctx.companyId,
        employee_id: employeeId,
        leave_type_id: input.leaveTypeId,
        start_date: input.startDate,
        end_date: input.endDate,
        working_days: workingDays,
        reason: input.reason ?? null,
      })
      .select("id")
      .single();
    if (error) throw error;   // 23P01 overlap -> CONFLICT, 42501 -> FORBIDDEN

    revalidatePath("/employee/time-off");
    revalidatePath("/manager/approvals");
    return data;
  },
});
```

The balance check is a **friendly** pre-check, not the security boundary. It races
(two tabs could both pass it), and that is fine: the exclusion constraint catches
the overlapping case in the database, and a manager reviews every request anyway.
Design principle — application checks exist to give good error messages, database
constraints exist to guarantee correctness. Confusing the two is how race
conditions ship.

### Manager

| Action | Input | Notes |
| --- | --- | --- |
| `approveTimeOffRequest` | `{ requestId, note? }` | `rpc('decide_time_off', { p_approve: true })` |
| `rejectTimeOffRequest` | `{ requestId, note }` | Note required when rejecting — a bare "no" is a bad manager experience |

That is the manager's entire write surface: two actions, both funnelled through
one RPC. Everything else in the manager view is a read.

### Bookkeeper

| Action | Input | Notes |
| --- | --- | --- |
| `createEmployee` | employee fields | Validates unique `employee_number` per company |
| `inviteUserToEmployee` | `{ employeeId, email, role }` | `service_role` admin invite, then links `membership_id` |
| `createPayrollPeriod` | `{ year, month }` | Idempotent on `(company, year, month)` |
| `uploadPayslip` | `FormData` with `file` | Validates MIME + size + magic bytes, sha256 for duplicate detection, uploads to Storage, inserts `unassigned` row |
| `assignPayslip` | `{ payslipId, employeeId }` | Moves the object to the employee's path prefix, sets `status = 'assigned'` |
| `upsertPayslipComponents` | `{ payslipId, components[] }` | Totals recomputed by trigger |
| `updateSalaryMetrics` | `{ payslipId, gross?, net?, deductions?, employerCost? }` | Manual override for pay slips without a component breakdown |
| `publishPayrollPeriod` | `{ periodId }` | Refuses if any pay slip is still `unassigned`; flips period + its pay slips to `published` |
| `upsertLeaveEntitlement` | `{ employeeId, leaveTypeId, year, entitledDays, carriedOverDays, adjustmentDays, note? }` | Audit-logged with before/after |
| `uploadDocument` | `FormData` | Forms 106/101, contracts |
| `searchEmployees` | `{ query }` | Trigram search over name + `employee_number` for the assignment combobox |

`publishPayrollPeriod` is the highest-consequence action in the app — it makes data
visible to every employee at once — so it is the one that refuses to run on
incomplete input:

```ts
export const publishPayrollPeriod = action({
  schema: z.object({ periodId: z.string().uuid() }),
  roles: ["bookkeeper"],
  async handler({ periodId }, ctx) {
    const { count } = await ctx.supabase
      .from("payslips")
      .select("id", { count: "exact", head: true })
      .eq("period_id", periodId)
      .eq("status", "unassigned");

    if ((count ?? 0) > 0) {
      throw new AppError(
        "VALIDATION",
        `${count} pay slip(s) are not assigned to an employee yet.`,
      );
    }
    await ctx.supabase.rpc("publish_payroll_period", { p_period_id: periodId });
    revalidatePath("/bookkeeper/periods");
    return { published: true };
  },
});
```

The actual flip lives in a `publish_payroll_period` RPC so that updating the period
row and all its pay slip rows happens in one transaction. Two separate
`supabase.from(...).update()` calls could leave a period marked published with
pay slips still hidden.

### Upload validation

Client-side MIME type is a hint, not a fact. `uploadPayslip` checks, in order:

1. `file.size` within 1 byte – 10 MB.
2. Declared type is `application/pdf`.
3. **Magic bytes**: the first four bytes are `%PDF`. This is the check that stops a
   renamed executable, since steps 1–2 are attacker-controlled.
4. sha256 of the buffer against `payslips.file_checksum` in the same company —
   catches the bookkeeper re-uploading the same file twice.
5. Only then upload to Storage, then insert the row.

Storage-then-database ordering means a failed insert leaves an orphaned object
rather than a database row pointing at a missing file. Orphans are harmless and
swept by a weekly cron; a row with a dead `file_path` is a broken download button
for a real user.

## 4. Route Handlers

| Route | Method | Purpose |
| --- | --- | --- |
| `/auth/callback` | GET | Exchanges the magic-link code for a session cookie, redirects to the role's home |
| `/auth/signout` | POST | Clears the session |
| `/api/payslips/[id]/download` | GET | Authorizes, then `307` redirects to a signed URL — gives us a stable, shareable-looking link and one audit point |
| `/api/documents/[id]/download` | GET | Same for documents |
| `/api/cron/accrue-leave` | POST | Monthly accrual; `service_role`; guarded by `CRON_SECRET` bearer token |
| `/api/health` | GET | Returns build sha + a trivial DB round trip, for uptime checks |

Cron routes verify the secret in constant time and return 401 otherwise, because
they run with `service_role` and are the one place an unauthenticated caller could
cause a privileged write:

```ts
export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  const ok =
    auth.length === expected.length &&
    timingSafeEqual(Buffer.from(auth), Buffer.from(expected));
  if (!ok) return new Response("Unauthorized", { status: 401 });
  // ...
}
```

## 5. CRUD matrix

Read as: who may perform each operation, after RLS. "—" means no path exists.

| Entity | Create | Read | Update | Delete |
| --- | --- | --- | --- | --- |
| `profiles` | auth trigger | self, manager (reports), bookkeeper | self | account deletion cascade |
| `memberships` | bookkeeper (invite) | self, bookkeeper | bookkeeper (`is_active`, `role`) | bookkeeper |
| `employees` | bookkeeper | self, manager (reports), bookkeeper | bookkeeper | — (status `terminated` instead) |
| `payroll_periods` | bookkeeper | all members | bookkeeper (until `locked`) | bookkeeper (if empty) |
| `payslips` | bookkeeper | self+manager if published, bookkeeper always | bookkeeper (until period `locked`) | bookkeeper (unassigned only) |
| `payslip_components` | bookkeeper | inherits parent | bookkeeper | bookkeeper |
| `leave_types` | bookkeeper | all members | bookkeeper | — (`is_active = false`) |
| `leave_entitlements` | bookkeeper | self, manager (reports), bookkeeper | bookkeeper | bookkeeper |
| `time_off_requests` | **employee (self, pending)** | self, manager (reports), bookkeeper | **RPC only** — manager decides, employee cancels | — (`cancelled` instead) |
| `documents` | bookkeeper | self, manager (reports), bookkeeper | bookkeeper | bookkeeper |
| `audit_log` | RPCs only | bookkeeper | — | — |

Three patterns visible in this table are intentional:

- **Almost nothing is truly deleted.** Payroll and leave records are financial and
  legal history; `status`/`is_active` columns replace `DELETE` so an audit six
  months later still has data to look at.
- **Employees create exactly one kind of row.** The entire employee write surface is
  one insert into `time_off_requests`. That is what makes the security story small
  enough to reason about.
- **Update on `time_off_requests` is RPC-only,** because it is the only entity in the
  system with a state machine.
