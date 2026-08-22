# Row Level Security

This is the security-critical part of the design. The rule we hold ourselves to:
**if every line of TypeScript in this repo were deleted and replaced with a raw
Postgres connection using a valid employee JWT, that employee still could not
read anyone else's salary.**

## 1. Baseline posture

```sql
alter table profiles            enable row level security;
alter table companies           enable row level security;
alter table memberships         enable row level security;
alter table employees           enable row level security;
alter table payroll_periods     enable row level security;
alter table payslips            enable row level security;
alter table payslip_components  enable row level security;
alter table leave_types         enable row level security;
alter table leave_entitlements  enable row level security;
alter table time_off_requests   enable row level security;
alter table documents           enable row level security;
alter table company_holidays    enable row level security;
alter table audit_log           enable row level security;
```

RLS enabled with no policy means deny-all, which is the state we want as the
default. Policies then grant narrowly. A CI check asserts that every table in
`public` has `relrowsecurity = true`, so adding a table without RLS fails the
build rather than shipping open.

`anon` gets no policies anywhere. Everything below is `to authenticated`.

## 2. Helper functions

Policies need to answer "what is this user allowed to do here?" without querying
a table that is itself protected by the policy being evaluated. Two techniques:

1. **`security definer`** — the function runs as its owner (`postgres`, which is
   `BYPASSRLS`), so a policy on `memberships` can call a function that reads
   `memberships` without infinite recursion. This is the standard Supabase
   pattern and the reason we do not get "infinite recursion detected in policy".
2. **Pinned `search_path`** — without `set search_path`, a user who can create
   objects could shadow `public.memberships` with their own table and the definer
   function would happily read it. Every definer function pins its path.

They live in a private `app` schema that is *not* in PostgREST's exposed schemas,
so they cannot be called over HTTP as RPCs.

```sql
create schema if not exists app;
grant usage on schema app to authenticated;

-- Does the current user hold one of these roles in this company?
create or replace function app.has_role(p_company uuid, p_roles app_role[])
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from memberships m
    where m.profile_id = (select auth.uid())
      and m.company_id = p_company
      and m.is_active
      and m.role = any(p_roles)
  );
$$;

-- The current user's own employee record in this company (null if none).
create or replace function app.my_employee_id(p_company uuid)
returns uuid
language sql stable security definer set search_path = public, pg_temp
as $$
  select e.id from employees e
  join memberships m on m.id = e.membership_id
  where m.profile_id = (select auth.uid())
    and m.is_active
    and e.company_id = p_company
  limit 1;
$$;

-- All employee records belonging to the current user, across companies.
create or replace function app.my_employee_ids()
returns setof uuid
language sql stable security definer set search_path = public, pg_temp
as $$
  select e.id from employees e
  join memberships m on m.id = e.membership_id
  where m.profile_id = (select auth.uid()) and m.is_active;
$$;

-- Is the current user the direct manager of this employee?
create or replace function app.manages_employee(p_employee uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from employees target
    join employees mgr on mgr.id = target.manager_id
    join memberships m on m.id = mgr.membership_id
    where target.id = p_employee
      and m.profile_id = (select auth.uid())
      and m.is_active
      and m.role = 'manager'
  );
$$;

grant execute on all functions in schema app to authenticated;
```

Two performance notes that matter once a company has a few hundred employees:

- `(select auth.uid())` rather than bare `auth.uid()`. The subquery form is
  evaluated once as an InitPlan instead of once per row.
- All helpers are `stable`, so Postgres caches the result within a statement.

`manages_employee` checks **direct** reports only (one hop up `manager_id`). No
recursive CTE walking the whole org chart — a director should not silently gain
access to 200 people's salaries because of a transitive edge. Multi-level
visibility, if ever needed, becomes an explicit product decision with its own
table.

## 3. Policies by table

### `profiles`

```sql
create policy "profiles_select_self" on profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles_select_colleagues" on profiles for select to authenticated
  using (exists (
    select 1 from employees e
    join memberships m on m.id = e.membership_id
    where m.profile_id = profiles.id
      and (app.manages_employee(e.id) or app.has_role(e.company_id, array['bookkeeper']::app_role[]))
  ));

create policy "profiles_update_self" on profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
```

No insert policy: profiles are created only by the `auth.users` trigger.

### `memberships` and `companies`

```sql
create policy "memberships_select_own" on memberships for select to authenticated
  using (profile_id = (select auth.uid()));

create policy "memberships_select_by_bookkeeper" on memberships
  for select to authenticated
  using (app.has_role(company_id, array['bookkeeper']::app_role[]));

create policy "memberships_write_by_bookkeeper" on memberships
  for all to authenticated
  using (app.has_role(company_id, array['bookkeeper']::app_role[]))
  with check (app.has_role(company_id, array['bookkeeper']::app_role[]));

create policy "companies_select_members" on companies for select to authenticated
  using (app.has_role(id, array['employee','manager','bookkeeper']::app_role[]));
```

`memberships_write_by_bookkeeper` is the one place role escalation could happen,
so it needs both `using` (which existing rows you may touch) and `with check`
(what the row may look like afterwards) pinned to a company where you are already
a bookkeeper. Without the `with check`, a bookkeeper at company A could move a
membership row to company B.

### `employees` — three readers, one writer

```sql
create policy "employees_select_self" on employees for select to authenticated
  using (id in (select app.my_employee_ids()));

create policy "employees_select_team" on employees for select to authenticated
  using (app.manages_employee(id));

create policy "employees_select_bookkeeper" on employees for select to authenticated
  using (app.has_role(company_id, array['bookkeeper']::app_role[]));

create policy "employees_write_bookkeeper" on employees
  for all to authenticated
  using (app.has_role(company_id, array['bookkeeper']::app_role[]))
  with check (app.has_role(company_id, array['bookkeeper']::app_role[]));
```

Multiple `for select` policies are **OR**-ed, which is exactly the semantics we
want: you may read a row if you are that person, or their manager, or the
bookkeeper. Writing it as three small named policies rather than one long
`OR` expression means each one is independently readable and independently
testable — and the policy name shows up in `pg_policies`, so the test suite can
assert the set of policies has not changed.

Managers get `select` only. There is no update policy for them anywhere in the
schema; their entire write surface is the two leave-decision RPCs.

### `payroll_periods` and `payslips`

```sql
create policy "periods_select_members" on payroll_periods for select to authenticated
  using (app.has_role(company_id, array['employee','manager','bookkeeper']::app_role[]));

create policy "periods_write_bookkeeper" on payroll_periods for all to authenticated
  using (app.has_role(company_id, array['bookkeeper']::app_role[]))
  with check (app.has_role(company_id, array['bookkeeper']::app_role[]));

-- An employee sees their own pay slips, but only once published.
create policy "payslips_select_own_published" on payslips for select to authenticated
  using (
    employee_id in (select app.my_employee_ids())
    and status = 'published'
  );

-- A manager sees their direct reports' published pay slips.
create policy "payslips_select_team_published" on payslips for select to authenticated
  using (app.manages_employee(employee_id) and status = 'published');

-- The bookkeeper sees everything in their companies, including drafts.
create policy "payslips_select_bookkeeper" on payslips for select to authenticated
  using (app.has_role(company_id, array['bookkeeper']::app_role[]));

create policy "payslips_write_bookkeeper" on payslips for all to authenticated
  using (app.has_role(company_id, array['bookkeeper']::app_role[]))
  with check (
    app.has_role(company_id, array['bookkeeper']::app_role[])
    and uploaded_by = (select auth.uid())
  );
```

The `and status = 'published'` in the employee and manager policies is what makes
the draft workflow safe. A bookkeeper mid-upload has rows in the table that no
employee can see, enforced by the database rather than by remembering to add
`.eq('status','published')` in every query.

`payslip_components` inherits its parent's visibility:

```sql
create policy "components_select_via_parent" on payslip_components
  for select to authenticated
  using (exists (select 1 from payslips p where p.id = payslip_id));

create policy "components_write_bookkeeper" on payslip_components
  for all to authenticated
  using (exists (
    select 1 from payslips p
    where p.id = payslip_id
      and app.has_role(p.company_id, array['bookkeeper']::app_role[])
  ))
  with check (exists (
    select 1 from payslips p
    where p.id = payslip_id
      and app.has_role(p.company_id, array['bookkeeper']::app_role[])
  ));
```

The `exists (select 1 from payslips ...)` in the select policy looks like it
checks nothing, and that is the point: the inner query is itself subject to the
`payslips` policies, so it returns a row only if the caller may see the parent pay
slip. Visibility is defined once, on the parent, and cannot drift out of sync.

#### Why `file_path` being readable is not a leak

RLS is row-level, not column-level, so a manager who can see a team pay slip row
can read its `file_path`. That is acceptable because `file_path` is an opaque
object key with no authority of its own: downloading requires either a Storage
policy match or a signed URL, and both are checked independently (§4). The
`managers_can_view_payslip_files` flag is enforced in the Storage policy and in
the signed-URL RPC — never only in the UI.

### `leave_types`, `leave_entitlements`, `company_holidays`

```sql
create policy "leave_types_select_members" on leave_types for select to authenticated
  using (app.has_role(company_id, array['employee','manager','bookkeeper']::app_role[]));

create policy "leave_types_write_bookkeeper" on leave_types for all to authenticated
  using (app.has_role(company_id, array['bookkeeper']::app_role[]))
  with check (app.has_role(company_id, array['bookkeeper']::app_role[]));

create policy "entitlements_select_own" on leave_entitlements for select to authenticated
  using (employee_id in (select app.my_employee_ids()));

create policy "entitlements_select_team" on leave_entitlements for select to authenticated
  using (app.manages_employee(employee_id));

create policy "entitlements_select_bookkeeper" on leave_entitlements
  for select to authenticated
  using (app.has_role(company_id, array['bookkeeper']::app_role[]));

create policy "entitlements_write_bookkeeper" on leave_entitlements
  for all to authenticated
  using (app.has_role(company_id, array['bookkeeper']::app_role[]))
  with check (app.has_role(company_id, array['bookkeeper']::app_role[]));
```

`company_holidays` follows the same shape: read for all members, write for the
bookkeeper.

### `time_off_requests` — the only table employees write

```sql
create policy "requests_select_own" on time_off_requests for select to authenticated
  using (employee_id in (select app.my_employee_ids()));

create policy "requests_select_team" on time_off_requests for select to authenticated
  using (app.manages_employee(employee_id));

create policy "requests_select_bookkeeper" on time_off_requests
  for select to authenticated
  using (app.has_role(company_id, array['bookkeeper']::app_role[]));

-- Employees may create requests for themselves, always as 'pending'.
create policy "requests_insert_own_pending" on time_off_requests
  for insert to authenticated
  with check (
    employee_id in (select app.my_employee_ids())
    and status = 'pending'
    and decided_by is null
    and decided_at is null
    and start_date >= current_date
  );
```

Notice there is **no update and no delete policy on this table at all**, and we go
further:

```sql
revoke update, delete on time_off_requests from authenticated;
```

Every status change goes through a `security definer` RPC. The reason is that RLS
answers "may you touch this row?" but cannot express "you may change `status` from
`pending` to `approved` but never from `approved` back to `pending`, and you may
not set `decided_by` to someone else." State machines need procedural logic, so
we put them in functions and remove the raw write path entirely.

```sql
create or replace function public.decide_time_off(
  p_request_id uuid,
  p_approve boolean,
  p_note text default null
) returns time_off_requests
language plpgsql security definer set search_path = public, pg_temp
as $$
declare r time_off_requests;
begin
  select * into r from time_off_requests where id = p_request_id for update;
  if not found then
    raise exception 'REQUEST_NOT_FOUND' using errcode = 'P0002';
  end if;

  if not app.manages_employee(r.employee_id) then
    raise exception 'NOT_YOUR_TEAM' using errcode = '42501';
  end if;

  if r.status <> 'pending' then
    raise exception 'ALREADY_DECIDED' using errcode = 'P0001';
  end if;

  update time_off_requests set
    status = case when p_approve then 'approved' else 'rejected' end::request_status,
    decided_by = (select auth.uid()),
    decided_at = now(),
    decision_note = left(p_note, 500)
  where id = p_request_id
  returning * into r;

  insert into audit_log (company_id, actor_profile_id, action, entity, entity_id, diff)
  values (r.company_id, (select auth.uid()),
          case when p_approve then 'time_off.approve' else 'time_off.reject' end,
          'time_off_requests', r.id,
          jsonb_build_object('status', r.status, 'note', p_note));

  return r;
end $$;

revoke all on function public.decide_time_off(uuid, boolean, text) from public, anon;
grant execute on function public.decide_time_off(uuid, boolean, text) to authenticated;
```

Four things this function gets right that an `UPDATE` policy could not:

- `select ... for update` takes a row lock, so two managers clicking Approve and
  Reject simultaneously serialize instead of racing.
- The authorization check is the same `app.manages_employee` helper the policies
  use, so there is one definition of "my team" in the system.
- `decided_by` is set from `auth.uid()` server-side and is never accepted as
  input, so it cannot be forged.
- The audit row is written in the same transaction as the decision. It is
  impossible to have an approval without its audit trail.

`cancel_time_off(p_request_id)` mirrors this for employees: it requires
`employee_id in (select app.my_employee_ids())` and `status = 'pending'`, so a
person can withdraw a request but cannot un-approve one that a manager already
signed off. Because the row is deleted from the exclusion constraint's scope when
it moves to `cancelled`, the dates immediately become bookable again.

### `documents` and `audit_log`

```sql
create policy "documents_select_own" on documents for select to authenticated
  using (
    employee_id in (select app.my_employee_ids())
    or (employee_id is null
        and app.has_role(company_id, array['employee','manager','bookkeeper']::app_role[]))
  );

create policy "documents_select_team" on documents for select to authenticated
  using (employee_id is not null and app.manages_employee(employee_id));

create policy "documents_write_bookkeeper" on documents for all to authenticated
  using (app.has_role(company_id, array['bookkeeper']::app_role[]))
  with check (app.has_role(company_id, array['bookkeeper']::app_role[]));

create policy "audit_select_bookkeeper" on audit_log for select to authenticated
  using (app.has_role(company_id, array['bookkeeper']::app_role[]));

revoke insert, update, delete on audit_log from authenticated;
```

## 4. Storage policies

One private bucket per file class. Nothing is public; there is no
`getPublicUrl()` call anywhere in the codebase.

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('payslips',  'payslips',  false, 10485760, array['application/pdf']),
  ('documents', 'documents', false, 10485760,
     array['application/pdf','image/png','image/jpeg'])
on conflict (id) do nothing;
```

Object keys encode the tenancy so a policy can authorize by path:

```
payslips/{company_id}/{employee_id}/{year}-{month}/{uuid}.pdf
documents/{company_id}/{employee_id|_company}/{kind}/{uuid}.pdf
```

```sql
-- Read: the employee themself, their manager if the company allows it,
-- or a bookkeeper of that company.
create policy "payslips_read" on storage.objects for select to authenticated
using (
  bucket_id = 'payslips'
  and (
    (storage.foldername(name))[2]::uuid in (select app.my_employee_ids())
    or app.has_role((storage.foldername(name))[1]::uuid,
                    array['bookkeeper']::app_role[])
    or (
      app.manages_employee((storage.foldername(name))[2]::uuid)
      and exists (
        select 1 from companies c
        where c.id = (storage.foldername(name))[1]::uuid
          and c.managers_can_view_payslip_files
      )
    )
  )
);

-- Write: bookkeepers only, and only inside a company they belong to.
create policy "payslips_write" on storage.objects for insert to authenticated
with check (
  bucket_id = 'payslips'
  and app.has_role((storage.foldername(name))[1]::uuid,
                   array['bookkeeper']::app_role[])
);

create policy "payslips_delete" on storage.objects for delete to authenticated
using (
  bucket_id = 'payslips'
  and app.has_role((storage.foldername(name))[1]::uuid,
                   array['bookkeeper']::app_role[])
);
```

Downloads never expose the key directly. The Server Action re-checks database
visibility, then mints a 60-second signed URL:

```ts
const { data } = await supabase.storage
  .from("payslips")
  .createSignedUrl(payslip.file_path, 60, {
    download: `payslip-${period}.pdf`,
  });
```

The short TTL means a URL pasted into a group chat is dead before it is read, and
`file_size_limit` plus `allowed_mime_types` at the bucket level stop a 2 GB
upload or a disguised `.exe` before any of our code runs.

## 5. How we prove the policies work

Policies are the kind of code that looks correct and is not, so they get tested
adversarially rather than by reading them. `tests/rls/` seeds two companies with
overlapping data and, for each of six personas, asserts both directions:

| Test | Expectation |
| --- | --- |
| Employee A selects `payslips` | exactly their own published rows, count matches fixture |
| Employee A selects Employee B's payslip by id | 0 rows (not an error — RLS filters silently) |
| Employee A inserts a request with `employee_id = B` | `42501` |
| Employee A inserts a request with `status = 'approved'` | `42501` |
| Employee A calls `decide_time_off` on own request | `NOT_YOUR_TEAM` |
| Manager M selects a non-report's payslip | 0 rows |
| Manager M calls `decide_time_off` for a direct report | succeeds, audit row written |
| Manager M calls `decide_time_off` twice | second call `ALREADY_DECIDED` |
| Manager M updates `employees` | `42501` |
| Bookkeeper of company 1 selects company 2 payslips | 0 rows |
| Bookkeeper calls `decide_time_off` | `NOT_YOUR_TEAM` |
| Unpublished payslip read by its own employee | 0 rows |
| Overlapping leave requests inserted concurrently | one succeeds, one `23P01` |
| `anon` selects any table | 0 rows |

The "0 rows" cases are the important ones and the easiest to get wrong, because a
missing policy shows up as an empty list rather than an exception. A test that
only asserts "employee sees their own data" passes just as happily against a
deny-all schema as against a correct one, which is why every positive assertion
is paired with a count against a known fixture.
